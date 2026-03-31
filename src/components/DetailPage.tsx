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

  const [editAmountInt, setEditAmountInt] = useState(() => {
    const v = financing?.totalAmount ?? 0;
    return Math.floor(v).toString();
  });
  const [editAmountDec, setEditAmountDec] = useState(() => {
    const v = financing?.totalAmount ?? 0;
    const d = Math.round((v - Math.floor(v)) * 100);
    return d > 0 ? d.toString() : '';
  });
  const [editDuration, setEditDuration] = useState(() => {
    const m = financing?.totalMonths ?? 1;
    if (m >= 12 && m % 12 === 0) return (m / 12).toString();
    return m.toString();
  });
  const [editDurationType, setEditDurationType] = useState<'mesi' | 'anni'>(() => {
    const m = financing?.totalMonths ?? 1;
    return m >= 12 && m % 12 === 0 ? 'anni' : 'mesi';
  });
  const [paymentInput, setPaymentInput] = useState('');
  const [editingSettings, setEditingSettings] = useState(false);

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

  const saveSettings = () => {
    const amount = parseFloat(`${editAmountInt || '0'}.${editAmountDec || '0'}`);
    const dur = parseInt(editDuration) || 1;
    const months = editDurationType === 'anni' ? dur * 12 : dur;
    onUpdate({ ...financing, totalAmount: amount, totalMonths: months });
  };

  const resetSettings = () => {
    const v = financing.totalAmount;
    setEditAmountInt(Math.floor(v).toString());
    const d = Math.round((v - Math.floor(v)) * 100);
    setEditAmountDec(d > 0 ? d.toString() : '');
    const m = financing.totalMonths;
    if (m >= 12 && m % 12 === 0) {
      setEditDurationType('anni');
      setEditDuration((m / 12).toString());
    } else {
      setEditDurationType('mesi');
      setEditDuration(m.toString());
    }
  };

  const addPayment = () => {
    const val = parseFloat(paymentInput);
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
    setPaymentInput('');
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
        {/* IMPOSTAZIONI */}
        <div className="card section-card">
          <div className="section-heading-row">
            <h3 className="section-heading">⚙️ IMPOSTAZIONI</h3>
            {!editingSettings && (
              <button
                className="card-action-btn"
                onClick={() => setEditingSettings(true)}
                title="Modifica"
              >
                ✏️
              </button>
            )}
          </div>
          {editingSettings ? (
            <>
              <p className="modal-field-label">Importo totale</p>
              <div className="amount-row">
                <input
                  type="number"
                  placeholder="Euro"
                  value={editAmountInt}
                  onChange={(e) => setEditAmountInt(e.target.value)}
                />
                <span className="amount-sep">,</span>
                <input
                  type="number"
                  placeholder="Cent"
                  value={editAmountDec}
                  onChange={(e) => setEditAmountDec(e.target.value.slice(0, 2))}
                  className="amount-dec"
                />
                <span className="amount-currency">€</span>
              </div>
              <p className="modal-field-label">Durata</p>
              <div className="duration-row">
                <select
                  className="duration-select"
                  value={editDurationType}
                  onChange={(e) => setEditDurationType(e.target.value as 'mesi' | 'anni')}
                >
                  <option value="mesi">Mesi</option>
                  <option value="anni">Anni</option>
                </select>
                <input
                  type="number"
                  placeholder="Durata"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
              </div>
              <div className="settings-edit-actions">
                <button
                  className="card-action-btn card-btn-confirm"
                  onClick={() => {
                    saveSettings();
                    setEditingSettings(false);
                  }}
                  title="Conferma"
                >
                  ✓
                </button>
                <button
                  className="card-action-btn card-btn-cancel"
                  onClick={() => {
                    resetSettings();
                    setEditingSettings(false);
                  }}
                  title="Annulla"
                >
                  ←
                </button>
              </div>
            </>
          ) : (
            <div className="settings-display">
              <div className="settings-display-row">
                <span>Importo totale:</span>
                <span>{financing.totalAmount.toFixed(2)} €</span>
              </div>
              <div className="settings-display-row">
                <span>Durata:</span>
                <span>{financing.totalMonths} mesi</span>
              </div>
            </div>
          )}
        </div>

        {/* RIEPILOGO */}
        <div className="card section-card">
          <h3 className="section-heading">📊 RIEPILOGO</h3>
          <div className="summary-grid">
            <div className="summary-box highlight">
              <span className="summary-label">TOTALE</span>
              <span className="summary-value">{financing.totalAmount} €</span>
            </div>
            <div className="summary-box">
              <span className="summary-label">MESI RIMANENTI</span>
              <span className="summary-value">{Math.max(remainingMonths, 0)}</span>
              <span className="summary-sub">su {financing.totalMonths} totali</span>
            </div>
          </div>
          <div className="summary-grid three">
            <div className="summary-box">
              <span className="summary-label">PAGATO</span>
              <span className="summary-value">{paid} €</span>
            </div>
            <div className="summary-box">
              <span className="summary-label">RESIDUO</span>
              <span className="summary-value red">{Math.max(residuo, 0)} €</span>
            </div>
            <div className="summary-box">
              <span className="summary-label">RATE</span>
              <span className="summary-value">{ratesPaid}</span>
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
          <div className="setting-row">
            <input
              type="number"
              value={paymentInput}
              onChange={(e) => setPaymentInput(e.target.value)}
              placeholder="Importo rata €"
            />
            <button className="btn-primary" onClick={addPayment}>
              + Aggiungi
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
