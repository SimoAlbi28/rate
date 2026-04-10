import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { Financing, RateType } from './types';
import { loadFinancings, saveFinancings, saveFinancingsToCloud, mergeLocalToCloud } from './storage';
import { AuthProvider, useAuth } from './AuthContext';
import HomePage from './components/HomePage';
import DetailPage from './components/DetailPage';
import RiepilogoPage from './components/RiepilogoPage';
import AuthPage from './components/AuthPage';
import BottomNav from './components/BottomNav';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import CronologiaPage from './components/CronologiaPage';
import './App.css';

function AppContent() {
  const { user, loading, isGuest } = useAuth();
  const [financings, setFinancings] = useState<Financing[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const profileIcon = localStorage.getItem('profileIcon') || '👤';
  const profileColor = localStorage.getItem('profileColor') || '#3498db';

  // Load data based on auth state
  useEffect(() => {
    if (loading) return;

    const load = async () => {
      if (user) {
        const merged = await mergeLocalToCloud(user.id);
        setFinancings(merged);
        saveFinancings(merged);
      } else {
        setFinancings(loadFinancings());
      }
      setDataLoaded(true);
    };

    load();
  }, [user, loading]);

  // Clear the first-login flag if present (no redirect: every login lands on home)
  useEffect(() => {
    if (user) localStorage.removeItem('rate-first-login');
  }, [user]);

  // Auto theme: re-evaluate every minute, on focus and on visibilitychange so
  // the dark/light switch happens regardless of which page is mounted.
  useEffect(() => {
    const apply = () => {
      const mode = localStorage.getItem('settings-theme') || 'auto';
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      // Dark dalle 20:00 alle 06:00
      const isDarkHour = minutes >= 20 * 60 || minutes < 6 * 60;
      const dark = mode === 'dark' || (mode === 'auto' && isDarkHour);
      if (dark) document.documentElement.setAttribute('data-theme', 'dark');
      else if (mode === 'light' || (mode === 'auto' && !isDarkHour)) document.documentElement.removeAttribute('data-theme');
    };
    apply();
    const interval = window.setInterval(apply, 30_000); // ogni 30s
    window.addEventListener('focus', apply);
    document.addEventListener('visibilitychange', apply);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', apply);
      document.removeEventListener('visibilitychange', apply);
    };
  }, []);

  const persist = useCallback((updated: Financing[]) => {
    setFinancings(updated);
    saveFinancings(updated);
    if (user) {
      saveFinancingsToCloud(user.id, updated);
    }
  }, [user]);

  const addFinancing = (name: string, emoji: string, totalAmount: number, totalMonths: number, rateType: RateType, rateMode: 'fissa' | 'variabile', startDate: string, endDate: string, initialPaid: number, initialPaidRates: number, fixedRateAmount?: number, initialPayments?: import('./types').Payment[]) => {
    let interestPerRate: number | undefined;
    let totalInterest: number | undefined;
    if (rateMode === 'fissa' && fixedRateAmount && fixedRateAmount > 0 && totalMonths > 0) {
      const totalWithInterest = fixedRateAmount * totalMonths;
      totalInterest = totalWithInterest - totalAmount;
      interestPerRate = totalInterest / totalMonths;
    }
    const newF: Financing = {
      id: crypto.randomUUID(),
      name,
      emoji,
      totalAmount,
      totalMonths,
      rateType,
      rateMode,
      startDate,
      endDate,
      initialPaidRates,
      initialPaid,
      payments: initialPayments || [],
      fixedRateAmount,
      interestPerRate,
      totalInterest,
    };
    persist([...financings, newF]);
  };

  const deleteFinancing = (id: string) => {
    persist(financings.filter((f) => f.id !== id));
  };

  const updateFinancing = (updated: Financing) => {
    persist(financings.map((f) => (f.id === updated.id ? updated : f)));
  };

  if (loading || !dataLoaded) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: '#666', fontSize: '1rem' }}>Caricamento...</p>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              financings={financings}
              onAdd={addFinancing}
              onDelete={deleteFinancing}
              onUpdate={updateFinancing}
            />
          }
        />
        <Route
          path="/riepilogo"
          element={
            <RiepilogoPage financings={financings} />
          }
        />
        <Route
          path="/profilo"
          element={<ProfilePage />}
        />
        <Route
          path="/impostazioni"
          element={<SettingsPage financings={financings} />}
        />
        <Route
          path="/cronologia"
          element={<CronologiaPage financings={financings} />}
        />
        <Route
          path="/detail/:id"
          element={
            <DetailPage financings={financings} onUpdate={updateFinancing} />
          }
        />
      </Routes>

      <BottomNav
        profileIcon={profileIcon}
        profileColor={profileColor}
      />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
