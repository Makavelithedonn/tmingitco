// Client-side form wiring: request OTP, verify OTP/create card, get card
import './nav.js';

async function postJSON(url, body){
  const res = await fetch(url, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const text = await res.text();
  try{ return {ok:res.ok, status:res.status, data: JSON.parse(text)} }catch(e){ return {ok:res.ok, status:res.status, data:text} }
}

const reqForm = document.getElementById('request-otp-form');
if(reqForm){
  reqForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const phone = e.target.phone.value.trim();
    const r = await postJSON('/api/request-otp',{phone});
    document.getElementById('request-otp-result').textContent = r.ok ? 'OTP requested (logged)' : ('Error: '+JSON.stringify(r.data));
  });
}

const verifyForm = document.getElementById('verify-otp-form');
if(verifyForm){
  verifyForm.addEventListener('submit', async e=>{
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
}

const getForm = document.getElementById('get-card-form');
if(getForm){
  getForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const id = e.target.card_id.value.trim();
    const res = await fetch('/api/cards/'+encodeURIComponent(id));
    const text = await res.text();
    try{ document.getElementById('get-card-result').textContent = JSON.stringify(JSON.parse(text),null,2) }catch(e){ document.getElementById('get-card-result').textContent = text }
  });
}

// Basic client-side validation helpers could be expanded when mirroring original site exactly

// Submission flow: POST /api/submit and show submission id + optional polling for status
const submitForm = document.getElementById('submit-form');
if(submitForm){
  submitForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const phone = e.target.phone.value.trim();
    const card_id = e.target.card_id.value.trim();
    const name = e.target.name.value.trim();
    const r = await postJSON('/api/submit',{phone, card_id, name});
    const el = document.getElementById('submit-result');
    if(!r.ok){ el.textContent = 'Error: '+JSON.stringify(r.data); return }
    const id = r.data.submission_id;
    el.innerHTML = `Your submission is under review. ID: <strong>${id}</strong>`;
    // Poll for status every 8s until accepted/rejected
    const poll = async ()=>{
      try{
        const res = await fetch('/api/submissions/'+encodeURIComponent(id));
        if(!res.ok) return;
        const j = await res.json();
        if(j.submission && j.submission.status && j.submission.status !== 'pending'){
          el.innerHTML = `Submission <strong>${id}</strong> ${j.submission.status}.` + (j.submission.admin_notes ? (' Reason: '+j.submission.admin_notes) : '');
        } else {
          setTimeout(poll, 8000);
        }
      }catch(e){ console.warn('poll error', e); setTimeout(poll, 8000); }
    };
    setTimeout(poll, 8000);
  });
}
