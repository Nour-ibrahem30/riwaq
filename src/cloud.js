import {createClient} from '@supabase/supabase-js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import config from './cloud-config.json';
export const cloud=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
export async function fetchCatalog(){
 const[tracks,books]=await Promise.all([cloud.from('riwaq_tracks').select('*').order('position'),cloud.from('riwaq_books').select('*').order('track_id').order('position').range(0,999)]);
 if(tracks.error||books.error)throw Error('تعذّر تحديث المكتبة. راجع اتصال الإنترنت وحاول تاني.');
 if(!tracks.data.length||!books.data.length)throw Error('المكتبة لسه بتتجهز. حاول تاني بعد لحظات.');
 return tracks.data.map(t=>({...t,books:books.data.filter(b=>b.track_id===t.id).map(b=>({...b,ti:t.id,bi:b.position,url:b.publisher_url}))}));
}
export async function downloadBook(book,onProgress=()=>{},signal){
 if(!book.parts?.length)throw Error('الكتاب غير متاح للقراءة بعد.');
 const buffers=[];let loaded=0;
 for(const part of book.parts){
  const url=config.url+'/storage/v1/object/authenticated/riwaq-books/'+part.path.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(url,{headers:{apikey:config.key},signal});if(!response.ok)throw Error('تعذّر تحميل الكتاب. جرّب تاني أو راجع اتصالك.');
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength!==part.size||bytesToHex(sha256(bytes))!==part.sha256)throw Error('تحميل الكتاب غير مكتمل. حاول مرة تانية.');
  buffers.push(bytes);loaded+=bytes.byteLength;onProgress(Math.round(loaded/book.byte_size*100));
 }
 const file=new Blob(buffers,{type:'application/pdf'});if(file.size!==book.byte_size)throw Error('تحميل الكتاب غير مكتمل.');return file.arrayBuffer();
}
