import React,{useEffect,useRef,useState} from 'react';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import PdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline';
import {ArrowRight,ChevronLeft,ChevronRight,Minus,Plus,RotateCcw,Check,BookOpen} from 'lucide-react';
import {cache,loadLocal,saveLocal} from './cache.js';
import {downloadBook} from './cloud.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
GlobalWorkerOptions.workerPort=new PdfWorker();
export function Reader({book,onClose,onPosition,onComplete}){
 const[pdf,setPdf]=useState(null),[page,setPage]=useState(()=>loadLocal('riwaq-positions',{})[book.id]?.page||1),[progress,setProgress]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[zoom,setZoom]=useState(()=>Math.min(2,Math.max(1,Number(loadLocal('riwaq-positions',{})[book.id]?.zoom)||1))),[ready,setReady]=useState(false),[notice,setNotice]=useState(''),[width,setWidth]=useState(window.innerWidth);
 const canvas=useRef(),viewport=useRef();
 useEffect(()=>{const resize=()=>setWidth(window.innerWidth);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[]);
 useEffect(()=>{let alive=true,task;const controller=new AbortController();setLoading(true);setError('');setProgress(0);
  (async()=>{let file;try{const saved=retry===0?await cache('pdfs',book.id):undefined;if(saved?.sha256===book.sha256)file=saved.data;else if(saved instanceof ArrayBuffer&&bytesToHex(sha256(new Uint8Array(saved)))===book.sha256)file=saved}catch{}if(!alive)return;
   if(!file){file=await downloadBook(book,p=>alive&&setProgress(p),controller.signal);if(!alive)return;try{await cache('pdfs',book.id,{sha256:book.sha256,data:file})}catch{setNotice('الكتاب مفتوح، لكن مساحة الجهاز مش كفاية لحفظ نسخة دون إنترنت.')}}
   if(!alive)return;task=getDocument({data:new Uint8Array(file)});const doc=await task.promise;if(!alive){doc.destroy();return}setPdf(doc);setPage(p=>Math.min(Math.max(p,1),doc.numPages));setLoading(false);
  })().catch(e=>{if(alive&&e.name!=='AbortError'){setError(e.message||'تعذّر فتح الكتاب.');setLoading(false)}});
  return()=>{alive=false;controller.abort();task?.destroy()};
 },[book.id,retry]);
 useEffect(()=>{if(!pdf)return;let cancelled=false,render;setReady(false);setError('');pdf.getPage(page).then(p=>{if(cancelled)return;const base=p.getViewport({scale:1}),display=Math.min(width-32,940)*zoom,v=p.getViewport({scale:display/base.width*Math.min(devicePixelRatio,2)}),c=canvas.current;c.width=v.width;c.height=v.height;c.style.width=display+'px';render=p.render({canvasContext:c.getContext('2d'),viewport:v});return render.promise.then(()=>{if(!cancelled)setReady(true)})}).catch(e=>{if(!cancelled&&e.name!=='RenderingCancelledException')setError('تعذّر عرض الصفحة. حاول تاني.');});
  const position={page,total:pdf.numPages,zoom,updated:Date.now()};const all=loadLocal('riwaq-positions',{});saveLocal('riwaq-positions',{...all,[book.id]:position});onPosition(book.id,position);viewport.current?.scrollTo({top:0});return()=>{cancelled=true;render?.cancel()};
 },[pdf,page,zoom,width]);
 return <section className="reader-v2" role="dialog" aria-modal="true" aria-label={'قراءة '+book.title}><header className="reader-header"><button className="icon-button" onClick={onClose} aria-label="رجوع للمكتبة"><ArrowRight/></button><div><small>وَقتٌ لك</small><h1>{book.title}</h1></div><BookOpen size={20}/></header>
 {loading?<div className="reader-wait" role="status"><div className="loading-orbit"><BookOpen size={32}/></div><h2>{progress?'بنجهّز كتابك…':'بنفتح آخر صفحة وقفت عندها…'}</h2><p>أول مرة بس. بعدها كتابك يفضل معاك.</p><progress max="100" value={progress}/><span>{progress}٪</span></div>:<div ref={viewport} className="reader-pages">{error?<div className="reader-error" role="alert"><h2>نحاول تاني؟</h2><p>{error}</p><button className="primary" onClick={()=>{setPdf(null);setRetry(r=>r+1)}}><RotateCcw size={17}/>إعادة المحاولة</button></div>:<><canvas data-ready={ready} ref={canvas}/>{!ready&&pdf&&<p className="rendering-label" role="status">جاري تجهيز الصفحة…</p>}</>}{notice&&<p className="cache-notice">{notice}</p>}</div>}
 {pdf&&!loading&&!error&&<footer className="reader-controls"><div className="reader-zoom"><button className="icon-button" aria-label="تصغير الصفحة" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.25))}><Minus size={17}/></button><span>{Math.round(zoom*100)}٪</span><button className="icon-button" aria-label="تكبير الصفحة" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}><Plus size={17}/></button><button className="reader-finish" onClick={()=>onComplete(book)}><Check size={16}/>أنهيته</button></div><div className="reader-pager"><button className="icon-button" aria-label="الصفحة السابقة" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronRight/></button><label>صفحة <input aria-label="رقم الصفحة" type="number" min={1} max={pdf.numPages} value={page} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=pdf.numPages)setPage(n)}}/> من {pdf.numPages}</label><button className="icon-button" aria-label="الصفحة التالية" disabled={page===pdf.numPages} onClick={()=>setPage(p=>p+1)}><ChevronLeft/></button></div><div className="reader-line"><i style={{width:page/pdf.numPages*100+'%'}}/></div></footer>}
 </section>;
}
