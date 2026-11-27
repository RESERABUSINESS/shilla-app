// Final Sohba icon: two liquid-glass paths braid into one S.
const {Spts,normals,poly}=require('./geometry.js');
const C={blue:'#2F6BFF',violet:'#8A3DFF',cyan:'#19E3FF',pink:'#FF5FD2'};
function strands(){const P=Spts(),N=normals(P),A=46;
 const mk=(sg)=>P.map((q,i)=>{const w=sg*A*Math.sin(i/(P.length-1)*Math.PI*3);return [q[0]+N[i][0]*w,q[1]+N[i][1]*w];});
 return [mk(1),mk(-1)];}
// mode: 'full' (iOS), 'fg' (transparent, android foreground / splash), 'mono' (white silhouette)
function FINAL({mode='full',scale=1}={}){
 const [s1,s2]=strands();const d1=poly(s1),d2=poly(s2);const W=60;const p='f';
 const e1=s1[0],e2=s2.at(-1);const nn=s2.length-1;const seg=poly(s2.slice(Math.round(nn*.58),Math.round(nn*.75)+1));
 const wrap=(x)=>`<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${x}</g>`;
 const tube=(d,w,col,cap='round')=>`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
 const art=`<rect width="1024" height="1024" fill="url(#${p}bg)"/>
<circle cx="150" cy="120" r="560" fill="url(#${p}o1)"/><circle cx="930" cy="950" r="600" fill="url(#${p}o2)"/>
<circle cx="930" cy="140" r="380" fill="url(#${p}o3)"/><circle cx="100" cy="960" r="360" fill="url(#${p}o4)"/>`;
 const orb=(id,c,o)=>`<radialGradient id="${p}${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset=".45" stop-color="${c}" stop-opacity="${o*.45}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
 if(mode==='mono'){const ww=W+2,gap=W+30;return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><mask id="mb"><rect width="1024" height="1024" fill="#fff"/>${tube(d1,gap,'#000')}${tube(seg,gap+40,'#fff','butt')}</mask><mask id="ma"><rect width="1024" height="1024" fill="#fff"/>${tube(seg,gap,'#000','butt')}</mask></defs>${wrap(`<g mask="url(#mb)">${tube(d2,ww,'#fff')}</g><g mask="url(#ma)">${tube(d1,ww,'#fff')}</g>`)}</svg>`;}
 if(mode==='bg') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>${orb('o1',C.blue,.95)}${orb('o2',C.violet,1)}${orb('o3',C.cyan,.5)}${orb('o4',C.pink,.4)}<linearGradient id="${p}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A0E44"/><stop offset="1" stop-color="#04051A"/></linearGradient></defs>${art}</svg>`;
 const glass=(id,d,tint,rot,cap='round',cut='')=>`<mask id="${p}${id}m">${tube(d,W,'#fff',cap)}${cut}</mask>
<mask id="${p}${id}r">${tube(d,W,'#fff',cap)}${tube(d,W-12,'#000','square')}${cut}</mask>
<mask id="${p}${id}c">${tube(d,W-26,'#fff',cap)}</mask>
<g mask="url(#${p}${id}m)">
 <g filter="url(#${p}refr)" transform="translate(512 512) scale(1.15) rotate(${rot}) translate(-512 -512)">${art}</g>
 <rect width="1024" height="1024" fill="url(#${tint})" opacity=".5"/>
 <g transform="translate(5 7)"><rect width="1024" height="1024" fill="#000" opacity=".18" mask="url(#${p}${id}c)"/></g>
</g>
<rect width="1024" height="1024" fill="url(#${p}rim)" mask="url(#${p}${id}r)"/>`;
 // Beads at the two ends: one carries a ball seam (sport), the other a spiral (craft, art).
 const bead=(c,t,detail)=>`<circle cx="${c[0]}" cy="${c[1]}" r="34" fill="url(#${t})"/><circle cx="${c[0]}" cy="${c[1]}" r="34" fill="url(#${p}bead)"/>
<circle cx="${c[0]}" cy="${c[1]}" r="32" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="3"/>${detail}
<ellipse cx="${c[0]-11}" cy="${c[1]-14}" rx="12" ry="7" transform="rotate(-30 ${c[0]-11} ${c[1]-14})" fill="#fff" opacity=".9"/>`;
 const seam=(c)=>`<path d="M${c[0]-26} ${c[1]-18} Q${c[0]-6} ${c[1]} ${c[0]-26} ${c[1]+18} M${c[0]+26} ${c[1]-18} Q${c[0]+6} ${c[1]} ${c[0]+26} ${c[1]+18}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3.5" stroke-linecap="round"/>`;
 const spiral=(c)=>`<path d="M${c[0]} ${c[1]} m0 -4 a4 4 0 1 1 -4 4 a9 9 0 1 1 9 9 a15 15 0 1 1 -15 -15" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3.5" stroke-linecap="round"/>`;
 const defs=`<defs>${orb("o1",C.blue,.95)}${orb("o2",C.violet,1)}${orb("o3",C.cyan,.5)}${orb("o4",C.pink,.4)}
<linearGradient id="${p}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0A0E44"/><stop offset="1" stop-color="#04051A"/></linearGradient>
<filter id="${p}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="90"/></filter>
<filter id="${p}refr" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="24"/><feColorMatrix type="matrix" values="1.3 0 0 0 .1  0 1.3 0 0 .1  0 0 1.3 0 .14  0 0 0 1 0"/></filter>
<filter id="${p}shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>
<filter id="${p}glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
<linearGradient id="${p}rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".4" stop-color="#fff" stop-opacity=".2"/><stop offset=".7" stop-color="${C.cyan}" stop-opacity=".55"/><stop offset="1" stop-color="${C.pink}" stop-opacity=".8"/></linearGradient>
<linearGradient id="${p}tA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.blue}"/></linearGradient>
<linearGradient id="${p}tB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.pink}"/><stop offset="1" stop-color="${C.violet}"/></linearGradient>
<radialGradient id="${p}bead" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".5" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>`;
 const bg=mode==='full'?art:'';
 // Specular streaks follow each strand's upper-left edge.
 const spec=(d,off,len,o)=>`<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="8" stroke-linecap="round" transform="translate(-9 -12)" stroke-dasharray="${len} 4000" stroke-dashoffset="${off}"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${defs}${bg}${wrap(`
 <g filter="url(#${p}shadow)" opacity=".6" transform="translate(0 30)">${tube(d1,W,'#02030F')}${tube(d2,W,'#02030F')}</g>
 ${glass('b',d2,`${p}tB`,-14)}
 <g filter="url(#${p}shadow)" opacity=".35" transform="translate(0 14)">${tube(d1,W-10,'#02030F')}</g>
 ${glass('a',d1,`${p}tA`,12,'round',tube(seg,W+2,'#000','butt'))}
 <g filter="url(#${p}shadow)" opacity=".4" transform="translate(0 10)" mask="url(#${p}am)">${tube(seg,W,'#02030F','butt')}</g>
 <g mask="url(#${p}am)">${spec(d1,-50,170,.7)}${spec(d1,-880,110,.45)}</g>${spec(d2,-420,130,.45)}
 <circle cx="512" cy="512" r="46" fill="#fff" opacity=".35" filter="url(#${p}glow)"/>
 ${bead(e1,`${p}tA`,seam(e1))}${bead(e2,`${p}tB`,spiral(e2))}`)}</svg>`;}
module.exports={FINAL};
