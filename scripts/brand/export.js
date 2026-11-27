// Renders the Sohba app icons into assets/images: node scripts/brand/export.js
const {chromium}=require('playwright');const {FINAL}=require('./icon.js');const fs=require('fs');
const out=process.argv[2]||require('path').join(__dirname,'../../assets/images');fs.mkdirSync(out,{recursive:true});
const jobs=[['icon.png',FINAL({mode:'full',scale:1.04}),1024,false],['android-icon-foreground.png',FINAL({mode:'fg',scale:.66}),1024,true],
 ['android-icon-background.png',FINAL({mode:'bg'}),1024,false],['android-icon-monochrome.png',FINAL({mode:'mono',scale:.66}),1024,true],
 ['splash-icon.png',FINAL({mode:'fg',scale:1.1}),1024,true],['favicon.png',FINAL({mode:'full',scale:1.04}),48,false]];
(async()=>{const b=await chromium.launch();for(const [name,svg,px,transparent] of jobs){const p=await b.newPage({viewport:{width:px,height:px}});
 await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ',`<svg width="${px}" height="${px}" `)}</body></html>`);
 await p.screenshot({path:out+'/'+name,omitBackground:transparent});await p.close();}await b.close();})();
