-- Users can add venues they know. Suggestions show up right away, marked
-- unverified, and only the suggester can attach hobbies to them.

alter table public.venues
  add column created_by uuid references public.profiles (id) on delete set null,
  drop constraint venues_source_check,
  add constraint venues_source_check check (source in ('manual', 'osm', 'owner', 'user'));

create policy "venues suggest" on public.venues for insert to authenticated
  with check (created_by = auth.uid() and source = 'user' and not verified and owner_id is null);

create policy "venue hobbies for own suggestion" on public.venue_hobbies for insert to authenticated
  with check (exists (
    select 1 from public.venues v where v.id = venue_id and v.created_by = auth.uid() and v.source = 'user'
  ));

-- Suggest a venue at a point. Returns the new venue id.
create function public.suggest_venue(p_name text, p_kind text, lat double precision, lng double precision,
  p_audience public.venue_audience, p_hobbies text[])
returns uuid
language plpgsql security invoker
set search_path = public, extensions
as $$
declare
  vid uuid;
begin
  if char_length(trim(p_name)) < 2 or cardinality(p_hobbies) = 0 then
    raise exception 'invalid suggestion';
  end if;
  insert into public.venues (name, kind, location, audience, men_hours, women_hours, price_label, source, verified, created_by)
  values (trim(p_name), coalesce(nullif(trim(p_kind), ''), 'مكان مقترح'), st_makepoint(lng, lat)::geography, p_audience,
    case when p_audience = 'both' then 'تأكد من أوقات الرجال مع المكان' end,
    case when p_audience = 'both' then 'تأكد من أوقات النساء مع المكان' end,
    '', 'user', false, auth.uid())
  returning id into vid;
  insert into public.venue_hobbies (venue_id, hobby_id) select vid, unnest(p_hobbies);
  return vid;
end;
$$;

revoke execute on function public.suggest_venue(text, text, double precision, double precision, public.venue_audience, text[]) from public, anon;
grant execute on function public.suggest_venue(text, text, double precision, double precision, public.venue_audience, text[]) to authenticated;
