// Cloudflare Worker (module) - handles OTP via KV, simple rate-limiting, and D1 card CRUD
// Bindings expected in wrangler.toml:
// OTP_KV (KV Namespace), RATE_KV (KV Namespace), DB (D1), HMAC_SECRET (secret)

import { handleRequestOtp, handleVerifyOtp, handleCreateCard, handleGetCard, handleSubmit, handleGetSubmissionPublic, handleAdminLogin, handleAdminListSubmissions, handleAdminGetSubmission, handleAdminAccept, handleAdminReject } from './handlers.js';

export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    try{
      // Public endpoints
      if(url.pathname === '/api/request-otp' && request.method === 'POST') return await handleRequestOtp(request, env);
      if(url.pathname === '/api/verify-otp' && request.method === 'POST') return await handleVerifyOtp(request, env);
      if(url.pathname === '/api/submit' && request.method === 'POST') return await handleSubmit(request, env);
      if(url.pathname.startsWith('/api/submissions') && request.method === 'GET'){
        // Public read of a single submission for status polling: /api/submissions/:id
        const parts = url.pathname.split('/').filter(Boolean);
        if(parts.length===2){ return await handleGetSubmissionPublic(parts[1], env) }
      }

      // Card routes
      if(url.pathname.startsWith('/api/cards') ){
        if(request.method === 'POST' && url.pathname === '/api/cards') return await handleCreateCard(request, env);
        if(request.method === 'GET'){
          const parts = url.pathname.split('/').filter(Boolean);
          if(parts.length===2){ return await handleGetCard(parts[1], env) }
        }
      }

      // Admin routes (require JWT)
      if(url.pathname.startsWith('/api/admin')){
        const parts = url.pathname.split('/').filter(Boolean); // ['api','admin', ...]
        if(parts.length===2 && request.method==='POST' && parts[1]==='admin' ){
          // Not used
        }
        if(url.pathname === '/api/admin/login' && request.method === 'POST') return await handleAdminLogin(request, env);
        if(url.pathname === '/api/admin/submissions' && request.method === 'GET') return await handleAdminListSubmissions(request, env);
        if(parts.length===3 && parts[1]==='admin' && parts[2].startsWith('submissions') ){
          // /api/admin/submissions/:id or /api/admin/submissions/:id/accept
          const id = parts[2].split('/')[1] || null; // fallback
        }
        // parse more robustly
        const adminParts = url.pathname.split('/').filter(Boolean); // ['api','admin','submissions',':id', 'action?']
        if(adminParts.length>=3 && adminParts[1]==='admin' && adminParts[2]==='submissions'){
          const id = adminParts[3];
          const action = adminParts[4];
          if(adminParts.length===4 && request.method==='GET') return await handleAdminGetSubmission(request, env, id);
          if(adminParts.length===5 && request.method==='POST' && action==='accept') return await handleAdminAccept(request, env, id);
          if(adminParts.length===5 && request.method==='POST' && action==='reject') return await handleAdminReject(request, env, id);
        }
      }

      return new Response('Not found', {status:404})
    }catch(err){
      return new Response(JSON.stringify({error:err.message}),{status:500,headers:{'content-type':'application/json'}})
    }
  }
}

