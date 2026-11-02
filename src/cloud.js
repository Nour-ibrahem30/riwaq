import {createClient} from '@supabase/supabase-js';
import config from './cloud-config.json';
import manifest from './cloud-manifest.json';
export const cloud=createClient(config.url,config.key);
export async function downloadBook(id,onProgress=()=>{}){
 const book=manifest[id];if(!book)throw Error('الكتاب غير متاح سحابيًا.');
 const buffers=[];let loaded=0;
 for(const part of book.parts){
  const{data,error}=await cloud.storage.from('riwaq-books').download(part.path);if(error)throw Error('تعذّر تنزيل الكتاب. سجّل دخولك وتأكد من اكتمال رفعه.');
  const bytes=await data.arrayBuffer();if(bytes.byteLength!==part.size)throw Error('تحميل الكتاب غير مكتمل. حاول مرة تانية.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==part.sha256)throw Error('تعذّر التأكد من سلامة الملف.');
  buffers.push(bytes);loaded+=bytes.byteLength;onProgress(Math.round(loaded/book.size*100));
 }
 return new Blob(buffers,{type:'application/pdf'}).arrayBuffer();
}
