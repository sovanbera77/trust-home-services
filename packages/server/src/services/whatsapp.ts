const WHATSAPP_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3099';

export async function sendWhatsApp(to: string, message: string) {
  if (!process.env.WHATSAPP_SERVER_URL) return; // skip if not configured
  try {
    await fetch(`${WHATSAPP_SERVER_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: message }),
    });
  } catch (err) {
    console.error('WhatsApp send failed:', err);
  }
}

export async function notifyWhatsApp(recipients: string[], message: string, adminNotify = false) {
  if (!process.env.WHATSAPP_SERVER_URL) return;
  try {
    await fetch(`${WHATSAPP_SERVER_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients, message, adminNotify }),
    });
  } catch (err) {
    console.error('WhatsApp notify failed:', err);
  }
}
