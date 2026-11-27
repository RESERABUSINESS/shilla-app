-- Imports real Riyadh venues from OpenStreetMap (data © OpenStreetMap
-- contributors, ODbL; the app shows this attribution on the places screen).
--
-- Step 1 (run once, then wait ~1 minute): the database fetches the data.
--   select net.http_get(
--     url := 'https://overpass-api.de/api/interpreter?data=' || <url-encoded query below>,
--     headers := '{"User-Agent": "shilla-app-venue-import"}'::jsonb,
--     timeout_milliseconds := 150000);
--   Query (bbox = Riyadh):
--   [out:json][timeout:120];(
--     nwr["leisure"="pitch"]["sport"~"padel|tennis|soccer|basketball|volleyball"]["name"](24.55,46.45,24.98,46.90);
--     nwr["leisure"~"sports_centre|fitness_centre|sports_hall"]["name"](24.55,46.45,24.98,46.90);
--     nwr["leisure"="swimming_pool"]["name"]["access"!="private"](24.55,46.45,24.98,46.90);
--     nwr["amenity"="library"]["name"](24.55,46.45,24.98,46.90);
--     nwr["leisure"="park"]["name"](24.55,46.45,24.98,46.90);
--     nwr["leisure"="amusement_arcade"]["name"](24.55,46.45,24.98,46.90);
--     nwr["amenity"="cafe"]["cuisine"~"coffee"]["name"](24.55,46.45,24.98,46.90);
--     nwr["tourism"="viewpoint"]["name"](24.3,45.9,25.2,46.9);
--   );out center tags;
--
-- Step 2: run this file with :response_id set to the request id from step 1.
-- OSM does not record whether a place serves men, women or both, so imported
-- venues are marked unverified and ask users to confirm times with the venue.

begin;

create temporary table osm_raw on commit drop as
select
  left(el->>'type', 1) || (el->>'id') as osm_id,
  coalesce(nullif(el->'tags'->>'name:ar', ''), el->'tags'->>'name') as name,
  el->'tags' as t,
  coalesce((el->>'lat')::float8, (el->'center'->>'lat')::float8) as lat,
  coalesce((el->>'lon')::float8, (el->'center'->>'lon')::float8) as lon
from net._http_response r, jsonb_array_elements((r.content::jsonb)->'elements') el
where r.id = 1;

create temporary table osm_mapped on commit drop as
select osm_id, name, lat, lon,
  case
    when t->>'leisure' = 'pitch' and t->>'sport' = 'padel' then array['padel']
    when t->>'leisure' = 'pitch' and t->>'sport' = 'tennis' and name !~ 'الطاولة' then array['tennis']
    when t->>'leisure' = 'pitch' and t->>'sport' = 'soccer' and name !~ 'مدرسة|متوسطة|اطفال|أرضية|^Soccer$' then array['football']
    when t->>'leisure' in ('fitness_centre', 'sports_centre') and t->>'sport' ~ 'yoga' then array['yoga']
    when t->>'leisure' in ('fitness_centre', 'sports_centre', 'swimming_pool') and t->>'sport' ~ 'swimming'
         and name !~* '^swimming pool$|psu' then array['swimming']
    when t->>'amenity' = 'library' and name ~* 'مكتبة|library'
         and name !~* 'مكتب حمد|yamamah|psu|الجامعة|^library$|^المكتبة$|^المكتبة المركزية$' then array['reading']
    when t->>'leisure' = 'park' and name ~* 'حديقة|حديقه|منتزه|منتزة|park|garden|المسار'
         and name !~ '^(حديقة|حديقه)$' then array['running', 'photography']
    when t->>'amenity' = 'cafe' and name ~* 'محمصة|roaster|مختصة|specialty|coffee club|arabica' then array['coffee']
    when t->>'tourism' = 'viewpoint' then array['hiking', 'photography', 'camping']
    when t->>'leisure' = 'amusement_arcade' then array['gaming']
  end as hobbies,
  case
    when t->>'leisure' = 'pitch' and t->>'sport' = 'padel' then 'ملعب بادل'
    when t->>'leisure' = 'pitch' and t->>'sport' = 'tennis' then 'ملعب تنس'
    when t->>'leisure' = 'pitch' then 'ملعب كرة قدم'
    when t->>'sport' ~ 'yoga' then 'استوديو يوغا'
    when t->>'sport' ~ 'swimming' then 'مسبح'
    when t->>'amenity' = 'library' then 'مكتبة عامة'
    when t->>'leisure' = 'park' then 'حديقة'
    when t->>'amenity' = 'cafe' then 'قهوة مختصة'
    when t->>'tourism' = 'viewpoint' then 'مطل ومسار'
    when t->>'leisure' = 'amusement_arcade' then 'ألعاب وترفيه'
  end as kind,
  case
    when name ~* 'نسائي|النسائي|ladies|سيدات' then 'f'
    when name ~* 'رجال|الرجالي' then 'm'
    when t->>'leisure' = 'pitch' and t->>'sport' = 'soccer' then 'm'
    else 'both'
  end::public.venue_audience as audience,
  (t->>'leisure' = 'park' or t->>'amenity' = 'library' or t->>'tourism' = 'viewpoint') as is_public
from osm_raw
where name is not null and lat is not null;

delete from osm_mapped where hobbies is null;

-- Drop near-duplicates (same name within ~100 m).
delete from osm_mapped a using osm_mapped b
where a.name = b.name and a.osm_id > b.osm_id
  and abs(a.lat - b.lat) < 0.001 and abs(a.lon - b.lon) < 0.001;

insert into public.venues (name, kind, location, audience, men_hours, women_hours, price_label, source, osm_id, verified)
select name, kind, extensions.st_makepoint(lon, lat)::extensions.geography, audience,
  case when audience = 'both' then (case when is_public then 'مفتوح للجميع' else 'تأكد من أوقات الرجال مع المكان' end) end,
  case when audience = 'both' then (case when is_public then 'مفتوح للعائلات والجميع' else 'تأكد من أوقات النساء مع المكان' end) end,
  case when is_public then 'مجاني' else '' end,
  'osm', osm_id, false
from osm_mapped
on conflict (osm_id) do update set name = excluded.name, kind = excluded.kind, location = excluded.location;

insert into public.venue_hobbies (venue_id, hobby_id)
select v.id, unnest(m.hobbies) from osm_mapped m join public.venues v on v.osm_id = m.osm_id
on conflict do nothing;

-- Retire the fictional test venues that no session uses.
delete from public.venues v
where v.source = 'manual' and v.id::text like 'a0000000-%'
  and not exists (select 1 from public.sessions s where s.venue_id = v.id);

commit;
