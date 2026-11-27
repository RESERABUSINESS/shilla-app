// Bookings, part 1: organise a booking made outside the app (status, price
// split, who paid), and a business claims a venue. Part 2 runs after an admin
// approves the claim (see README).
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const os=require('os');
const URL=process.env.E2E_URL||'http://localhost:8097/';const R=Date.now().toString(36);
const STATE=path.join(os.tmpdir(),'shilla-booking.json');
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(n)=>{const c=await b.newContext({viewport:{width:390,height:844},geolocation:{latitude:24.81,longitude:46.62},permissions:['geolocation']});const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('pageerror',e=>errs.push(n+': '+e.message));return p;};
const step=async(n,f)=>{try{await f();console.log('OK',n)}catch(e){console.log('FAIL',n,e.message.split('\n')[0]);throw e}};
const signup=async(p,name,email)=>{await p.goto(URL);await p.getByText('أنشئ حساب',{exact:true}).click();
 await p.getByPlaceholder('اسمك').fill(name);await p.getByPlaceholder('name@example.com').fill(email);await p.getByPlaceholder('٦ أحرف أو أكثر').fill('Shilla2026!');
 await p.getByText('شاب',{exact:true}).click();await p.getByText('الرياض',{exact:true}).click();
 await p.getByLabel('أوافق على الشروط وقواعد المجتمع').click();await p.getByText('التالي: اختر هواياتك').click();
 await p.getByText('جري',{exact:true}).click();await p.getByText(/يلا نبدأ/).click();await p.getByText('قريب منك هالأسبوع').waitFor({timeout:20000});};
const A=await mk('A'),B=await mk('B'),O=await mk('O');
const emails={A:`qa-bk-a-${R}@mailinator.com`,B:`qa-bk-b-${R}@mailinator.com`,O:`qa-bk-o-${R}@mailinator.com`};
await step('A creates a session, B joins',async()=>{await signup(A,'منظمتست',emails.A);await A.getByText('جلسة جديدة').click();await A.getByText('انشر الجلسة').waitFor();await A.getByText('بكرة',{exact:true}).click();await A.getByText('انشر الجلسة').click();await A.getByText('جلستك').first().waitFor({timeout:20000});
  await signup(B,'عضوتست',emails.B);await B.getByText(/ينظمها: منظمتست/).first().waitFor({timeout:20000});await B.getByText('انضم',{exact:true}).first().click();await B.getByText('منضم ✓').first().waitFor({timeout:20000});});
await step('A records the booking and price',async()=>{await A.goto(URL+'sessions');await A.getByText('المحادثة').first().click();await A.waitForURL(/session\/chat\//);const sid=A.url().split('/').pop();globalThis.SID=sid;
  await A.goto(URL+'session/'+sid);await A.getByText('لم يُحجز بعد').first().waitFor({timeout:15000});await A.getByText('حدّث تفاصيل الحجز').click();
  await A.getByText('تم الحجز ✓',{exact:true}).click();await A.getByLabel('التكلفة الكلية بالريال (اختياري)').fill('200');await A.getByText(/على كل واحد: ١٠٠/).waitFor();await A.getByLabel('ملاحظة (اختياري)').fill('ملعب ٣، الحجز باسمي');await A.getByText('احفظ',{exact:true}).click();
  await A.waitForTimeout(2000);await A.goto(URL+'session/'+sid);await A.getByText(/على كل واحد ١٠٠/).waitFor({timeout:15000});});
await step('B is notified and pays',async()=>{await B.goto(URL+'notifications');await B.getByText(/تم حجز المكان لجلستك/).waitFor({timeout:20000});await B.goto(URL+'session/'+globalThis.SID);await B.getByText('ملعب ٣، الحجز باسمي').waitFor({timeout:15000});await B.getByText('دفعت نصيبي',{exact:true}).click();await B.getByText('دفعت نصيبي ✓').waitFor({timeout:15000});});
await step('A sees who paid',async()=>{await A.goto(URL+'session/'+globalThis.SID);await A.getByText('دفع ✓').waitFor({timeout:15000});await A.getByText(/دفعوا: ١ من ٢/).waitFor();});
await step('O claims the venue',async()=>{await signup(O,'مالكتست',emails.O);  await O.goto(URL+'places');await O.getByText('أنت صاحب المكان؟').first().waitFor({timeout:20000});await O.getByText('أنت صاحب المكان؟').first().click();await O.waitForURL(/claim\//);
  const vid=O.url().split('/').pop();await O.getByLabel('رقم التواصل').fill('0500000000');await O.getByText('أرسل الطلب').click();await O.waitForTimeout(2000);
  fs.writeFileSync(STATE,JSON.stringify({R,emails,venueId:vid,sessionId:globalThis.SID}));console.log('venue',vid);});
console.log('errors',errs.slice(0,5));await b.close();process.exit(0);})().catch(()=>process.exit(1));
