const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, 'config.json');
const LOG_PATH = path.join(__dirname, 'message-log.json');
const FLOW_PATH = path.join(__dirname, 'user-flows.json');

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const TRUSTHOME_API = process.env.TRUSTHOME_API || 'http://localhost:5000/api';

// ---- Persistence helpers ----

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return { phoneNumberId: '', accessToken: '', adminNotifyNumber: '', webhookVerifyToken: 'trusthome-wa-verify', enabled: false }; }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')); }
  catch { return []; }
}

function appendLog(entry) {
  const log = loadLog();
  log.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (log.length > 500) log.length = 500;
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function loadFlows() {
  try { return JSON.parse(fs.readFileSync(FLOW_PATH, 'utf8')); }
  catch { return {}; }
}

function saveFlow(number, state) {
  const flows = loadFlows();
  flows[number] = { ...state, updatedAt: new Date().toISOString() };
  fs.writeFileSync(FLOW_PATH, JSON.stringify(flows, null, 2));
}

function clearFlow(number) {
  const flows = loadFlows();
  delete flows[number];
  fs.writeFileSync(FLOW_PATH, JSON.stringify(flows, null, 2));
}

// ---- Service menu and auto-reply templates ----

const SERVICE_MENU = `Welcome to Trust Home Services! 🏠

Reply with a number for service:
1️⃣ Plumbing
2️⃣ Electrical
3️⃣ AC & Refrigeration
4️⃣ Appliance Repair
5️⃣ Carpentry
6️⃣ Pest Control
7️⃣ Painting
8️⃣ Home Cleaning
9️⃣ Talk to agent

Or describe your issue and we'll help!`;

const SERVICE_NAMES = {
  1: 'Plumbing', 2: 'Electrical', 3: 'AC & Refrigeration',
  4: 'Appliance Repair', 5: 'Carpentry', 6: 'Pest Control',
  7: 'Painting', 8: 'Home Cleaning', 9: 'Talk to agent',
};

function getServiceSubmenu(service) {
  const menus = {
    Plumbing: `You selected Plumbing 🚿

Reply with sub-service:
1️⃣ Tap / Mixer repair (₹199)
2️⃣ Leakage & pipe repair (₹299)
3️⃣ Water heater service (₹499)
4️⃣ Drain unclogging (₹349)
5️⃣ Other / Describe issue
9️⃣ Back to main menu`,
    Electrical: `You selected Electrical 💡

Reply with sub-service:
1️⃣ Switch / socket repair (₹199)
⬇️ Reply with issue description
9️⃣ Back to main menu`,
  };
  return menus[service] || `You selected ${service}. Please describe your issue and we'll assign the best technician.`;
}

async function sendWhatsApp(to, text, cfg) {
  if (!cfg.phoneNumberId || !cfg.accessToken) return null;
  try {
    const r = await fetch(`${META_API_BASE}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } }),
    });
    const data = await r.json().catch(() => ({}));
    appendLog({ to, text: text.substring(0, 100), status: r.ok ? 'sent' : 'failed', messageId: data.messages?.[0]?.id, error: !r.ok ? (data.error?.message || `HTTP ${r.status}`) : undefined });
    return data;
  } catch (e) {
    appendLog({ to, text: text.substring(0, 100), status: 'failed', error: e.message });
    return null;
  }
}

async function createDocketViaApi(title, desc, customerName, customerPhone) {
  try {
    const docketId = crypto.randomUUID();
    const r = await fetch(`${TRUSTHOME_API}/dockets`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer hrms-s2s-secret-key'
      },
      body: JSON.stringify({
        id: docketId,
        customer: customerPhone || customerName || 'WhatsApp User',
        type: 'repair',
        title: title || 'WhatsApp Service Request',
        desc: desc || 'Requested via WhatsApp',
        address: 'Address requested via WhatsApp',
        preferredDate: new Date().toISOString().slice(0, 10),
      }),
    });
    const data = await r.json();
    appendLog({ to: customerPhone, text: `Docket created: ${title}`, status: 'docket_created', docketId: data.id || docketId });
    return data;
  } catch (e) {
    appendLog({ to: customerPhone, text: 'Failed to create docket', status: 'docket_failed', error: e.message });
    return null;
  }
}

// ---- Config endpoints ----

app.get('/api/config', (req, res) => {
  const cfg = loadConfig();
  res.json({ phoneNumberId: cfg.phoneNumberId, hasToken: !!cfg.accessToken, adminNotifyNumber: cfg.adminNotifyNumber, webhookVerifyToken: cfg.webhookVerifyToken, enabled: cfg.enabled });
});

app.post('/api/config', (req, res) => {
  const { phoneNumberId, accessToken, adminNotifyNumber, webhookVerifyToken, enabled } = req.body;
  const cfg = loadConfig();
  if (phoneNumberId !== undefined) cfg.phoneNumberId = phoneNumberId;
  if (accessToken !== undefined) cfg.accessToken = accessToken;
  if (adminNotifyNumber !== undefined) cfg.adminNotifyNumber = adminNotifyNumber;
  if (webhookVerifyToken !== undefined) cfg.webhookVerifyToken = webhookVerifyToken;
  if (enabled !== undefined) cfg.enabled = enabled;
  saveConfig(cfg);
  res.json({ ok: true });
});

app.get('/api/verify', async (req, res) => {
  const cfg = loadConfig();
  if (!cfg.phoneNumberId || !cfg.accessToken) return res.status(400).json({ error: 'Not configured' });
  try {
    const r = await fetch(`${META_API_BASE}/${cfg.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: err.error?.message || `Meta API error: ${r.status}` });
    }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Webhook (Meta Cloud API) ----

app.get('/api/webhook', (req, res) => {
  const cfg = loadConfig();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === cfg.webhookVerifyToken) {
    console.log('[webhook] Verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

app.post('/api/webhook', async (req, res) => {
  const cfg = loadConfig();
  if (!cfg.enabled) return res.sendStatus(200);

  const body = req.body;
  if (!body?.entry) return res.sendStatus(200);

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value;
      for (const msg of value.messages || []) {
        const from = msg.from;
        const text = msg.text?.body?.trim() || '';
        const msgType = msg.type || 'text';

        appendLog({ from, text, direction: 'inbound', type: msgType });

        const flows = loadFlows();
        const flow = flows[from] || { step: 'new' };

        // Auto-reply logic
        if (flow.step === 'new') {
          await sendWhatsApp(from, SERVICE_MENU, cfg);
          saveFlow(from, { step: 'menu_shown' });
          if (cfg.adminNotifyNumber) {
            await sendWhatsApp(cfg.adminNotifyNumber, `New WhatsApp contact: ${from}`, cfg);
          }
        } else if (flow.step === 'menu_shown' || flow.step === 'collecting_details') {
          const num = parseInt(text);
          if (num >= 1 && num <= 9) {
            if (num === 9) {
              await sendWhatsApp(from, 'An agent will contact you shortly. For urgent issues, call +91-9876543210.', cfg);
              await createDocketViaApi('Agent request (WhatsApp)', `Customer ${from} requested agent`, 'WhatsApp User', from);
              clearFlow(from);
            } else {
              const service = SERVICE_NAMES[num];
              await sendWhatsApp(from, getServiceSubmenu(service), cfg);
              saveFlow(from, { step: 'sub_menu', service });
            }
          } else if (text.length > 5) {
            await sendWhatsApp(from, `Thank you! Your request has been noted. We'll assign a technician shortly.\n\nSummary: ${text}`, cfg);
            await createDocketViaApi(text.substring(0, 100), text, 'WhatsApp User', from);
            clearFlow(from);
          } else {
            await sendWhatsApp(from, 'Please reply with a number (1-9) or describe your issue.', cfg);
          }
        } else if (flow.step === 'sub_menu') {
          if (text === '9') {
            await sendWhatsApp(from, SERVICE_MENU, cfg);
            saveFlow(from, { step: 'menu_shown' });
          } else if (text.length > 2) {
            await sendWhatsApp(from, `Your ${flow.service} request has been noted: "${text}". We'll contact you shortly.`, cfg);
            await createDocketViaApi(`${flow.service} - ${text.substring(0, 80)}`, text, 'WhatsApp User', from);
            clearFlow(from);
          } else {
            await sendWhatsApp(from, `Please describe your issue for ${flow.service} or reply 9 for main menu.`, cfg);
          }
        }
      }
    }
  }
  res.sendStatus(200);
});

// ---- Send & Notify ----

app.post('/api/send', async (req, res) => {
  const cfg = loadConfig();
  if (!cfg.phoneNumberId || !cfg.accessToken) return res.status(400).json({ error: 'Not configured' });
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ error: 'to and text required' });
  const data = await sendWhatsApp(to, text, cfg);
  if (!data) return res.status(500).json({ error: 'Failed to send' });
  res.json(data);
});

app.post('/api/notify', async (req, res) => {
  const cfg = loadConfig();
  if (!cfg.phoneNumberId || !cfg.accessToken) return res.status(400).json({ error: 'Not configured' });
  const { recipients, message, adminNotify } = req.body;
  const results = [];
  const targets = [];
  if (recipients) recipients.forEach(r => targets.push(r));
  if (adminNotify && cfg.adminNotifyNumber) targets.push(cfg.adminNotifyNumber);
  for (const to of [...new Set(targets)]) {
    const data = await sendWhatsApp(to, message, cfg);
    results.push({ to, status: data ? 'sent' : 'failed' });
  }
  res.json({ results });
});

app.get('/api/log', (req, res) => {
  res.json(loadLog());
});

app.get('/api/flows', (req, res) => {
  res.json(loadFlows());
});

const PORT = process.env.PORT || 3099;
app.listen(PORT, () => {
  console.log(`WhatsApp CRM server running on http://localhost:${PORT}`);
});
