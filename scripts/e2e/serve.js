const http=require('http'),fs=require('fs'),path=require('path');const root=process.argv[2];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.json':'application/json','.ttf':'font/ttf'};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=path.join(root,p);
 const tries=[f,f+'.html',path.join(f,'index.html'),path.join(root,'index.html')];
 for(const t of tries){try{if(fs.statSync(t).isFile()){r.writeHead(200,{'content-type':types[path.extname(t)]||'application/octet-stream'});return fs.createReadStream(t).pipe(r)}}catch{}}
 r.writeHead(404);r.end();}).listen(Number(process.env.PORT||8097));
