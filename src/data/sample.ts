// Sample data used until the app is connected to Supabase.
// All venues and people are fictional.

import type { Person, Session, Venue } from '@/lib/types';

export const SAMPLE_VENUES: Venue[] = [
  { id: 'v1', name: 'نادي النخبة للتنس', kind: 'أكاديمية', district: 'الملقا', hobbies: ['tennis', 'padel'], audience: 'both', menHours: '٨ م – ١٢ ص للرجال', womenHours: '٤–٧ م فترة نسائية', priceLabel: '١٢٠ ر.س/ساعة', rating: 4.7, distanceKm: 1.2 },
  { id: 'v2', name: 'بادل بوكس الياسمين', kind: 'ملاعب بادل', district: 'الياسمين', hobbies: ['padel'], audience: 'both', menHours: 'يوميًا للرجال', womenHours: 'السبت والثلاثاء للنساء', priceLabel: '٢٠٠ ر.س/ساعة', rating: 4.6, distanceKm: 2.1 },
  { id: 'v3', name: 'ملاعب الصحافة الخماسية', kind: 'ملعب عشب', district: 'الصحافة', hobbies: ['football'], audience: 'm', priceLabel: '٢٥٠ ر.س/ساعة', rating: 4.3, distanceKm: 1.8 },
  { id: 'v4', name: 'نادي رشاقة النسائي', kind: 'نادي نسائي', district: 'النرجس', hobbies: ['yoga', 'swimming', 'basketball', 'padel'], audience: 'f', priceLabel: 'اشتراك أو حصة', rating: 4.8, distanceKm: 2.6 },
  { id: 'v5', name: 'ممشى حي النرجس', kind: 'ممشى عام', district: 'النرجس', hobbies: ['running', 'photography'], audience: 'both', menHours: 'مفتوح للجميع', womenHours: 'مسار مضاء ومفتوح للجميع', priceLabel: 'مجاني', rating: 4.5, distanceKm: 0.9 },
  { id: 'v6', name: 'مسار جبال طويق', kind: 'نقطة تجمع', district: 'غرب الرياض', hobbies: ['hiking', 'camping', 'photography'], audience: 'both', menHours: 'رحلات للشباب', womenHours: 'رحلات نسائية مع مرشدة', priceLabel: 'مجاني', rating: 4.8, distanceKm: 38 },
  { id: 'v7', name: 'صالة مركز الشباب', kind: 'صالة رياضية', district: 'العقيق', hobbies: ['basketball'], audience: 'm', priceLabel: '٩٠ ر.س/ساعة', rating: 4.1, distanceKm: 3.3 },
  { id: 'v8', name: 'كافيه بيدق', kind: 'كافيه ألعاب', district: 'حطين', hobbies: ['chess', 'board_games'], audience: 'both', menHours: 'القسم العام', womenHours: 'ركن عائلي ونسائي', priceLabel: 'طلب مشروب', rating: 4.6, distanceKm: 2.9 },
  { id: 'v9', name: 'أكاديمية سيرف للسيدات', kind: 'أكاديمية تنس', district: 'الربيع', hobbies: ['tennis'], audience: 'f', priceLabel: '١٥٠ ر.س/حصة', rating: 4.9, distanceKm: 4.1 },
  { id: 'v10', name: 'استوديو طين', kind: 'استوديو فخار', district: 'الملقا', hobbies: ['pottery'], audience: 'f', priceLabel: 'ورش من ٢٢٠ ر.س', rating: 4.9, distanceKm: 1.6 },
  { id: 'v11', name: 'ساحة الأبطال', kind: 'ألعاب إلكترونية', district: 'الملقا', hobbies: ['gaming'], audience: 'both', menHours: 'القسم العام', womenHours: 'غرف خاصة للبنات', priceLabel: '٣٥ ر.س/ساعة', rating: 4.4, distanceKm: 3.7 },
  { id: 'v12', name: 'محمصة حَبّة', kind: 'محمصة قهوة', district: 'العارض', hobbies: ['coffee'], audience: 'both', menHours: 'ورش مسائية للشباب', womenHours: 'ورش صباحية للسيدات', priceLabel: 'ورش من ١٢٠ ر.س', rating: 4.7, distanceKm: 3.1 },
  { id: 'v13', name: 'مسبح أكوا للرجال', kind: 'مسبح', district: 'الوادي', hobbies: ['swimming'], audience: 'm', priceLabel: '٦٠ ر.س/دخول', rating: 4.3, distanceKm: 4.4 },
  { id: 'v14', name: 'ملاعب الفرسان النسائية', kind: 'ملاعب متعددة', district: 'القيروان', hobbies: ['football', 'basketball'], audience: 'f', priceLabel: '١٨٠ ر.س/ساعة', rating: 4.6, distanceKm: 3.9 },
  { id: 'v15', name: 'استوديو توازن', kind: 'يوغا ولياقة', district: 'الملقا', hobbies: ['yoga'], audience: 'm', priceLabel: '٨٠ ر.س/حصة', rating: 4.5, distanceKm: 2.4 },
  { id: 'v16', name: 'مرسم ألوان', kind: 'مرسم ومشغل', district: 'النخيل', hobbies: ['painting', 'calligraphy', 'crochet', 'pottery'], audience: 'both', menHours: 'الأحد والثلاثاء للرجال', womenHours: 'باقي الأيام للنساء', priceLabel: 'ورش من ١٥٠ ر.س', rating: 4.6, distanceKm: 2.8 },
  { id: 'v17', name: 'مكتبة الصفحات', kind: 'مكتبة وكافيه', district: 'الياسمين', hobbies: ['reading', 'board_games'], audience: 'both', menHours: 'القاعة العامة', womenHours: 'قاعة نسائية', priceLabel: 'مجاني للأندية', rating: 4.7, distanceKm: 2.2 },
  { id: 'v18', name: 'مطبخ نكهة التعليمي', kind: 'مطبخ تعليمي', district: 'الصحافة', hobbies: ['cooking', 'coffee'], audience: 'both', menHours: 'دورات مسائية', womenHours: 'دورات صباحية للسيدات', priceLabel: 'دورات من ٢٠٠ ر.س', rating: 4.5, distanceKm: 2.5 },
];

