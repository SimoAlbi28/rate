import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import type { Financing, RateType } from './types';
import { loadFinancings, saveFinancings } from './storage';
import HomePage from './components/HomePage';
import DetailPage from './components/DetailPage';
import './App.css';

export default function App() {
  const [financings, setFinancings] = useState<Financing[]>([]);

  useEffect(() => {
    setFinancings(loadFinancings());
  }, []);

  const persist = (updated: Financing[]) => {
    setFinancings(updated);
    saveFinancings(updated);
  };

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
          path="/detail/:id"
          element={
            <DetailPage financings={financings} onUpdate={updateFinancing} />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
