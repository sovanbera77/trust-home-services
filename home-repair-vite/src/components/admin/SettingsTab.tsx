import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';
import { set as dbSet, getSetting, setSetting } from '../../lib/db';
import { hashPassword } from '../../lib/utils';
import { saveAppConfig, loadAppConfig, getConfig } from '../../lib/otpService';
import { api as apiClient } from '../../lib/api/client';

export default function SettingsTab() {
  const users = useStore((s) => s.users);

  const [openwaUrl, setOpenwaUrl] = useState('');
  const [openwaKey, setOpenwaKey] = useState('');
  const [openwaSession, setOpenwaSession] = useState('');
  const [openwaEnabled, setOpenwaEnabled] = useState(false);
  const [otpLen, setOtpLen] = useState(6);
  const [otpExpiry, setOtpExpiry] = useState(5);
  const [otpCooldown, setOtpCooldown] = useState(30);
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waAdminNotify, setWaAdminNotify] = useState('');
  const [waEnabled, setWaEnabled] = useState(false);
  const [waVerifyStatus, setWaVerifyStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await loadAppConfig();
      const cfg = getConfig();
      setOtpLen(cfg.otpLength);
      setOtpExpiry(cfg.otpExpiryMinutes);
      setOtpCooldown(cfg.resendCooldown);
      setOpenwaUrl(((await getSetting('openwa_base_url')) as string) || '');
      setOpenwaKey(((await getSetting('openwa_api_key')) as string) || '');
      setOpenwaSession(((await getSetting('openwa_session_id')) as string) || '');
      setOpenwaEnabled(((await getSetting('openwa_enabled')) as boolean) ?? false);
      try {
        const res = await apiClient.get('/whatsapp/config') as any;
        if (res?.phoneNumberId !== undefined) setWaPhoneId(res.phoneNumberId);
        if (res?.adminNotifyNumber !== undefined) setWaAdminNotify(res.adminNotifyNumber);
        if (res?.enabled !== undefined) setWaEnabled(res.enabled);
        setWaToken(res?.hasToken ? '••••••••' : '');
      } catch {}
    })();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const current = (document.getElementById('admin-current-pw') as HTMLInputElement).value;
    const newPw = (document.getElementById('admin-new-pw') as HTMLInputElement).value;
    const confirmPw = (document.getElementById('admin-confirm-pw') as HTMLInputElement).value;
    if (!current || !newPw || !confirmPw) { alert('Fill all fields'); return; }
    if (newPw.length < 4) { alert('Password must be at least 4 characters'); return; }
    if (newPw !== confirmPw) { alert('Passwords do not match'); return; }
    const admin = users.find(u => u.username === 'admin');
    if (admin && admin.password === await hashPassword(current)) {
      admin.password = await hashPassword(newPw);
      dbSet('users', admin);
      useStore.setState({ users: [...users] });
      alert('Password changed!');
    } else {
      alert('Current password is incorrect');
    }
  };

  const handleSaveOpenwa = async (e: React.FormEvent) => {
    e.preventDefault();
    await setSetting('openwa_base_url', openwaUrl);
    await setSetting('openwa_api_key', openwaKey);
    await setSetting('openwa_session_id', openwaSession);
    await setSetting('openwa_enabled', openwaEnabled);
    await saveAppConfig({ otpLength: otpLen, otpExpiryMinutes: otpExpiry, resendCooldown: otpCooldown });
    useStore.setState({ openwa: { baseUrl: openwaUrl, apiKey: openwaKey, sessionId: openwaSession, enabled: openwaEnabled } });
    alert('Settings saved!');
  };

  const handleSaveWaBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.post('/whatsapp/config', { phoneNumberId: waPhoneId, accessToken: waToken === '••••••••' ? undefined : waToken, adminNotifyNumber: waAdminNotify, enabled: waEnabled });
    alert('WhatsApp Business settings saved!');
  };

  const handleVerifyWa = async () => {
    try {
      const res = await apiClient.get('/whatsapp/verify');
      setWaVerifyStatus(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setWaVerifyStatus('Error: ' + (e?.message || 'Verification failed'));
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Password */}
      <div className="glass p-6">
        <h3 className="font-semibold mb-4">{t('settings.changePassword')}</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
<div><label className="block text-xs text-[#94a3b8] mb-1">{t('settings.currentPassword')}</label><input id="admin-current-pw" type="password" className="w-full" /></div>
           <div><label className="block text-xs text-[#94a3b8] mb-1">{t('settings.newPassword')}</label><input id="admin-new-pw" type="password" className="w-full" /></div>
           <div><label className="block text-xs text-[#94a3b8] mb-1">{t('settings.confirmPassword')}</label><input id="admin-confirm-pw" type="password" className="w-full" /></div>
           <button type="submit" className="btn btn-primary w-full">{t('settings.updatePassword')}</button>
        </form>
      </div>

      {/* WhatsApp / OTP Settings */}
      <div className="glass p-6">
        <h3 className="font-semibold mb-4">{t('settings.whatsappOtpConfig')}</h3>
        <form onSubmit={handleSaveOpenwa} className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#94a3b8]">{t('settings.enable') + ' OpenWA Gateway'}</label>
            <label className="relative inline-flex cursor-pointer">
              <input type="checkbox" checked={openwaEnabled} onChange={e => setOpenwaEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            {!openwaEnabled && <span className="text-xs text-amber-400">(Demo mode — OTP shown in dev log)</span>}
          </div>
          <div><label className="block text-xs text-[#94a3b8] mb-1">OpenWA Base URL</label><input value={openwaUrl} onChange={e => setOpenwaUrl(e.target.value)} placeholder="https://openwa.example.com" className="w-full font-mono text-xs" /></div>
          <div><label className="block text-xs text-[#94a3b8] mb-1">API Key</label><input type="password" value={openwaKey} onChange={e => setOpenwaKey(e.target.value)} placeholder="xxxxxxxx" className="w-full font-mono text-xs" /></div>
          <div><label className="block text-xs text-[#94a3b8] mb-1">Session ID</label><input value={openwaSession} onChange={e => setOpenwaSession(e.target.value)} placeholder="default" className="w-full font-mono text-xs" /></div>
          <hr className="border-white/10" />
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-[#94a3b8] mb-1">OTP Length</label><input type="number" min={4} max={8} value={otpLen} onChange={e => setOtpLen(Number(e.target.value))} className="w-full" /></div>
            <div><label className="block text-xs text-[#94a3b8] mb-1">Expiry (min)</label><input type="number" min={1} max={30} value={otpExpiry} onChange={e => setOtpExpiry(Number(e.target.value))} className="w-full" /></div>
            <div><label className="block text-xs text-[#94a3b8] mb-1">Cooldown (sec)</label><input type="number" min={10} max={300} value={otpCooldown} onChange={e => setOtpCooldown(Number(e.target.value))} className="w-full" /></div>
          </div>
          <button type="submit" className="btn btn-primary w-full">{t('settings.save')}</button>
        </form>
      </div>

      {/* WhatsApp Business API (Meta Cloud API) */}
      <div className="glass p-6">
        <h3 className="font-semibold mb-4">{t('settings.whatsappBusiness')}</h3>
        <p className="text-xs text-[#94a3b8] mb-4">{t('settings.whatsappBusinessDesc')}</p>
        <form onSubmit={handleSaveWaBusiness} className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#94a3b8]">{t('settings.enable') + ' WhatsApp Notifications'}</label>
            <label className="relative inline-flex cursor-pointer">
              <input type="checkbox" checked={waEnabled} onChange={e => setWaEnabled(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div><label className="block text-xs text-[#94a3b8] mb-1">Phone Number ID</label><input value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="From Meta Business Manager" className="w-full font-mono text-xs" /></div>
          <div><label className="block text-xs text-[#94a3b8] mb-1">Access Token</label><input type="password" value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="Permanent or temporary token" className="w-full font-mono text-xs" /></div>
          <div><label className="block text-xs text-[#94a3b8] mb-1">Admin Notify Number</label><input value={waAdminNotify} onChange={e => setWaAdminNotify(e.target.value)} placeholder="e.g. 919876543210" className="w-full font-mono text-xs" /></div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1">{t('settings.saveConfig')}</button>
            <button type="button" onClick={handleVerifyWa} className="btn btn-secondary">{t('settings.verifyConnection')}</button>
          </div>
          {waVerifyStatus && (
            <pre className="text-xs bg-black/20 p-2 rounded overflow-auto max-h-32">{waVerifyStatus}</pre>
          )}
        </form>
      </div>
    </div>
  );
}
