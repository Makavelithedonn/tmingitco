// SMS provider adapters (Twilio/Vonage examples with secure secret management)
// Do NOT commit real API keys; set via wrangler secret put SMS_API_KEY

async function sendSmsViaTwilio(phone, otp, apiKey) {
  const url = 'https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json';
  const params = new URLSearchParams({
    To: phone,
    From: '+1234567890', // Your Twilio number
    Body: `Your OTP is: ${otp}`
  });
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa('YOUR_ACCOUNT_SID:' + apiKey),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  if (!res.ok) throw new Error('Twilio send failed: ' + res.status);
  return res.json();
}

async function sendSmsViaVonage(phone, otp, apiKey) {
  const url = 'https://rest.nexmo.com/sms/json';
  const params = new URLSearchParams({
    api_key: apiKey,
    api_secret: 'YOUR_VONAGE_SECRET',
    to: phone.replace(/^\+/, ''),
    from: 'rgosuksa',
    text: `Your OTP is: ${otp}`
  });
  
  const res = await fetch(url, {
    method: 'POST',
    body: params
  });
  
  if (!res.ok) throw new Error('Vonage send failed: ' + res.status);
  return res.json();
}

// Route SMS based on provider
export async function sendSms(phone, otp, env) {
  const provider = env.SMS_PROVIDER || 'mock';
  const apiKey = env.SMS_API_KEY;
  
  if (provider === 'twilio' && apiKey) {
    try {
      console.log('Sending SMS via Twilio:', phone);
      return await sendSmsViaTwilio(phone, otp, apiKey);
    } catch (e) {
      console.error('Twilio failed:', e.message);
      // Fallback to mock
    }
  }
  
  if (provider === 'vonage' && apiKey) {
    try {
      console.log('Sending SMS via Vonage:', phone);
      return await sendSmsViaVonage(phone, otp, apiKey);
    } catch (e) {
      console.error('Vonage failed:', e.message);
      // Fallback to mock
    }
  }
  
  // Mock SMS: log to console (development/testing)
  console.log(`MOCK SMS to ${phone}: OTP=${otp}`);
  return { mock: true, phone, otp };
}
