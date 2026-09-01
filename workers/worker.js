// Cloudflare Worker (module) - handles OTP via KV, simple rate-limiting, and D1 card CRUD
// Bindings expected in wrangler.toml (placeholders):
// OTP_KV (KV Namespace), RATE_KV (KV Namespace), DB (D1), HMAC_SECRET (secret)

export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
    try{
      if(url.pathname === '/api/request-otp' && request.method === 'POST') return await handleRequestOtp(request, env, ip);
      if(url.pathname === '/api/verify-otp' && request.method === 'POST') return await handleVerifyOtp(request, env, ip);
      if(url.pathname.startsWith('/api/cards') ){
        if(request.method === 'POST' && url.pathname === '/api/cards') return await handleCreateCard(request, env, ip);
        if(request.method === 'GET'){
          const parts = url.pathname.split('/').filter(Boolean);
          if(parts.length===2){ return await handleGetCard(parts[1], env, ip) }
        }
      }

      // Serve static site under /site for local dev via wrangler or let worker fallthrough
      return new Response('Not found', {status:404})
    }catch(err){
      return new Response(JSON.stringify({error:err.message}),{status:500,headers:{'content-type':'application/json'}})
    }
  }
}

function jsonResponse(obj,status=200){ return new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}}) }

async function rateLimited(env, ip, RATE_KV, limit=20, periodSeconds=60){
  const key = `rl:${ip}`;
  try{
    const raw = await RATE_KV.get(key);
    let val = raw ? JSON.parse(raw) : {count:0,until:Math.floor(Date.now()/1000)+periodSeconds};
    if(val.until < Math.floor(Date.now()/1000)) { val = {count:0, until: Math.floor(Date.now()/1000)+periodSeconds} }
    val.count++;
    await RATE_KV.put(key, JSON.stringify(val), {expiration: val.until});
    return val.count > limit;
  }catch(e){
    // On KV failure, fail-open
    return false;
  }
}

import { genOtp as _genOtp, hmac as _hmac } from './utils.js';

function hmac(phone, secret){ return _hmac(phone, secret) }
function genOtp(){ return _genOtp() }

async function handleRequestOtp(request, env, ip){
  const RATE_KV = env.RATE_KV;
  if(await rateLimited(env, ip, RATE_KV, 10, 60)) return jsonResponse({error:'rate_limited'},429);
  const body = await request.json();
  const phone = (body.phone||'').trim();
  if(!phone) return jsonResponse({error:'missing_phone'},400);
  const secret = env.HMAC_SECRET || 'dev-secret-placeholder';
  const phoneKey = await hmac(phone, secret);
  const otp = genOtp();
  // store OTP in KV keyed by hmac(phone)
  await env.OTP_KV.put('otp:'+phoneKey, otp, {expirationTtl: 300});
  // Attempt to send SMS via configured provider (mock if not configured)
  try{ await sendSms(phone, otp, env); }catch(e){ console.warn('sendSms failed', e) }
  // In development, optionally return the OTP when DEV_SHOW_OTP=1 (do NOT enable in production)
  if (env.DEV_SHOW_OTP === '1') return jsonResponse({ok:true, message:'otp_generated_and_logged_for_dev', otp});
  return jsonResponse({ok:true, message:'otp_generated_and_logged_for_dev'});
}

async function handleVerifyOtp(request, env, ip){
  const RATE_KV = env.RATE_KV;
  if(await rateLimited(env, ip, RATE_KV, 20, 60)) return jsonResponse({error:'rate_limited'},429);
  const body = await request.json();
  const phone = (body.phone||'').trim();
  const otp = (body.otp||'').trim();
  if(!phone||!otp) return jsonResponse({error:'missing_fields'},400);
  const secret = env.HMAC_SECRET || 'dev-secret-placeholder';
  const phoneKey = await hmac(phone, secret);
  const stored = await env.OTP_KV.get('otp:'+phoneKey);
  if(!stored) return jsonResponse({error:'otp_not_found_or_expired'},400);
  if(stored !== otp) return jsonResponse({error:'invalid_otp'},400);
  // consume
  await env.OTP_KV.delete('otp:'+phoneKey);
  return jsonResponse({ok:true});
}

async function handleCreateCard(request, env, ip){
  const RATE_KV = env.RATE_KV;
  if(await rateLimited(env, ip, RATE_KV, 50, 60)) return jsonResponse({error:'rate_limited'},429);
  const body = await request.json();
  const {card_id, name, phone, otp} = body;
  if(!card_id||!name||!phone) return jsonResponse({error:'missing_fields'},400);
  // Verify OTP first - client should have verified using /api/verify-otp; this extra verify is optional but recommended
  const secret = env.HMAC_SECRET || 'dev-secret-placeholder';
  const phoneKey = await hmac(phone, secret);
  const otpValue = await env.OTP_KV.get('otp:'+phoneKey);
  if(otpValue) return jsonResponse({error:'otp_not_consumed'},400);

  // Store into D1 using parameterized query
  const db = env.DB; // D1 binding
  const phone_hash = await hmac(phone, secret);
  const insert = await db.prepare('INSERT INTO cards (card_id, name, phone_hash, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').bind(card_id, name, phone_hash).run();
  return jsonResponse({ok:true, result: insert});
}

async function handleGetCard(cardId, env, ip){
  const db = env.DB;
  const row = await db.prepare('SELECT card_id, name, phone_hash, created_at FROM cards WHERE card_id = ?').bind(cardId).first();
  if(!row) return jsonResponse({error:'not_found'},404);
  // Do not return raw phone. If you want to return masked info implement auth.
  return jsonResponse({ok:true, card: row});
}

// Mock/send SMS adapter - in production implement a real provider using env vars (SMS_API_KEY, SMS_SENDER)
async function sendSms(phone, otp, env){
  if(env.SMS_API_KEY){
    // Example: call SMS provider API using fetch with env.SMS_API_KEY and env.SMS_SENDER
    // Not implemented here to avoid committing provider code/keys. Add implementation when integrating.
    console.log('would send SMS using provider for', phone);
    return;
  }
  // Mock: log delivery to console (development)
  console.log(`MOCK SMS to ${phone}: OTP=${otp}`);
}

// Export handler functions for unit testing
export { handleRequestOtp, handleVerifyOtp, handleCreateCard, handleGetCard };
