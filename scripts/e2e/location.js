// A user in Jeddah sees Jeddah, not Riyadh: city on the profile, nearby
// venues, and no sessions from Riyadh.
const {chromium}=require('playwright');
const URL=process.env.E2E_URL||'http://localhost:8097/';const R=Date.now().toString(36);
(async()=>{const b=await chromium.launch();const errs=[];
const mk=async(n,lat,lng)=>{const c=await b.newContext({viewport:{width:390,height:844},geolocation:{latitude:lat,longitude:lng},permissions:['geolocation']});const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('pageerror',e=>errs.push(n+': '+e.message));return p;};
const step=async(n,f)=>{try{await f();console.log('OK',n)}catch(e){console.log('FAIL',n,e.message.split('\n')[0]);throw e}};
const signup=async(p,name,city)=>{await p.goto(URL);await p.getByText('أنشئ حساب',{exact:true}).click();
 await p.getByPlaceholder('اسمك').fill(name);await p.getByPlaceholder('name@example.com').fill(`qa-loc-${R}-${Math.random().toString(36).slice(2,6)}@mailinator.com`);await p.getByPlaceholder('٦ أحرف أو أكثر').fill('Shilla2026!');
 await p.getByText('شاب',{exact:true}).click();await p.getByText(city,{exact:true}).click();await p.getByText('التالي: اختر هواياتك').click();
 await p.getByText('جري',{exact:true}).click();await p.getByText(/يلا نبدأ/).click();await p.getByText('قريب منك هالأسبوع').waitFor({timeout:20000});};
const RUH=await mk('RUH',24.81,46.62), JED=await mk('JED',21.55,39.17);
await step('Riyadh user signs up and creates a session',async()=>{await signup(RUH,'رياضيتست','الرياض');await RUH.getByText('جلسة جديدة').click();await RUH.getByText('انشر الجلسة').waitFor();await RUH.getByText('بكرة',{exact:true}).click();await RUH.getByText('انشر الجلسة').click();await RUH.getByText('جلستك').first().waitFor({timeout:20000});});
await step('Jeddah user signs up (picks Riyadh by mistake, GPS says Jeddah)',()=>signup(JED,'جداويتست','الرياض'));
await step('profile shows Jeddah',async()=>{await JED.goto(URL+'profile');await JED.getByText(/جدة/).first().waitFor({timeout:15000});});
await step('places are in Jeddah',async()=>{await JED.goto(URL+'places');await JED.getByText(/كم/).first().waitFor({timeout:20000});const far=await JED.getByText(/\d{3}[٫.]?\d* كم|[٠-٩]{3}[٫]?[٠-٩]* كم/).count();if(far)throw new Error('venues hundreds of km away: '+far);});
await step('no Riyadh sessions in Jeddah',async()=>{await JED.goto(URL+'sessions');await JED.waitForTimeout(3000);if(await JED.getByText(/رياضيتست/).count())throw new Error('Riyadh session shown in Jeddah');});
await step('settings: pick a city by hand',async()=>{await JED.goto(URL+'settings');await JED.getByText('مكة',{exact:true}).click();await JED.waitForTimeout(2500);await JED.goto(URL+'profile');await JED.getByText(/مكة/).first().waitFor({timeout:15000});});
console.log('errors',errs.slice(0,5));await b.close();process.exit(0);})().catch(()=>process.exit(1));
