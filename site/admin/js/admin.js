async function jsonPost(url, body, token){
  const res = await fetch(url, {method:'POST', headers:{'content-type':'application/json', ...(token?{'Authorization':'Bearer '+token}: {})}, body: JSON.stringify(body)});
  return res.json().catch(()=>({ok:false}));
}

async function jsonGet(url, token){
  const res = await fetch(url, {headers: {...(token?{'Authorization':'Bearer '+token}: {})}});
  return res.json().catch(()=>({ok:false}));
}

function renderRow(tbody, s){
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${s.id}</td><td>${s.masked_phone||''}</td><td>${s.card_id||''}</td><td>${s.name||''}</td><td>${s.ip_address||''}</td><td>${s.submitted_at||''}</td><td>${s.status||''}</td><td></td>`;
  const actions = tr.querySelector('td:last-child');
  const viewBtn = document.createElement('button'); viewBtn.textContent='View';
  viewBtn.addEventListener('click', async ()=>{
    const token = localStorage.getItem('ADMIN_JWT');
    const j = await jsonGet('/api/admin/submissions/'+encodeURIComponent(s.id), token);
    if(j.ok){ alert(JSON.stringify(j.submission,null,2)); }
    else alert('Error: '+JSON.stringify(j));
  });
  const acceptBtn = document.createElement('button'); acceptBtn.textContent='Accept';
  acceptBtn.addEventListener('click', async ()=>{
    const notes = prompt('Accept notes (optional)')||'';
    const token = localStorage.getItem('ADMIN_JWT');
    const j = await jsonPost('/api/admin/submissions/'+encodeURIComponent(s.id)+'/accept', {notes}, token);
    if(j.ok){ alert('Accepted'); load(); }
    else alert('Error: '+JSON.stringify(j));
  });
  const rejectBtn = document.createElement('button'); rejectBtn.textContent='Reject';
  rejectBtn.addEventListener('click', async ()=>{
    const notes = prompt('Reject reason')||'';
    const token = localStorage.getItem('ADMIN_JWT');
    const j = await jsonPost('/api/admin/submissions/'+encodeURIComponent(s.id)+'/reject', {notes}, token);
    if(j.ok){ alert('Rejected'); load(); }
    else alert('Error: '+JSON.stringify(j));
  });
  actions.appendChild(viewBtn); actions.appendChild(acceptBtn); actions.appendChild(rejectBtn);
  tbody.appendChild(tr);
}

async function load(){
  const token = localStorage.getItem('ADMIN_JWT');
  if(!token){ location.href = '/site/admin/login.html'; return }
  const status = document.getElementById('filter-status').value.trim() || '';
  const url = '/api/admin/submissions' + (status?('?status='+encodeURIComponent(status)):'');
  const j = await jsonGet(url, token);
  if(!j.ok){ alert('Error fetching: '+JSON.stringify(j)); return }
  const tbody = document.querySelector('#subs-table tbody'); tbody.innerHTML='';
  (j.submissions||[]).forEach(s=> renderRow(tbody, s));
  // update counts (simple)
  document.getElementById('pending-count').textContent = (j.submissions||[]).filter(x=>x.status==='pending').length;
  document.getElementById('completed-count').textContent = (j.submissions||[]).filter(x=>x.status!=='pending').length;
}

document.getElementById('reload').addEventListener('click', load);
document.getElementById('logout').addEventListener('click', ()=>{ localStorage.removeItem('ADMIN_JWT'); location.href='/site/admin/login.html' });

// initial load
load();
