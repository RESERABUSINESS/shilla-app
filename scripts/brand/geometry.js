// Shared geometry for the Sohba S.
// Shared S geometry: two arcs of radius R meeting at the centre.
function Spts(n=140,R=150,cy0=512,a0=-24,a1=156){const pts=[];
 for(let i=0;i<=n;i++){const t=i/n,th=(a0+(-270-a0)*t)*Math.PI/180;pts.push([512+R*Math.cos(th),cy0-R+R*Math.sin(th)]);}
 for(let i=1;i<=n;i++){const t=i/n,th=(-90+(a1+90)*t)*Math.PI/180;pts.push([512+R*Math.cos(th),cy0+R+R*Math.sin(th)]);}
 return pts;}
const normals=(P)=>P.map((p,i)=>{const a=P[Math.max(0,i-1)],b=P[Math.min(P.length-1,i+1)];const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [-dy/l,dx/l];});
const poly=(P)=>'M'+P.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L');

module.exports={Spts,normals,poly};
