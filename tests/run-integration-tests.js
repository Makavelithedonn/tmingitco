// Integration test script for local wrangler dev
// Requires: wrangler dev running (default port 8787) with DEV_SHOW_OTP=1 in env

const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const phone = process.env.TEST_PHONE || '+966512345678';
const cardId = 'test-card-001';

async function post(path, body){
  const res = await fetch(BASE+path, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body)});
  const data = await res.json().catch(()=>null);
  return {status: res.status, ok: res.ok, data};
}

async function get(path){
  const res = await fetch(BASE+path);
  const data = await res.json().catch(()=>null);
  return {status: res.status, ok: res.ok, data};
}

(async ()=>{
  console.log('Requesting OTP for', phone);
  const r1 = await post('/api/request-otp', {phone});
  if(!r1.ok){ console.error('request-otp failed', r1); process.exit(2) }
  if(!r1.data || !r1.data.otp){ console.error('DEV_SHOW_OTP not enabled or otp not returned in dev'); console.error('Response:', r1); process.exit(3) }
  const otp = r1.data.otp;
  console.log('Got OTP (dev):', otp);

  const r2 = await post('/api/verify-otp', {phone, otp});
  if(!r2.ok){ console.error('verify-otp failed', r2); process.exit(4) }
  console.log('OTP verified');

  const r3 = await post('/api/cards', {card_id: cardId, name: 'Tester', phone});
  if(!r3.ok){ console.error('create card failed', r3); process.exit(5) }
  console.log('Card created', r3.data);

  const r4 = await get('/api/cards/'+encodeURIComponent(cardId));
  if(!r4.ok){ console.error('get card failed', r4); process.exit(6) }
  console.log('Get card success:', r4.data);
  console.log('Integration tests passed');
  process.exit(0);
})();
