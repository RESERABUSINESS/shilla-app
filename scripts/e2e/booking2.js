// Bookings, part 2 (after the claim from part 1 is approved): the owner adds a
// slot, the host books it in the app, the owner confirms, and the session
// takes the slot's time, price and booking code.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const os=require('os');
const URL=process.env.E2E_URL||'http://localhost:8097/';
const S=JSON.parse(fs.readFileSync(path.join(os.tmpdir(),'shilla-booking.json'),'utf8'));
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(n)=>{const c=await b.newContext({viewport:{width:390,height:844},geolocation:{latitude:24.81,longitude:46.62},permissions:['geolocation']});const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('pageerror',e=>errs.push(n+': '+e.message));return p;};
const step=async(n,f)=>{try{await f();console.log('OK',n)}catch(e){console.log('FAIL',n,e.message.split('\n')[0]);throw e}};
const login=async(p,email)=>{await p.goto(URL);await p.getByText('عندي حساب، سجّل دخول').click();await p.getByPlaceholder('name@example.com').fill(email);await p.getByLabel('كلمة المرور').fill('Shilla2026!');await p.getByText('دخول',{exact:true}).click();await p.getByText('قريب منك هالأسبوع').waitFor({timeout:20000});};
const A=await mk('A'),B=await mk('B'),O=await mk('O');
await step('owner sees the dashboard',async()=>{await login(O,S.emails.O);await O.goto(URL+'profile');await O.getByText('لوحة مكاني').click();await O.getByText('منتزه تلال الرياض').or(O.getByText(/حديقة ·/)).first().waitFor({timeout:15000});await O.goto(URL+'owner/'+S.venueId);});
await step('owner adds a slot',async()=>{await O.getByText('أضف وقت متاح').waitFor({timeout:15000});await O.getByText('للرجال',{exact:true}).first().click().catch(()=>{});await O.getByText('بكرة الجاي').click().catch(async()=>{await O.getByText('بكرة',{exact:true}).click();});await O.getByLabel('السعر بالريال').fill('240');await O.getByText('أضف الوقت').click();await O.getByText('متاح',{exact:true}).first().waitFor({timeout:15000});});
await step('host sees "book in app" and requests the slot',async()=>{await login(A,S.emails.A);await A.goto(URL+'session/'+S.sessionId);
  // the host recorded an outside booking in part 1; clear it first
  await A.getByText('حدّث تفاصيل الحجز').click();await A.getByText('لم يُحجز بعد',{exact:true}).click();await A.getByLabel('التكلفة الكلية بالريال (اختياري)').fill('');await A.getByLabel('ملاحظة (اختياري)').fill('');await A.getByText('احفظ',{exact:true}).click();await A.waitForTimeout(2000);
  await A.goto(URL+'session/'+S.sessionId);await A.getByText('احجز من التطبيق').click();await A.waitForURL(/book\//);await A.getByText(/٢٤٠ ر.س/).first().waitFor({timeout:15000});await A.getByText('اطلب هالوقت').first().click();await A.waitForTimeout(2500);
  await A.goto(URL+'session/'+S.sessionId);await A.getByText('بانتظار تأكيد المكان').waitFor({timeout:15000});});
await step('owner sees the request (no names) and confirms',async()=>{await O.goto(URL+'notifications');await O.getByText(/طلب حجز جديد لمكانك/).waitFor({timeout:20000});await O.goto(URL+'owner/'+S.venueId);await O.getByText(/طلبات الحجز \(١\)/).waitFor({timeout:15000});
  if(await O.getByText('منظمتست').count()||await O.getByText('عضوتست').count())throw new Error('owner sees names');await O.getByText('أكد الحجز').click();await O.getByText(/رمز /).first().waitFor({timeout:15000});});
await step('host: booked, with code and price',async()=>{await A.goto(URL+'notifications');await A.getByText(/المكان أكد حجزك/).waitFor({timeout:20000});await A.goto(URL+'session/'+S.sessionId);await A.getByText('تم الحجز ✓').waitFor({timeout:15000});await A.getByText(/رمز الحجز: /).waitFor();await A.getByText(/على كل واحد ١٢٠/).waitFor();});
await step('member notified',async()=>{await login(B,S.emails.B);await B.goto(URL+'notifications');await B.getByText(/تم حجز المكان لجلستك/).first().waitFor({timeout:20000});});
console.log('errors',errs.slice(0,5));await b.close();process.exit(0);})().catch(()=>process.exit(1));
