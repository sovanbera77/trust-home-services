const WHATSAPP_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3099';

export async function sendSms(to: string, message: string) {
  try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM_NUMBER || '';
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') },
        body: new URLSearchParams({ To: to, From: from, Body: message }),
      });
      if (!r.ok) throw new Error('Twilio error: ' + r.status);
    } else if (process.env.MSG91_AUTH_KEY) {
      const r = await fetch('https://api.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: process.env.MSG91_AUTH_KEY },
        body: JSON.stringify({ sender: process.env.MSG91_SENDER || 'TRUSTH', mobiles: to, message }),
      });
      if (!r.ok) throw new Error('MSG91 error: ' + r.status);
    } else if (process.env.WHATSAPP_SERVER_URL) {
      await sendViaWhatsapp(to, message);
    } else {
      if (process.env.NODE_ENV !== 'production') console.log(`[SMS] To: ${to}, Message: ${message}`);
    }
  } catch (err) {
    console.error('SMS send failed:', err);
  }
}

async function sendViaWhatsapp(to: string, message: string) {
  try {
    await fetch(`${WHATSAPP_SERVER_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: message }),
    });
  } catch {}
}
