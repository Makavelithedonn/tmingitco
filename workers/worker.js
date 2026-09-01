// Cloudflare Worker (module) - handles OTP via KV, simple rate-limiting, and D1 card CRUD
// Bindings expected in wrangler.toml:
// OTP_KV (KV Namespace), RATE_KV (KV Namespace), DB (D1), HMAC_SECRET (secret)

import { handleRequestOtp, handleVerifyOtp, handleCreateCard, handleGetCard } from './handlers.js';

export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    try{
      if(url.pathname === '/api/request-otp' && request.method === 'POST') return await handleRequestOtp(request, env);
      if(url.pathname === '/api/verify-otp' && request.method === 'POST') return await handleVerifyOtp(request, env);
      if(url.pathname.startsWith('/api/cards') ){
        if(request.method === 'POST' && url.pathname === '/api/cards') return await handleCreateCard(request, env);
        if(request.method === 'GET'){
          const parts = url.pathname.split('/').filter(Boolean);
          if(parts.length===2){ return await handleGetCard(parts[1], env) }
        }
      }
      return new Response('Not found', {status:404})
    }catch(err){
      return new Response(JSON.stringify({error:err.message}),{status:500,headers:{'content-type':'application/json'}})
    }
  }
}

