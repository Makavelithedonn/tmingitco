import assert from 'assert';
import { describe, it } from 'node:test';
import { handleSubmit, handleGetSubmissionPublic, handleAdminLogin, handleAdminListSubmissions, handleAdminGetSubmission, handleAdminAccept, handleAdminReject } from '../../workers/handlers.js';

function makeReq(url, body, headers){
  const opts = { method: body? 'POST':'GET', headers: {'content-type':'application/json', ...(headers||{})}, body: body? JSON.stringify(body): undefined };
  return new Request('https://example.com'+url, opts);
}

class KVMock{ constructor(){ this.store = new Map(); } async get(k){ return this.store.has(k)? this.store.get(k): null } async put(k,v,opts){ this.store.set(k, v); } async delete(k){ this.store.delete(k); } }
class D1Mock{ constructor(){ this.rows = new Map(); }
  prepare(sql){ const self=this; return {
    bind(...args){ return {
      run: async ()=>{ // insert/update
        if(sql.includes('INSERT INTO submissions')){
          const [id, client_phone, masked_phone, card_id, name, ip_address, user_agent, status] = args;
          self.rows.set(id, {id, client_phone, masked_phone, card_id, name, ip_address, user_agent, status, submitted_at: new Date().toISOString()});
          return {success:true};
        }
        if(sql.startsWith('UPDATE submissions')){
          const [status, admin_notes, processed_by, id] = args;
          const r = self.rows.get(id);
          if(r){ r.status = status; r.admin_notes = admin_notes; r.processed_by = processed_by; r.processed_at = new Date().toISOString(); self.rows.set(id,r); }
          return {success:true};
        }
        return {success:true};
      },
      first: async ()=>{
        const id = args[0];
        return self.rows.get(id) || null;
      },
      all: async ()=>{
        // simple: return all rows or filtered by status
        if(sql.includes('WHERE status = ?')){
          const [status, limit, offset] = args;
          const all = Array.from(self.rows.values()).filter(r=>r.status===status).slice(0,limit);
          return {results: all};
        }
        const [limit, offset] = args;
        const all = Array.from(self.rows.values()).slice(0,limit);
        return {results: all};
      }
    }}
  }}
}

const env = {
  OTP_KV: new KVMock(),
  RATE_KV: new KVMock(),
  DB: new D1Mock(),
  HMAC_SECRET: 'test-secret',
  DEV_SHOW_OTP: '1'
};

describe('submissions flow', ()=>{
  it('submit then public get', async ()=>{
    const req = makeReq('/api/submit',{phone:'+966500000000',card_id:'c1',name:'Test'});
    const res = await handleSubmit(req, env);
    const j = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(j.submission_id);

    const g = await handleGetSubmissionPublic(makeReq('/api/submissions/'+j.submission_id), env);
    // handleGetSubmissionPublic expects (id, env) signature, call directly
    const g2 = await handleGetSubmissionPublic(j.submission_id, env);
    const gjson = await g2.json();
    assert.ok(gjson.ok);
    assert.strictEqual(gjson.submission.id, j.submission_id);
  });

  it('admin login and accept/reject', async ()=>{
    // request otp for admin email
    const email = 'devopsjacob@gmail.com';
    // generate OTP
    await (async ()=>{
      const otpReq = makeReq('/api/request-otp',{phone:email});
      const r = await (await import('../../workers/handlers.js')).handleRequestOtp(otpReq, env);
      const j = await r.json();
      assert.ok(j.otp);
      // store OTP in variable
      env._lastOtp = j.otp;
    })();

    // now login
    const loginReq = makeReq('/api/admin/login',{email, otp: env._lastOtp});
    const loginRes = await handleAdminLogin(loginReq, env);
    const lj = await loginRes.json();
    assert.ok(lj.ok && lj.token);
    const token = lj.token;

    // create a submission to act on
    const subRes = await handleSubmit(makeReq('/api/submit',{phone:'+966511111111',card_id:'cX',name:'A'}), env);
    const subj = await subRes.json();
    const id = subj.submission_id;

    // accept
    const acceptReq = makeReq('/api/admin/submissions/'+id+'/accept', {notes:'OK'}, {'authorization': 'Bearer '+token});
    const a = await handleAdminAccept(acceptReq, env, id);
    const aj = await a.json();
    assert.ok(aj.ok);

    // get submission and ensure status
    const g1 = await handleAdminGetSubmission(makeReq('/api/admin/submissions/'+id, null, {'authorization': 'Bearer '+token}), env, id);
    const gj = await g1.json();
    assert.strictEqual(gj.submission.status, 'accepted');

    // reject (create another)
    const subRes2 = await handleSubmit(makeReq('/api/submit',{phone:'+966522222222',card_id:'cY',name:'B'}), env);
    const sid2 = (await subRes2.json()).submission_id;
    const rejectReq = makeReq('/api/admin/submissions/'+sid2+'/reject', {notes:'Bad'}, {'authorization': 'Bearer '+token});
    const rj = await handleAdminReject(rejectReq, env, sid2);
    const rjjson = await rj.json();
    assert.ok(rjjson.ok);
    const g2 = await handleAdminGetSubmission(makeReq('/api/admin/submissions/'+sid2, null, {'authorization': 'Bearer '+token}), env, sid2);
    const g2j = await g2.json();
    assert.strictEqual(g2j.submission.status, 'rejected');
  });
});