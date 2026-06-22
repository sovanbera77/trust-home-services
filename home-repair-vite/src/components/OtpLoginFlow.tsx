import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { sendOtp, verifyOtp, resendOtp, normalizePhone, getConfig, lastDemoOtp } from '../lib/otpService';
import { hashPassword } from '../lib/utils';
import { set as dbSet } from '../lib/db';
import CountrySelect from './ui/CountrySelect';
import OtpInput from './ui/OtpInput';
import type { AppStore } from '../lib/types';
import { t } from '../lib/i18n';

type FlowStep = 'login' | 'signup' | 'forgot' | 'otp' | 'resetPwd' | 'success';

interface OtpLoginFlowProps {
  onBack: () => void;
  onComplete: (user: import('../lib/types').User | null) => void;
}

const selectOtpData = (s: AppStore) => ({
  users: s.users,
  signup: s.signup,
});

export default function OtpLoginFlow({ onBack, onComplete }: OtpLoginFlowProps) {
  const { users, signup } = useStore(useShallow(selectOtpData));
  const cfg = getConfig();

  const [step, setStep] = useState<FlowStep>('login');
  const [dial, setDial] = useState('91');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [purpose, setPurpose] = useState<'login' | 'signup' | 'reset'>('login');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function getFullPhone() {
    return normalizePhone(dial + phone);
  }

  async function handleSendOtp(p: 'login' | 'signup' | 'reset') {
    setError('');
    setMessage('');
    const full = getFullPhone();
    if (!phone || full.length < 8) { setError(t('otp.phoneInvalid')); return; }

    if (p === 'login') {
      if (!password) { setError(t('otp.enterPwd')); return; }
      const user = users.find(u => u.mobile === full);
      if (!user) { setError(t('otp.noAccount')); return; }
      const hashed = await hashPassword(password);
      if (user.password !== hashed) { setError(t('otp.incorrectPwd')); return; }
    }

    if (p === 'signup') {
      if (!name.trim()) { setError(t('otp.enterName')); return; }
      if (!password || password.length < 4) { setError(t('otp.pwdMinLength')); return; }
      if (password !== confirmPwd) { setError(t('otp.pwdMismatch')); return; }
      const exists = users.find(u => u.mobile === full);
      if (exists) { setError(t('otp.accountExists')); return; }
    }

    setBusy(true);
    const r = await sendOtp(full, p, p === 'signup' ? JSON.stringify({ name, password }) : '');
    setBusy(false);

    if (r.success) {
      setPurpose(p);
      setOtp('');
      setStep('otp');
      setMessage(t('otp.sendOtpTo').replace('{phone}', full));
      setCooldown(cfg.resendCooldown);
    } else {
      setError(r.message);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    const full = getFullPhone();
    if (otp.length !== cfg.otpLength) { setError(t('otp.enterCode').replace('{length}', String(cfg.otpLength))); return; }

    setBusy(true);
    const r = await verifyOtp(full, otp, purpose);
    setBusy(false);

    if (r.success) {
      setOtp('');
      if (purpose === 'signup') {
        const data = (r.data as { password?: string; name?: string } | null) || {};
        const plainPw = data.password || password;
        await signup({
          username: `user_${full}`,
          password: plainPw, // plain — signup hashes it
          role: 'customer',
          name: data.name || name,
          mobile: full,
          email: '',
          address: '',
          specialty: '',
        });
        const updatedUsers = useStore.getState().users;
        const created = updatedUsers.find(u => u.mobile === full);
        if (created) { onComplete({ ...created }); return; }
      } else if (purpose === 'login') {
        const user = users.find(u => u.mobile === full);
        if (user) onComplete({ ...user });
      } else if (purpose === 'reset') {
        setStep('resetPwd');
        setMessage(t('otp.verifiedChoosePwd'));
      }
    } else {
      setError(r.message);
    }
  }

  async function handleResetPassword() {
    setError('');
    if (!newPassword || newPassword.length < 4) { setError(t('otp.pwdMinLength')); return; }
    if (newPassword !== confirmPwd) { setError(t('otp.pwdMismatch')); return; }

    const full = getFullPhone();
    const user = users.find(u => u.mobile === full);
    if (!user) { setError(t('otp.userNotFound')); return; }

    const hashed = await hashPassword(newPassword);
    user.password = hashed;
    await dbSet('users', user);
    useStore.setState({ users: users.map(u => u.username === user.username ? user : u) });
    setStep('success');
    setMessage(t('otp.resetPwdSuccess'));
  }

  async function handleResend() {
    setError('');
    setBusy(true);
    const r = await resendOtp(getFullPhone(), purpose);
    setBusy(false);
    if (r.success) {
      setMessage(t('otp.newCodeSent'));
      setCooldown(cfg.resendCooldown);
    } else {
      setError(r.message);
    }
  }

  if (step === 'success') {
    return (
      <div className="glass p-6 text-center space-y-4 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-lg font-semibold text-white">{message}</h3>
        <button className="btn btn-primary" onClick={() => onComplete(null)}>{t('otp.continueLogin')}</button>
      </div>
    );
  }

  return (
    <div className="glass p-6 space-y-4 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-2">
       <h3 className="text-lg font-semibold text-white">
         {step === 'login' && t('otp.login')}
         {step === 'signup' && t('otp.signup')}
         {step === 'forgot' && t('otp.resetPassword')}
         {step === 'otp' && t('otp.enterOtp')}
         {step === 'resetPwd' && t('otp.newPassword')}
       </h3>
       {step !== 'otp' && (
         <button onClick={onBack} className="text-xs text-[#94a3b8] hover:text-white transition-colors">{t('otp.back')}</button>
       )}
      </div>

       {step === 'login' && (
         <div className="space-y-3">
           <p className="text-xs text-[#94a3b8]">{t('otp.enterPhone')}</p>
           <div className="flex gap-2">
             <div className="w-24 flex-shrink-0"><CountrySelect value={dial} onChange={setDial} /></div>
             <input
               type="tel"
               placeholder={t('otp.phonePlaceholder')}
               value={phone}
               onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
               className="flex-1"
             />
           </div>
           <input type="password" placeholder={t('auth.password')} value={password} onChange={e => setPassword(e.target.value)} />
           <button className="btn btn-primary w-full" disabled={busy} onClick={() => handleSendOtp('login')}>
             {busy ? t('otp.sending') : t('otp.sendOtp')}
           </button>
           <div className="flex justify-between text-xs">
             <button className="text-indigo-400 hover:underline" onClick={() => { setStep('signup'); setError(''); }}>{t('otp.createAccount')}</button>
             <button className="text-indigo-400 hover:underline" onClick={() => { setStep('forgot'); setError(''); }}>{t('otp.forgotPassword')}</button>
           </div>
         </div>
       )}

       {step === 'signup' && (
         <div className="space-y-3">
           <p className="text-xs text-[#94a3b8]">{t('otp.createAccountDesc')}</p>
           <input placeholder={t('otp.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
           <div className="flex gap-2">
             <div className="w-24 flex-shrink-0"><CountrySelect value={dial} onChange={setDial} /></div>
             <input type="tel" placeholder={t('otp.phonePlaceholder')} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="flex-1" />
           </div>
           <input type="password" placeholder={t('otp.pwdPlaceholder')} value={password} onChange={e => setPassword(e.target.value)} />
           <input type="password" placeholder={t('otp.confirmPwdPlaceholder')} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
           <button className="btn btn-primary w-full" disabled={busy} onClick={() => handleSendOtp('signup')}>
             {busy ? t('otp.sending') : t('otp.createSendOtp')}
           </button>
           <button className="text-xs text-indigo-400 hover:underline w-full text-center" onClick={() => { setStep('login'); setError(''); }}>
             {t('otp.alreadyAccount')}
           </button>
         </div>
       )}

       {step === 'forgot' && (
         <div className="space-y-3">
           <p className="text-xs text-[#94a3b8]">{t('otp.enterPhoneReset')}</p>
           <div className="flex gap-2">
             <div className="w-24 flex-shrink-0"><CountrySelect value={dial} onChange={setDial} /></div>
             <input type="tel" placeholder={t('otp.phonePlaceholder')} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="flex-1" />
           </div>
           <button className="btn btn-primary w-full" disabled={busy} onClick={() => handleSendOtp('reset')}>
             {busy ? t('otp.sending') : t('otp.sendResetCode')}
           </button>
           <button className="text-xs text-indigo-400 hover:underline w-full text-center" onClick={() => { setStep('login'); setError(''); }}>
             {t('otp.backToLogin')}
           </button>
         </div>
       )}

       {step === 'otp' && (
         <div className="space-y-4">
           {message && <p className="text-xs text-green-400 text-center">{message}</p>}
           <p className="text-xs text-[#94a3b8] text-center">
             {t('otp.enterOtpCode').replace('{length}', String(cfg.otpLength))}
           </p>
           {!useStore.getState().openwa.enabled && lastDemoOtp && (
             <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm px-3 py-2 rounded-lg text-center font-mono tracking-widest">
               {lastDemoOtp}
             </div>
           )}
           <OtpInput length={cfg.otpLength} value={otp} onChange={setOtp} />
           {cooldown > 0 ? (
             <p className="text-xs text-[#94a3b8] text-center">{t('otp.resendIn').replace('{cooldown}', String(cooldown))}</p>
           ) : (
             <button className="text-xs text-indigo-400 hover:underline w-full text-center" disabled={busy} onClick={handleResend}>
               {t('otp.resend')}
             </button>
           )}
           <button className="btn btn-primary w-full" disabled={busy || otp.length !== cfg.otpLength} onClick={handleVerifyOtp}>
             {busy ? t('otp.verifying') : t('otp.verifyContinue')}
           </button>
           <button className="text-xs text-[#94a3b8] hover:text-white w-full text-center" onClick={() => setStep('login')}>
             {t('otp.cancel')}
           </button>
         </div>
       )}

       {step === 'resetPwd' && (
         <div className="space-y-3">
           <input type="password" placeholder={t('otp.newPwdPlaceholder')} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
           <input type="password" placeholder={t('otp.confirmNewPwd')} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
           <button className="btn btn-primary w-full" disabled={busy} onClick={handleResetPassword}>
             {busy ? t('otp.saving') : t('otp.savePwd')}
           </button>
         </div>
       )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-3 py-2 rounded-lg text-center">
          {error}
        </div>
      )}

       {busy && step !== 'otp' && (
         <div className="flex items-center justify-center gap-2 text-xs text-[#94a3b8]">
           <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
           {t('otp.processing')}
         </div>
       )}
    </div>
  );
}