export const SAMPLE_PEOPLE: Person[] = [
  { id: 'p1', firstName: 'فهد', gender: 'm', hobbies: { padel: 1, football: 1, tennis: 2 }, distanceKm: 1.4, availability: 'مساءً' },
  { id: 'p2', firstName: 'سعود', gender: 'm', hobbies: { padel: 1, running: 1, coffee: 2 }, distanceKm: 2.2, availability: 'الويكند' },
  { id: 'p3', firstName: 'تركي', gender: 'm', hobbies: { football: 2, basketball: 1 }, distanceKm: 3.0, availability: 'مساءً' },
  { id: 'p4', firstName: 'خالد', gender: 'm', hobbies: { running: 2, hiking: 2, camping: 1 }, distanceKm: 0.8, availability: 'الفجر' },
  { id: 'p5', firstName: 'نايف', gender: 'm', hobbies: { chess: 1, board_games: 2, gaming: 2 }, distanceKm: 2.7, availability: 'بعد العشاء' },
  { id: 'p6', firstName: 'عبدالله', gender: 'm', hobbies: { coffee: 1, running: 0, calligraphy: 1 }, distanceKm: 3.6, availability: 'الصبح' },
  { id: 'p7', firstName: 'نورة', gender: 'f', hobbies: { padel: 1, pottery: 1, yoga: 1 }, distanceKm: 1.1, availability: 'العصر' },
  { id: 'p8', firstName: 'سارة', gender: 'f', hobbies: { running: 1, hiking: 0, photography: 1 }, distanceKm: 2.0, availability: 'الفجر' },
  { id: 'p9', firstName: 'ريم', gender: 'f', hobbies: { padel: 2, basketball: 1 }, distanceKm: 3.2, availability: 'مساءً' },
  { id: 'p10', firstName: 'لمى', gender: 'f', hobbies: { reading: 2, chess: 2 }, distanceKm: 2.5, availability: 'بعد العشاء' },
  { id: 'p11', firstName: 'جود', gender: 'f', hobbies: { pottery: 0, painting: 1, crochet: 1 }, distanceKm: 1.7, availability: 'الصبح' },
  { id: 'p12', firstName: 'أريج', gender: 'f', hobbies: { pottery: 2, coffee: 1, cooking: 1 }, distanceKm: 2.3, availability: 'مساءً' },
];

