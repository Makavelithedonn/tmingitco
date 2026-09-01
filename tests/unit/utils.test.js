import assert from 'assert';
import { describe, it } from 'node:test';
import { genOtp, hmac } from '../../workers/utils.js';

describe('utils', ()=>{
  it('genOtp returns 6 digit string', ()=>{
    const otp = genOtp();
    assert.strictEqual(typeof otp, 'string');
    assert.strictEqual(otp.length, 6);
    assert.match(otp, /^[0-9]{6}$/);
  });

  it('hmac produces deterministic 64-char hex', async ()=>{
    const a = await hmac('+966512345678','test-secret');
    const b = await hmac('+966512345678','test-secret');
    assert.strictEqual(a, b);
    assert.strictEqual(typeof a, 'string');
    assert.match(a, /^[0-9a-f]{64}$/);
  });
});
