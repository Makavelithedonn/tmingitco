// Crawl rgosuksa.com and save a sanitized structural HTML skeleton into /site/replica
// This script intentionally does NOT copy original textual content or images to avoid copyright issues.

import fs from 'fs';
import path from 'path';
// Use global fetch available in Node 18+

const BASE = 'https://rgosuksa.com';
const outDir = './site/replica';

async function fetchAndSanitize(route){
  const url = new URL(route, BASE).toString();
  const res = await fetch(url);
  if(!res.ok) throw new Error('fetch failed '+res.status);
  let html = await res.text();
  // Remove script contents to avoid execution, keep tag structure
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '<script><!-- removed --></script>');
  // Remove comments
  html = html.replace(/<!--([\s\S]*?)-->/g, '');
  // Replace text nodes (naive): any text between > and < that's not just whitespace -> placeholder
  html = html.replace(/>([^<>\n\r]+)</g, (m, p1)=>{ const t = p1.trim(); return t ? '>[CONTENT_REMOVED]<' : '><' });
  // Replace img src with placeholder
  html = html.replace(/<img([^>]+)src=("|')([^"']+)("|')([^>]*)>/gi, '<img$1src="/site/replica-placeholder.png"$5>');
  return html;
}

async function main(){
  const routes = ['/', '/about', '/contact']; // start seeds; expand as needed
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, {recursive:true});
  for(const r of routes){
    try{
      console.log('Fetching', r);
      const html = await fetchAndSanitize(r);
      const file = path.join(outDir, r === '/' ? 'index.html' : (r.replace(/\//g,'')+'.html'));
      fs.writeFileSync(file, html);
      console.log('Saved', file);
    }catch(e){ console.warn('Error', r, e.message) }
  }
  // write placeholder image
  const placeholder = path.join(outDir, 'replica-placeholder.png');
  fs.writeFileSync(placeholder, '');
  console.log('Done');
}

main().catch(e=>{ console.error(e); process.exit(1) });
