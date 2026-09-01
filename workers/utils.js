// Utility functions for Cloudflare Worker
export function genOtp(){
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6,'0');
}

export async function hmac(phone, secret){
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(phone));
  const b = new Uint8Array(sig);
  return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
}
