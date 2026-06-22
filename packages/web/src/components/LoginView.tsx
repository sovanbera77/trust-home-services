'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface LoginViewProps {
  onLogin: (user: any) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({ username: '', password: '', name: '', mobile: '', email: '', address: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await api.login({ username: form.username, password: form.password, role });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        const data = await api.signup({ ...form, role: 'customer' });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 glass p-8">
      <h2 className="text-2xl font-bold text-center mb-6">
        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
      </h2>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('login')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-primary text-white' : 'bg-white/5 text-[#94a3b8]'}`}
        >
          Login
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-primary text-white' : 'bg-white/5 text-[#94a3b8]'}`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'login' && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm"
          >
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
        )}

        <input
          type="text" placeholder="Username" required
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm focus:border-primary outline-none"
        />

        {mode === 'signup' && (
          <>
            <input type="text" placeholder="Full Name" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm focus:border-primary outline-none" />
            <input type="tel" placeholder="Mobile Number" required value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm focus:border-primary outline-none" />
            <input type="email" placeholder="Email (optional)" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm focus:border-primary outline-none" />
            <input type="text" placeholder="Address (optional)" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm focus:border-primary outline-none" />
          </>
        )}

        <input type="password" placeholder="Password" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg bg-[#0f172a]/60 border border-white/10 text-white text-sm focus:border-primary outline-none" />

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-xs text-[#94a3b8] text-center space-y-1">
        <p>Demo: admin / admin123 | emp1 / emp123 | cust1 / cust123</p>
      </div>
    </div>
  );
}
