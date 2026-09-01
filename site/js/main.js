// Client-side form wiring: request OTP, verify OTP/create card, get card
async function postJSON(url, body){
  const res = await fetch(url, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const text = await res.text();
  try{ return {ok:res.ok, status:res.status, data: JSON.parse(text)} }catch(e){ return {ok:res.ok, status:res.status, data:text} }
}

document.getElementById('request-otp-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const phone = e.target.phone.value.trim();
  const r = await postJSON('/api/request-otp',{phone});
  document.getElementById('request-otp-result').textContent = r.ok ? 'OTP requested (logged)' : ('Error: '+JSON.stringify(r.data));
});

document.getElementById('verify-otp-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const phone = e.target.phone.value.trim();
  const otp = e.target.otp.value.trim();
  const card_id = e.target.card_id.value.trim();
  const name = e.target.name.value.trim();

  const v = await postJSON('/api/verify-otp',{phone, otp});
  if(!v.ok){ document.getElementById('verify-otp-result').textContent = 'OTP verify failed: '+JSON.stringify(v.data); return }
  const c = await postJSON('/api/cards',{card_id, name, phone});
  document.getElementById('verify-otp-result').textContent = c.ok ? 'Card created' : ('Card error: '+JSON.stringify(c.data));
});

document.getElementById('get-card-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const id = e.target.card_id.value.trim();
  const res = await fetch('/api/cards/'+encodeURIComponent(id));
  const text = await res.text();
  try{ document.getElementById('get-card-result').textContent = JSON.stringify(JSON.parse(text),null,2) }catch(e){ document.getElementById('get-card-result').textContent = text }
});

// Basic client-side validation helpers could be expanded when mirroring original site exactly