let msgId = 0;
const greet = (author: string, text: string) => [{ id: `m${++msgId}`, authorId: author, author, text, sentAt: '' }];
// In sample data a person's id is their name.
const m = (...names: string[]) => names.map((name) => ({ id: name, name }));

export const SAMPLE_SESSIONS: Session[] = [
  { id: 's1', kind: 'meetup', gender: 'm', hobbyId: 'padel', venueId: 'v2', startsAtLabel: 'الخميس · ٨:٠٠ م', level: 1, hostId: 'فهد', hostName: 'فهد', capacity: 4, members: m('فهد', 'سعود'), messages: greet('فهد', 'هلا والله! الموعد ثابت، نتقابل قبله بعشر دقايق') },
  { id: 's2', kind: 'workshop', gender: 'm', hobbyId: 'coffee', venueId: 'v12', startsAtLabel: 'الجمعة · ٧:٠٠ م', level: 0, hostId: 'محمصة حَبّة', hostName: 'محمصة حَبّة', capacity: 10, members: m('سعود', 'عبدالله', 'بدر', 'زياد'), priceSar: 120, durationLabel: 'ساعتين', messages: greet('محمصة حَبّة', 'أهلًا فيكم! كل الأدوات علينا') },
  { id: 's3', kind: 'meetup', gender: 'm', hobbyId: 'football', venueId: 'v3', startsAtLabel: 'الجمعة · ٩:٣٠ م', level: 1, hostId: 'تركي', hostName: 'تركي', capacity: 10, members: m('تركي', 'فهد', 'بدر', 'سلطان', 'راكان', 'زياد', 'ماجد'), messages: greet('تركي', 'نحتاج ٣ بس ونكمل الفريقين') },
  { id: 's4', kind: 'meetup', gender: 'm', hobbyId: 'hiking', venueId: 'v6', startsAtLabel: 'السبت · ٥:٣٠ ص', level: 1, hostId: 'خالد', hostName: 'خالد', capacity: 0, members: m('خالد', 'مشعل'), messages: greet('خالد', 'التجمع عند بداية المسار، جيبوا موية كافية') },
  { id: 's5', kind: 'workshop', gender: 'f', hobbyId: 'pottery', venueId: 'v10', startsAtLabel: 'الخميس · ٥:٠٠ م', level: 0, hostId: 'استوديو طين', hostName: 'استوديو طين', capacity: 8, members: m('جود', 'أريج', 'غلا', 'وعد', 'رهف'), priceSar: 250, durationLabel: '٣ ساعات، تشمل الطين والحرق', messages: greet('استوديو طين', 'أهلًا فيكم! تعالوا بملابس مريحة') },
  { id: 's6', kind: 'meetup', gender: 'f', hobbyId: 'padel', venueId: 'v2', startsAtLabel: 'الثلاثاء · ٥:٠٠ م · فترة نسائية', level: 1, hostId: 'نورة', hostName: 'نورة', capacity: 4, members: m('نورة', 'ريم'), messages: greet('نورة', 'حجزت الملعب، باقي لنا لاعبتين') },
  { id: 's7', kind: 'meetup', gender: 'f', hobbyId: 'reading', venueId: 'v17', startsAtLabel: 'الأربعاء · ٨:٠٠ م', level: 1, hostId: 'لمى', hostName: 'لمى', capacity: 12, members: m('لمى', 'لينا', 'نوف', 'ملاك'), messages: greet('لمى', 'كتاب هالشهر: «ثلاثية غرناطة»') },
  { id: 's8', kind: 'meetup', gender: 'f', hobbyId: 'running', venueId: 'v5', startsAtLabel: 'السبت · ٦:٠٠ ص', level: 1, hostId: 'سارة', hostName: 'سارة', capacity: 0, members: m('سارة', 'هيفاء', 'دانة'), messages: greet('سارة', 'نبدأ بإحماء خفيف عند البوابة') },
];
