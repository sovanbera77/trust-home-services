import type { OtpRecord, AppConfig } from './types';
import { getSetting, setSetting, set as dbSet, get as dbGet, getAll, del as dbDel } from './db';

const OTP_STORE = 'otpRecords';

// Exposed for dev-mode UI to read the demo OTP
export let lastDemoOtp = '';

let appConfig: AppConfig = {
  appName: 'Trust Home Services',
  logoUrl: '/logo.png',
  otpLength: 6,
  otpExpiryMinutes: 5,
  resendCooldown: 30,
};

export async function loadAppConfig(): Promise<AppConfig> {
  const saved = await getSetting('appConfig');
  if (saved) appConfig = { ...appConfig, ...(saved as AppConfig) };
  return appConfig;
}

export async function saveAppConfig(cfg: Partial<AppConfig>): Promise<void> {
  appConfig = { ...appConfig, ...cfg };
  await setSetting('appConfig', appConfig);
}

export function getConfig(): AppConfig {
  return appConfig;
}

function generateOtp(length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function normalizePhone(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

async function sendWhatsApp(whatsapp: string, text: string): Promise<boolean> {
  try {
    const baseUrl = (await getSetting('openwa_base_url')) as string || '';
    const apiKey = (await getSetting('openwa_api_key')) as string || '';
    const sessionId = (await getSetting('openwa_session_id')) as string || '';
    const enabled = (await getSetting('openwa_enabled')) as boolean ?? false;

    if (!enabled || !baseUrl || !apiKey || !sessionId) {
      const devOtp = text.match(/(\d{4,8})/)?.[0] || '??????';
      lastDemoOtp = devOtp;
      console.log(`%c[OTP DEV] +${whatsapp} → ${devOtp}`, 'background:#f59e0b;color:#000;padding:2px 6px;border-radius:4px;font-weight:bold');
      await addLog('otp_dev', whatsapp, text);
      return false;
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/api/sessions/${sessionId}/messages/send-text`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId: `${whatsapp}@c.us`, text }),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed: ${res.status}`);
    await addLog('otp_sent', whatsapp, '');
    return true;
  } catch (e) {
    await addLog('otp_error', whatsapp, String(e));
    return false;
  }
}

async function addLog(action: string, whatsapp: string, details: string): Promise<void> {
  const logs = (await getAll<{ timestamp: string; action: string; whatsapp: string; details: string }>('otpLogs')) || [];
  logs.push({
    timestamp: new Date().toISOString(),
    action,
    whatsapp,
    details,
  });
  await dbSet('otpLogs', { id: 'log', entries: logs.slice(-100) });
}

export async function sendOtp(whatsapp: string, purpose: OtpRecord['purpose'], data?: string): Promise<{ success: boolean; message: string }> {
  const wa = normalizePhone(whatsapp);
  if (!wa) return { success: false, message: 'Invalid phone number' };

  const otp = generateOtp(appConfig.otpLength);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + appConfig.otpExpiryMinutes * 60 * 1000).toISOString();

  const id = `${wa}_${purpose}`;
  const record: OtpRecord = {
    id,
    whatsapp: wa,
    otp,
    purpose,
    data: data || '',
    expiresAt,
    createdAt: now,
  };

  // Remove old record first, then set new one
  const existing = await dbGet<OtpRecord>(OTP_STORE, id);
  if (existing) await dbDel(OTP_STORE, id);
  await dbSet(OTP_STORE, record);

  const text = `Your ${appConfig.appName} verification code is ${otp}. It expires in ${appConfig.otpExpiryMinutes} minutes. Do not share this code with anyone.`;
  await sendWhatsApp(wa, text);

  return { success: true, message: 'OTP sent' };
}

export async function resendOtp(whatsapp: string, purpose: OtpRecord['purpose']): Promise<{ success: boolean; message: string }> {
  const wa = normalizePhone(whatsapp);
  const id = `${wa}_${purpose}`;
  const existing = await dbGet<OtpRecord>(OTP_STORE, id);

  if (existing) {
    const cooldown = appConfig.resendCooldown;
    const elapsed = (Date.now() - new Date(existing.createdAt).getTime()) / 1000;
    if (elapsed < cooldown) {
      return { success: false, message: `Please wait ${Math.ceil(cooldown - elapsed)}s before resending` };
    }
  }

  return sendOtp(wa, purpose, existing?.data);
}

export async function verifyOtp(whatsapp: string, otp: string, purpose: OtpRecord['purpose']): Promise<{ success: boolean; message: string; data?: unknown }> {
  const wa = normalizePhone(whatsapp);
  const id = `${wa}_${purpose}`;
  const rec = await dbGet<OtpRecord>(OTP_STORE, id);

  if (!rec) return { success: false, message: 'No OTP found — request a new code' };
  if (new Date(rec.expiresAt) < new Date()) return { success: false, message: 'OTP expired — request a new code' };
  if (rec.otp !== otp) return { success: false, message: 'Incorrect OTP' };

  return { success: true, message: 'Verified', data: rec.data ? JSON.parse(rec.data) : null };
}

export async function getOtpLogs(): Promise<unknown[]> {
  const log = await dbGet<{ id: string; entries: unknown[] }>('otpLogs', 'log');
  return log?.entries || [];
}

export { normalizePhone, appConfig };
