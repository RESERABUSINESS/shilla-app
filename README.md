# شلة

تطبيق يجمع أصحاب الهوايات: تختار هواياتك، ويطلع لك الأماكن القريبة والناس اللي يشاركونك نفس الاهتمام، وتنضم لجلسة أو تحجز ورشة. وعالم البنات منفصل تمامًا عن عالم الشباب.

- وثيقة المتطلبات: [docs/PRD.md](docs/PRD.md)
- خطة البناء: [docs/ROADMAP.md](docs/ROADMAP.md)
- النموذج التفاعلي: [docs/prototype.html](docs/prototype.html) (افتحه في المتصفح)

## تشغيل التطبيق على جوالك بدون كمبيوتر
آخر نسخة منشورة على Expo (فرع `preview`). افتح هذا الرابط في Safari أو Chrome على الجوال، وبيفتح في Expo Go:

`exp://u.expo.dev/c851e70a-3a83-4274-85dd-f4abc5e4de71?runtime-version=exposdk:58.0.0&channel-name=preview`

للنشر بعد أي تعديل: `npm run publish:preview` (يحتاج `EXPO_TOKEN`).

## تشغيل التطبيق من الكمبيوتر
1. حمّل تطبيق **Expo Go** من App Store أو Google Play.
2. على الكمبيوتر (يحتاج Node.js):
   ```bash
   npm install
   npx expo start
   ```
3. امسح رمز QR اللي يطلع، بكاميرا الآيفون أو من داخل Expo Go في أندرويد.

التطبيق حاليًا يشتغل على **بيانات تجريبية**. لربطه بقاعدة بيانات حقيقية، انسخ `.env.example` إلى `.env.local` وحط فيه بيانات مشروع Supabase.

## قاعدة البيانات
- `supabase/migrations/`: الجداول وقواعد الفصل والخصوصية.
- `supabase/seed.sql`: قائمة الهوايات.
- `npm run test:db`: يشغل قاعدة البيانات على Postgres محلي ويتأكد إن قواعد الفصل شغالة.

## للمطورين
اقرأ [CLAUDE.md](CLAUDE.md) أولًا. فيه القواعد الأساسية للمشروع.
