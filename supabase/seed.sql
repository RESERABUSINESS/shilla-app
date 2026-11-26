-- Hobby catalog. Keep in sync with src/lib/hobbies.ts until the app loads it from here.

insert into public.hobby_categories (id, name_ar, sort) values
  ('sport', 'رياضة', 0),
  ('craft', 'فنون وحِرف', 1),
  ('culture', 'ثقافة', 2),
  ('food', 'طبخ وقهوة', 3),
  ('adventure', 'مغامرات', 4),
  ('games', 'ألعاب', 5)
on conflict (id) do update set name_ar = excluded.name_ar, sort = excluded.sort;

insert into public.hobbies (id, category_id, name_ar, emoji, group_size, teams, group_label_ar, level_labels_ar, sort) values
  ('padel', 'sport', 'بادل', '🏓', 4, false, '٤ لاعبين (زوجي)', null, 0),
  ('tennis', 'sport', 'تنس', '🎾', 2, false, 'لاعبَين (أو ٤ زوجي)', null, 1),
  ('football', 'sport', 'كرة قدم', '⚽', 10, true, 'فريقين، ٥ ضد ٥', null, 2),
  ('basketball', 'sport', 'كرة سلة', '🏀', 6, true, 'فريقين، ٣ ضد ٣', null, 3),
  ('running', 'sport', 'جري', '🏃', 0, false, 'مجموعة مفتوحة', array['أبطأ من ٧ د/كم', '٥–٧ د/كم', 'أسرع من ٥ د/كم'], 4),
  ('swimming', 'sport', 'سباحة', '🏊', 0, false, 'مجموعة مفتوحة', null, 5),
  ('yoga', 'sport', 'يوغا', '🧘', 0, false, 'مجموعة مفتوحة', null, 6),
  ('pottery', 'craft', 'فخار', '🏺', 8, false, '٤ إلى ٨ مشاركين', array['أول مرة', 'جربت قبل', 'أشتغل على العجلة'], 7),
  ('painting', 'craft', 'رسم', '🎨', 10, false, '٤ إلى ١٠ مشاركين', null, 8),
  ('calligraphy', 'craft', 'خط عربي', '✒️', 8, false, 'حتى ٨ مشاركين', null, 9),
  ('crochet', 'craft', 'كروشيه', '🧶', 8, false, 'حتى ٨ مشاركين', null, 10),
  ('reading', 'culture', 'نادي قراءة', '📚', 12, false, '٦ إلى ١٢ عضو', array['قارئ جديد', 'كتاب بالشهر', 'قارئ نهم'], 11),
  ('photography', 'culture', 'تصوير', '📷', 0, false, 'جولة مفتوحة', array['جوال', 'كاميرا مبتدئ', 'محترف'], 12),
  ('coffee', 'food', 'قهوة مختصة', '☕', 10, false, 'حتى ١٠ مشاركين', array['أحبها وبس', 'أحضّر في البيت', 'باريستا'], 13),
  ('cooking', 'food', 'طبخ', '🍳', 8, false, 'حتى ٨ مشاركين', null, 14),
  ('hiking', 'adventure', 'هايكنج', '🥾', 0, false, 'مجموعة مفتوحة', array['مسارات سهلة', 'متوسطة', 'صعبة'], 15),
  ('camping', 'adventure', 'تخييم', '⛺', 0, false, 'مجموعة مفتوحة', null, 16),
  ('chess', 'games', 'شطرنج', '♟️', 2, false, 'لاعبَين', array['تقييم تحت ١٢٠٠', '١٢٠٠–١٦٠٠', 'فوق ١٦٠٠'], 17),
  ('board_games', 'games', 'ألعاب لوحية', '🎲', 6, false, '٤ إلى ٦ لاعبين', null, 18),
  ('gaming', 'games', 'ألعاب إلكترونية', '🎮', 4, false, 'فريق من ٤', null, 19)
on conflict (id) do update set
  category_id = excluded.category_id, name_ar = excluded.name_ar, emoji = excluded.emoji,
  group_size = excluded.group_size, teams = excluded.teams, group_label_ar = excluded.group_label_ar,
  level_labels_ar = excluded.level_labels_ar, sort = excluded.sort;
