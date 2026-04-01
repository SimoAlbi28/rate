import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Financing, Payment } from '../types';

interface Props {
  financings: Financing[];
  onUpdate: (updated: Financing) => void;
}

export default function DetailPage({ financings, onUpdate }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const financing = financings.find((f) => f.id === id);

  const [paymentInt, setPaymentInt] = useState('');
  const [paymentDec, setPaymentDec] = useState('');

  if (!financing) {
    return (
      <div className="page">
        <p>Finanziamento non trovato.</p>
        <button onClick={() => navigate('/')}>Torna indietro</button>
      </div>
    );
  }

  const getProgressColor = (pct: number) => {
    if (pct <= 20) return '#e74c3c';
    if (pct <= 40) return '#e67e22';
    if (pct <= 60) return '#f1c40f';
    if (pct <= 80) return '#a8d641';
    return '#2ecc71';
  };

  const paymentsPaid = financing.payments.reduce((s, p) => s + p.amount, 0);
  const paid = paymentsPaid + (financing.initialPaid || 0);
  const residuo = financing.totalAmount - paid;
  const rateAmount = financing.totalMonths > 0 ? financing.totalAmount / financing.totalMonths : 0;
  const ratesPaid = (rateAmount > 0 ? Math.floor(paid / rateAmount) : 0) + (financing.initialPaidRates || 0);
  const remainingMonths = financing.totalMonths - ratesPaid;
  const progress = financing.totalAmount > 0 ? (paid / financing.totalAmount) * 100 : 0;

  const addPayment = () => {
    const val = parseFloat(`${paymentInt || '0'}.${paymentDec || '0'}`);
    if (isNaN(val) || val <= 0) return;
    const payment: Payment = {
      id: crypto.randomUUID(),
      amount: val,
      date: new Date().toISOString(),
    };
    onUpdate({
      ...financing,
      payments: [...financing.payments, payment],
    });
    setPaymentInt('');
    setPaymentDec('');
  };

  const deletePayment = (paymentId: string) => {
    onUpdate({
      ...financing,
      payments: financing.payments.filter((p) => p.id !== paymentId),
    });
  };

  return (
    <div className="page detail-page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <div className="header-emoji">{financing.emoji}</div>
        <div>
          <h1>{financing.name}</h1>
          <p className="header-subtitle">FINANZIAMENTO</p>
        </div>
      </div>

      <div className="content">
        {/* RIEPILOGO */}
        <div className="card section-card">
          <h3 className="section-heading">📊 RIEPILOGO</h3>
          <div className="summary-grid">
            <div className="summary-column">
              {(financing.rateMode || 'variabile') === 'fissa' && (() => {
                const irregulars = financing.payments.filter(p => p.amount !== rateAmount);
                if (irregulars.length === 0) return null;
                const balance = irregulars.reduce((sum, p) => sum + (p.amount - rateAmount), 0);
                const label = balance === 0 ? 'Pareggio di bilancio' : balance > 0 ? 'Credito' : 'Debito';
                const color = balance === 0 ? '#27ae60' : balance > 0 ? '#5dade2' : '#c0392b';
                return (
                  <div className="summary-box" style={{ borderColor: color }}>
                    <span className="summary-label">SITUAZIONE</span>
                    <span className="summary-value" style={{ color }}>{label}</span>
                    {balance !== 0 && (
                      <span className="summary-value" style={{ color }}>{balance > 0 ? '+' : '-'}{Math.abs(balance).toFixed(2)} €</span>
                    )}
                  </div>
                );
              })()}
              <div className="summary-box highlight">
                <span className="summary-label">TOTALE</span>
                <span className="summary-value">{financing.totalAmount.toFixed(2)} €</span>
              </div>
              <div className="summary-box">
                <span className="summary-label">PAGATO</span>
                <span className="summary-value" style={{ color: '#27ae60' }}>{paid.toFixed(2)} €</span>
              </div>
              <div className="summary-box">
                <span className="summary-label">RESTANTE</span>
                <span className="summary-value" style={{ color: '#d4a017' }}>{Math.max(residuo, 0).toFixed(2)} €</span>
              </div>
            </div>
            <div className="summary-column">
              <div className="summary-box">
                <span className="summary-label">RATE PAGATE</span>
                <span className="summary-value">{ratesPaid}</span>
                <span className="summary-sub">su {financing.totalMonths} rate totali</span>
              </div>
              <div className="summary-box">
                <span className="summary-label">RATE RIMANENTI</span>
                <span className="summary-value">{Math.max(remainingMonths, 0)}</span>
              </div>
              {(financing.rateMode || 'variabile') === 'fissa' && rateAmount > 0 && (
                <div className="summary-box">
                  <span className="summary-label">RATA FISSA</span>
                  <span className="summary-value" style={{ color: '#8e44ad' }}>{rateAmount.toFixed(2)} €</span>
                </div>
              )}
            </div>
          </div>
          <div className="progress-section">
            <span className="progress-label">AVANZAMENTO</span>
            <span className="progress-percent">{progress.toFixed(1)}%</span>
          </div>
          <div className="progress-bar big">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(progress, 100)}%`, background: getProgressColor(progress) }}
            />
          </div>
        </div>

        {/* AGGIUNGI PAGAMENTO */}
        <div className="card section-card">
          <h3 className="section-heading">💳 AGGIUNGI PAGAMENTO</h3>
          <div className="amount-row">
            <input
              type="number"
              placeholder="Euro"
              value={paymentInt}
              onChange={(e) => setPaymentInt(e.target.value)}
            />
            <span className="amount-sep">,</span>
            <input
              type="number"
              placeholder="Cent"
              value={paymentDec}
              onChange={(e) => setPaymentDec(e.target.value.slice(0, 2))}
              style={{ maxWidth: '70px' }}
            />
            <span className="amount-currency">€</span>
            <button className="btn-primary btn-tick" onClick={addPayment}>
              ✓
            </button>
          </div>
        </div>

        {/* STORICO PAGAMENTI */}
        {financing.payments.length > 0 && (
          <div className="card section-card">
            <h3 className="section-heading">📋 STORICO PAGAMENTI</h3>
            <div className="payments-list">
              {[...financing.payments].reverse().map((p) => (
                <div key={p.id} className="payment-item">
                  <div>
                    <span className="payment-amount">{p.amount} €</span>
                    <span className="payment-date">
                      {new Date(p.date).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <button
                    className="payment-delete"
                    onClick={() => deletePayment(p.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
