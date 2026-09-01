import assert from 'assert';
import { describe, it } from 'node:test';
import { handleRequestOtp, handleVerifyOtp, handleCreateCard, handleGetCard } from '../../workers/worker.js';

function makeReq(path, body){
  const url = 'https://example.com'+path;
  const opts = { method: body? 'POST':'GET', headers: {'content-type':'application/json'}, body: body? JSON.stringify(body): undefined };
  return new Request(url, opts);
}

class KVMock{
  constructor(){ this.store = new Map(); }
  async get(k){ return this.store.has(k) ? this.store.get(k) : null }
  async put(k,v,opts){ this.store.set(k, v); }
  async delete(k){ this.store.delete(k); }
}

class D1Mock{
  constructor(){ this.rows = new Map(); }
  prepare(sql){
    const self = this;
    return {
      bind(...args){
        return {
          run: async ()=>{ // insert
            const [card_id, name, phone_hash] = args;
            self.rows.set(card_id, {card_id, name, phone_hash, created_at: new Date().toISOString()});
            return { success: true };
          },
          first: async ()=>{
            const card_id = args[0];
            return self.rows.get(card_id) || null;
          }
        }
      }
    }
  }
}

const env = {
  OTP_KV: new KVMock(),
  RATE_KV: new KVMock(),
  DB: new D1Mock(),
  HMAC_SECRET: 'test-secret',
  DEV_SHOW_OTP: '1'
};

describe('worker endpoints', ()=>{
  it('request-otp -> returns otp in dev', async ()=>{
    const req = makeReq('/api/request-otp',{phone:'+966512345678'});
    const res = await handleRequestOtp(req, env, '127.0.0.1');
    const j = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(j.ok);
    assert.ok(j.otp);
  });

  it('verify-otp -> consumes otp', async ()=>{
    const phone = '+966512345679';
    // request
    let res = await handleRequestOtp(makeReq('/api/request-otp',{phone}), env, '127.0.0.1');
    let j = await res.json();
    const otp = j.otp;
    // verify
    res = await handleVerifyOtp(makeReq('/api/verify-otp',{phone, otp}), env, '127.0.0.1');
    j = await res.json();
    assert.ok(j.ok);
    // ensure consumed
    const stored = await env.OTP_KV.get('otp:'+ (await (await import('../../workers/utils.js')).hmac(phone, env.HMAC_SECRET)));
    assert.strictEqual(stored, null);
  });

  it('create and get card', async ()=>{
    const phone = '+966512345680';
    // request and verify
    let req = makeReq('/api/request-otp',{phone});
    let res = await handleRequestOtp(req, env, '127.0.0.1');
    let j = await res.json();
    const otp = j.otp;
    res = await handleVerifyOtp(makeReq('/api/verify-otp',{phone, otp}), env, '127.0.0.1');
    j = await res.json();
    assert.ok(j.ok);
    // create card
    const cardId = 'c-123';
    res = await handleCreateCard(makeReq('/api/cards',{card_id:cardId, name:'Test', phone}), env, '127.0.0.1');
    j = await res.json();
    assert.ok(j.ok);
    // get card
    res = await handleGetCard(cardId, env, '127.0.0.1');
    j = await res.json();
    assert.ok(j.ok);
    assert.strictEqual(j.card.card_id, cardId);
  });
});
