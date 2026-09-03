// Request and response handlers for Worker
import { genOtp, hmac } from './utils.js';
import { sendSms } from './sms.js';

function jsonResponse(obj,status=200){ 
  return new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}}) 
}

async function rateLimited(env, ip, limit=20, periodSeconds=60){
  const key = `rl:${ip}`;
  try{
    const raw = await env.RATE_KV.get(key);
    let val = raw ? JSON.parse(raw) : {count:0,until:Math.floor(Date.now()/1000)+periodSeconds};
    if(val.until < Math.floor(Date.now()/1000)) { val = {count:0, until: Math.floor(Date.now()/1000)+periodSeconds} }
    val.count++;
    await env.RATE_KV.put(key, JSON.stringify(val), {expiration: val.until});
    return val.count > limit;
  }catch(e){
    // On KV failure, fail-open
    return false;
  }
}

// Simple token generation/verification using HMAC over base64(payload). This is an internal JWT-like token for admin sessions.
async function generateToken(payloadObj, secret){
  const payload = JSON.stringify(payloadObj);
  const payloadB64 = btoa(payload);
  const sig = await hmac(payloadB64, secret);
  return payloadB64 + '.' + sig;
}

async function verifyToken(token, secret){
  if(!token) return null;
  const parts = token.split('.');
  if(parts.length!==2) return null;
  const [payloadB64, sig] = parts;
  const expected = await hmac(payloadB64, secret);
  if(sig !== expected) return null;
  try{ const obj = JSON.parse(atob(payloadB64));
    if(obj.exp && Date.now() > obj.exp) return null;
    return obj;
  }catch(e){ return null }
}

export async function handleRequestOtp(request, env){
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  if(await rateLimited(env, ip, 10, 60)) return jsonResponse({error:'rate_limited'},429);
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

export async function handleVerifyOtp(request, env){
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  if(await rateLimited(env, ip, 20, 60)) return jsonResponse({error:'rate_limited'},429);
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

export async function handleCreateCard(request, env){
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  if(await rateLimited(env, ip, 50, 60)) return jsonResponse({error:'rate_limited'},429);
  const body = await request.json();
  const {card_id, name, phone} = body;
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

export async function handleGetCard(cardId, env){
  const db = env.DB;
  const row = await db.prepare('SELECT card_id, name, phone_hash, created_at FROM cards WHERE card_id = ?').bind(cardId).first();
  if(!row) return jsonResponse({error:'not_found'},404);
  // Do not return raw phone. If you want to return masked info implement auth.
  return jsonResponse({ok:true, card: row});
}

// --- Submissions endpoints ---
function maskPhoneSimple(phone){
  if(!phone) return '';
  const s = phone.replace(/\s+/g,'');
  if(s.length<=4) return '****'+s;
  return '****' + s.slice(-4);
}

export async function handleSubmit(request, env){
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  if(await rateLimited(env, ip, 100, 60)) return jsonResponse({error:'rate_limited'},429);
  const body = await request.json();
  const {phone, card_id, name} = body;
  if(!phone||!card_id||!name) return jsonResponse({error:'missing_fields'},400);
  const secret = env.HMAC_SECRET || 'dev-secret-placeholder';
  const phone_hash = await hmac(phone, secret);
  const masked = maskPhoneSimple(phone);
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2,8);
  const ua = request.headers.get('User-Agent') || '';
  const db = env.DB;
  await db.prepare('INSERT INTO submissions (id, client_phone, masked_phone, card_id, name, ip_address, user_agent, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').bind(id, phone_hash, masked, card_id, name, ip, ua, 'pending').run();
  return jsonResponse({submission_id:id, status:'pending'});
}

export async function handleGetSubmissionPublic(id, env){
  const db = env.DB;
  const row = await db.prepare('SELECT id, masked_phone, card_id, name, ip_address, submitted_at, status, admin_notes FROM submissions WHERE id = ?').bind(id).first();
  if(!row) return jsonResponse({error:'not_found'},404);
  return jsonResponse({ok:true, submission: row});
}

// --- Admin auth & actions ---
export async function handleAdminLogin(request, env){
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  if(await rateLimited(env, ip, 20, 60)) return jsonResponse({error:'rate_limited'},429);
  const body = await request.json();
  const email = (body.email||'').trim();
  const otp = (body.otp||'').trim();
  if(!email||!otp) return jsonResponse({error:'missing_fields'},400);
  const secret = env.HMAC_SECRET || 'dev-secret-placeholder';
  const key = await hmac(email, secret);
  const stored = await env.OTP_KV.get('otp:'+key);
  if(!stored) return jsonResponse({error:'otp_not_found_or_expired'},400);
  if(stored !== otp) return jsonResponse({error:'invalid_otp'},400);
  await env.OTP_KV.delete('otp:'+key);
  const payload = { email, role: 'admin', exp: Date.now() + (60*60*1000) };
  const token = await generateToken(payload, secret);
  return jsonResponse({ok:true, token});
}

async function requireAdmin(request, env){
  const auth = request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer (.+)$/);
  if(!m) return null;
  const token = m[1];
  const payload = await verifyToken(token, env.HMAC_SECRET || 'dev-secret-placeholder');
  if(!payload) return null;
  if(payload.role !== 'admin') return null;
  return payload;
}

export async function handleAdminListSubmissions(request, env){
  const admin = await requireAdmin(request, env);
  if(!admin) return jsonResponse({error:'unauthorized'},401);
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page')||'1'));
  const per_page = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page')||'25')));
  const status = url.searchParams.get('status') || null; // pending, accepted, rejected
  const offset = (page-1)*per_page;
  const db = env.DB;
  let rows;
  if(status){
    rows = await db.prepare('SELECT id, masked_phone, card_id, name, ip_address, submitted_at, status FROM submissions WHERE status = ? ORDER BY submitted_at DESC LIMIT ? OFFSET ?').bind(status, per_page, offset).all();
  } else {
    rows = await db.prepare('SELECT id, masked_phone, card_id, name, ip_address, submitted_at, status FROM submissions ORDER BY submitted_at DESC LIMIT ? OFFSET ?').bind(per_page, offset).all();
  }
  return jsonResponse({ok:true, submissions: rows.results || rows});
}

export async function handleAdminGetSubmission(request, env, id){
  const admin = await requireAdmin(request, env);
  if(!admin) return jsonResponse({error:'unauthorized'},401);
  const db = env.DB;
  const row = await db.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
  if(!row) return jsonResponse({error:'not_found'},404);
  return jsonResponse({ok:true, submission: row});
}

export async function handleAdminAccept(request, env, id){
  const admin = await requireAdmin(request, env);
  if(!admin) return jsonResponse({error:'unauthorized'},401);
  const body = await request.json();
  const notes = (body.notes||'').trim();
  const db = env.DB;
  await db.prepare('UPDATE submissions SET status = ?, admin_notes = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ? WHERE id = ?').bind('accepted', notes, admin.email, id).run();
  return jsonResponse({ok:true});
}

export async function handleAdminReject(request, env, id){
  const admin = await requireAdmin(request, env);
  if(!admin) return jsonResponse({error:'unauthorized'},401);
  const body = await request.json();
  const notes = (body.notes||'').trim();
  const db = env.DB;
  await db.prepare('UPDATE submissions SET status = ?, admin_notes = ?, processed_at = CURRENT_TIMESTAMP, processed_by = ? WHERE id = ?').bind('rejected', notes, admin.email, id).run();
  return jsonResponse({ok:true});
}
