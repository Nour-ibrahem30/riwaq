import http from 'node:http';
import {readFileSync,createReadStream,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const tracks=JSON.parse(readFileSync(resolve(here,'src/library.json'),'utf8'));
let local={};try{local=JSON.parse(readFileSync(resolve(here,'riwaq.local.json'),'utf8'))}catch{}
const libraryRoot=resolve(process.env.RIWAQ_LIBRARY_DIR||local.libraryRoot||resolve(here,'books'));
const files=new Map(tracks.flatMap(t=>t.books).filter(b=>!b.pending).map(b=>{const file=resolve(libraryRoot,...b.id.split(/[\\/]/));const rel=relative(libraryRoot,file);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Invalid library entry');return[b.id,file]}));
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
 let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);res.end();return}
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return}
 let file,type;
 if(url.pathname==='/book'){file=files.get(url.searchParams.get('id'));type='application/pdf';if(!file){res.writeHead(404);res.end('Book not found');return}}
 else if(url.pathname==='/'){file=resolve(here,'dist/index.html');type='text/html; charset=utf-8'}
 else{res.writeHead(404);res.end('Not found');return}
 try{
  const {size}=statSync(file);const headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  let start=0,end=size-1,status=200;
  if(req.headers.range){let m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return}
   if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(size-1,Number(m[2]))}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')res.end();else{const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res)}
 }catch{res.writeHead(404);res.end('File unavailable')}
});
const port=Number(process.env.RIWAQ_PORT||4173);server.listen(port,'127.0.0.1',()=>console.log(`RIWAQ_READY http://127.0.0.1:${port}`));
