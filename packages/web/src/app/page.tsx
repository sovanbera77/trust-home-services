'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import LoginView from '@/components/LoginView';
import CustomerDashboard from '@/components/CustomerDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';

type View = 'login' | 'customer' | 'admin' | 'employee';

export default function Home() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
        setView(u.role);
      } catch {}
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    setView(userData.role);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Header user={user} onLogout={handleLogout} />
      <main className="p-6 max-w-7xl mx-auto w-full animate-fade-in">
        {view === 'login' && <LoginView onLogin={handleLogin} />}
        {view === 'customer' && <CustomerDashboard user={user} />}
        {view === 'admin' && <AdminDashboard user={user} />}
        {view === 'employee' && <EmployeeDashboard user={user} />}
      </main>
    </div>
  );
}
