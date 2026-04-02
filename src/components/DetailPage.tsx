import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Home } from 'lucide-react';
import type { Financing, Payment } from '../types';

const PROFILE_ICONS = [
  '👤', '👩', '👨', '🧑', '👧', '👦', '🧔', '👩‍💼', '👨‍💼', '🧑‍💻',
  '👩‍🎓', '👨‍🎓', '🦸', '🧑‍🚀', '🥷', '🐻', '🦊', '🐼', '🦁', '🐸',
  '👻', '🤖', '👽', '🎃', '😎', '🤠', '🥸', '🧛', '🧙', '🧑‍🎤',
  '👩‍🔬', '👨‍🍳', '👩‍🚒', '👨‍✈️', '🧑‍⚕️', '💂', '🕵️', '👷', '👸', '🤴',
  '🦄', '🐶', '🐱', '🐯', '🐨', '🐰', '🦉', '🦋', '🐙', '🐵',
];

const PROFILE_COLORS = [
  '#e94560', '#f39c12', '#e67e22', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e84393', '#636e72', '#2d3436',
  '#c0392b', '#d35400', '#f1c40f', '#27ae60', '#16a085',
  '#2980b9', '#8e44ad', '#fd79a8', '#a29bfe', '#00cec9',
  '#6c5ce7', '#fdcb6e', '#e17055', '#0984e3', '#b2bec3',
];

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
  const [paymentNote, setPaymentNote] = useState('');
  const [originalRate, setOriginalRate] = useState('');
  const [ratePreFilled, setRatePreFilled] = useState(false);
  const [showIrregulars, setShowIrregulars] = useState(false);
  const [dismissedIrregulars, setDismissedIrregulars] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissedAlerts');
      return saved ? new Set(JSON.parse(saved)).has(id) : false;
    } catch { return false; }
  });
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const showToast = (msg: string, color = '#27ae60') => { setToast({ msg, color }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (confirmDeleteId) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => { document.body.style.overflow = ''; document.body.style.touchAction = ''; };
  }, [confirmDeleteId]);

  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editInt, setEditInt] = useState('');
  const [editDec, setEditDec] = useState('');
  const [editNote, setEditNote] = useState('');
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeOut, setSwipeOut] = useState(false);
  const addPaymentRef = useRef<HTMLDivElement>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [profileIcon, setProfileIcon] = useState(localStorage.getItem('profileIcon') || '👤');
  const [profileColor, setProfileColor] = useState(localStorage.getItem('profileColor') || '#3498db');
  const [showProfile, setShowProfile] = useState(false);
  const [tempProfileIcon, setTempProfileIcon] = useState(profileIcon);
  const [tempProfileColor, setTempProfileColor] = useState(profileColor);
  const [showAllProfileIcons, setShowAllProfileIcons] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeDirectionLocked = useRef<'horizontal' | 'vertical' | null>(null);

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
  const rateAmount = financing.fixedRateAmount || (financing.totalMonths > 0 ? financing.totalAmount / financing.totalMonths : 0);
  const ratesPaid = (rateAmount > 0 ? Math.floor(paid / rateAmount) : 0) + (financing.initialPaidRates || 0);
  const remainingMonths = financing.totalMonths - ratesPaid;
  const progressInterestPaid = financing.interestPerRate ? financing.interestPerRate * (financing.payments.length + (financing.initialPaidRates || 0)) : 0;
  const progressCapitalOnly = Math.max(paid - progressInterestPaid, 0);
  const progress = financing.totalAmount > 0 ? (progressCapitalOnly / financing.totalAmount) * 100 : 0;

  const isFixed = (financing.rateMode || 'variabile') === 'fissa' && rateAmount > 0;
  const fixedInt = isFixed ? Math.floor(rateAmount).toString() : '';
  const fixedDec = isFixed ? (Math.round((rateAmount - Math.floor(rateAmount)) * 100) || 0).toString() : '';
  const fixedOriginal = isFixed ? `${fixedInt}.${fixedDec}` : '';

  if (isFixed && !ratePreFilled && paymentInt === '' && paymentDec === '') {
    setPaymentInt(fixedInt);
    setPaymentDec(fixedDec !== '0' ? fixedDec : '');
    setOriginalRate(fixedOriginal);
    setRatePreFilled(true);
  }

  const currentRate = `${paymentInt || '0'}.${paymentDec || '0'}`;
  const isModified = isFixed && originalRate !== '' && currentRate !== originalRate;

  const addPayment = () => {
    const val = parseFloat(`${paymentInt || '0'}.${paymentDec || '0'}`);
    if (isNaN(val) || val <= 0) return;
    const payment: Payment = {
      id: crypto.randomUUID(),
      amount: val,
      date: new Date().toISOString(),
      ...(paymentNote ? { note: paymentNote } : {}),
    };
    onUpdate({
      ...financing,
      payments: [...financing.payments, payment],
    });
    setPaymentInt(isFixed ? fixedInt : '');
    setPaymentDec(isFixed && fixedDec !== '0' ? fixedDec : '');
    setPaymentNote('');
    showToast(`Rata di ${val.toFixed(2)} € aggiunta!`);
  };

  const deletePayment = (paymentId: string) => {
    const newPayments = financing.payments.filter((p) => p.id !== paymentId);
    onUpdate({
      ...financing,
      payments: newPayments,
    });
    // Clear dismissed irregularities since payments changed
    setDismissedIrregulars(false);
    try {
      const saved = localStorage.getItem('dismissedAlerts');
      const set = saved ? new Set(JSON.parse(saved)) : new Set();
      set.delete(id);
      localStorage.setItem('dismissedAlerts', JSON.stringify([...set]));
    } catch {}
    if (isFixed) {
      setShowIrregulars(true);
    }
  };

  const openEditPayment = (p: Payment) => {
    setEditingPayment(p.id);
    const d = new Date(p.date);
    setEditDate(d.toISOString().split('T')[0]);
    setEditInt(Math.floor(p.amount).toString());
    const dec = Math.round((p.amount - Math.floor(p.amount)) * 100);
    setEditDec(dec > 0 ? dec.toString() : '');
    setEditNote(p.note || '');
  };

  const saveEditPayment = () => {
    if (!editingPayment) return;
    const val = parseFloat(`${editInt || '0'}.${editDec || '0'}`);
    if (isNaN(val) || val <= 0) return;
    const editIsIrregular = isFixed && val !== rateAmount;
    onUpdate({
      ...financing,
      payments: financing.payments.map(p =>
        p.id === editingPayment
          ? { ...p, amount: val, date: new Date(editDate).toISOString(), ...(editIsIrregular && editNote ? { note: editNote } : { note: undefined }) }
          : p
      ),
    });
    setEditingPayment(null);
  };

  return (
    <>
    {(swiping || swipeOut) && (
      <div className="swipe-home-preview" style={{
        transform: swiping ? `translateX(${-100 + (swipeX / window.innerWidth) * 100}%)` : swipeOut ? 'translateX(0)' : 'translateX(-100%)',
        transition: swiping ? 'none' : 'transform 0.3s ease',
      }}>
        <nav className="navbar">
          <div className="navbar-left">
            <img src="/rate-logo.png" alt="Logo" className="navbar-logo-img" />
          </div>
          <div className="navbar-center">
            <h1>Rate & Pagamenti</h1>
            <p className="navbar-tagline">Tutto quello che devi pagare, qui.</p>
          </div>
          <button className="navbar-profile" style={{ background: profileColor }}>
            <span>{profileIcon}</span>
          </button>
        </nav>
      </div>
    )}
    <div
      className="page detail-page"
      style={{
        transform: swiping ? `translateX(${swipeX}px)` : swipeOut ? 'translateX(100%)' : 'translateX(0)',
        transition: swiping ? 'none' : 'transform 0.3s ease',
        boxShadow: swiping || swipeOut ? '-5px 0 20px rgba(0,0,0,0.2)' : 'none',
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        swipeDirectionLocked.current = null;
        setSwiping(false);
        setSwipeX(0);
      }}
      onTouchMove={(e) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const diffX = e.touches[0].clientX - touchStartX.current;
        const diffY = e.touches[0].clientY - touchStartY.current;
        if (!swipeDirectionLocked.current) {
          if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
            swipeDirectionLocked.current = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
            if (swipeDirectionLocked.current === 'horizontal' && diffX > 0) {
              setSwiping(true);
            }
          }
        }
        if (swipeDirectionLocked.current === 'horizontal' && diffX > 0) {
          e.preventDefault();
          setSwipeX(diffX);
        }
      }}
      onTouchEnd={() => {
        if (swipeX > 100) {
          setSwipeOut(true);
          setSwiping(false);
          setTimeout(() => navigate('/'), 300);
        } else {
          setSwiping(false);
          setSwipeX(0);
        }
        touchStartX.current = null;
        touchStartY.current = null;
        swipeDirectionLocked.current = null;
      }}
    >
      <div className="home-sticky-top">
        <nav className="navbar">
          <div className="navbar-left">
            <img src="/rate-logo.png" alt="Logo" className="navbar-logo-img" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
          </div>
          <div className="navbar-center">
            <h1 style={{ cursor: 'pointer' }} onClick={() => setShowSwitcher(!showSwitcher)}><span style={{ marginRight: '0.4rem', WebkitTextFillColor: 'initial', background: 'none', filter: 'none' }}>{financing.emoji}</span>{financing.name}</h1>
            <p className="navbar-tagline">FINANZIAMENTO</p>
          </div>
          <button className="navbar-profile" style={{ background: profileColor }} onClick={() => { setTempProfileIcon(profileIcon); setTempProfileColor(profileColor); setShowProfile(true); }}>
            <span>{profileIcon}</span>
          </button>
        </nav>
      </div>

      <div className="content">
        {/* RIEPILOGO */}
        <div className="card section-card" style={{ position: 'relative' }}>
          <button onClick={() => navigate('/')} style={{ position: 'absolute', right: '1rem', top: '0.75rem', background: 'white', border: '1.5px solid #333', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', zIndex: 1 }} title="Torna alla Home"><Home size={24} color="#333" /></button>
          <h3 className="section-heading" style={{ textAlign: 'left', fontSize: '1.15rem', marginTop: '0.5rem' }}>📊 RIEPILOGO</h3>
          <div className="summary-grid">
            <div className="summary-column">
              {(financing.rateMode || 'variabile') === 'fissa' && (() => {
                const totalPaidRates = financing.payments.reduce((sum, p) => sum + p.amount, 0);
                const expectedTotal = financing.payments.length * rateAmount;
                const balance = financing.payments.length === 0 ? 0 : totalPaidRates - expectedTotal;
                const isComplete = progress >= 100;
                const label = isComplete ? 'Concluso' : Math.abs(balance) < 0.01 ? 'Pareggio di bilancio' : balance > 0 ? 'Credito' : 'Debito';
                const color = isComplete ? '#00c853' : Math.abs(balance) < 0.01 ? '#1a7a42' : balance > 0 ? '#1a5276' : '#7b241c';
                return (
                  <div className="summary-box" style={{ borderColor: color }}>
                    <span className="summary-label">SITUAZIONE</span>
                    <span className="summary-value" style={{ color }}>{label}</span>
                    {Math.abs(balance) >= 0.01 && (
                      <span className="summary-value" style={{ color }}>{balance > 0 ? '+' : '-'}{Math.abs(balance).toFixed(2)} €</span>
                    )}
                  </div>
                );
              })()}
              <div className="summary-box" style={{ borderColor: '#333' }}>
                <span className="summary-label">RATE RIMANENTI</span>
                <span className="summary-value" style={{ color: '#333' }}>{Math.max(remainingMonths, 0)}</span>
              </div>
              {financing.interestPerRate != null && financing.interestPerRate > 0 && (
                <div className="summary-box" style={{ borderColor: '#1a5276' }}>
                  <span className="summary-label" style={{ color: '#1a5276' }}>INTERESSI X RATA</span>
                  <span className="summary-value" style={{ color: '#1a5276' }}>{financing.interestPerRate.toFixed(2)} €</span>
                </div>
              )}
              <div className="summary-box" style={{ borderColor: '#c0392b' }}>
                <span className="summary-label">TOTALE DA PAGARE (SENZA INTERESSI)</span>
                <span className="summary-value" style={{ color: '#c0392b' }}>{financing.totalAmount.toFixed(2)} €</span>
              </div>
              {(() => {
                const totalRatesPaidCount = financing.payments.length + (financing.initialPaidRates || 0);
                const interestPaid = financing.interestPerRate ? financing.interestPerRate * totalRatesPaidCount : 0;
                const capitalPaid = paid - interestPaid;
                return (
                  <>
                    <div className="summary-box" style={{ borderColor: '#27ae60' }}>
                      <span className="summary-label">PAGATO (NO INTERESSI)</span>
                      <span className="summary-value" style={{ color: '#27ae60' }}>{(capitalPaid > 0 ? capitalPaid : 0).toFixed(2)} €</span>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#d4a017' }}>
                      <span className="summary-label">RESTANTE SENZA INTERESSI</span>
                      <span className="summary-value" style={{ color: '#d4a017' }}>{Math.max(financing.totalAmount - (capitalPaid > 0 ? capitalPaid : 0), 0).toFixed(2)} €</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="summary-column">
              {(financing.rateMode || 'variabile') === 'fissa' && rateAmount > 0 && (
                <div className="summary-box" style={{ borderColor: '#8e44ad' }}>
                  <span className="summary-label">RATA FISSA</span>
                  <span className="summary-value" style={{ color: '#8e44ad' }}>{rateAmount.toFixed(2)} €</span>
                </div>
              )}
              <div className="summary-box" style={{ borderColor: '#666' }}>
                <span className="summary-label">RATE PAGATE</span>
                <span className="summary-value" style={{ color: '#666' }}>{ratesPaid}</span>
                <span className="summary-sub">su {financing.totalMonths} rate totali</span>
              </div>
              {isFixed && (() => {
                const interestPerRate = financing.interestPerRate ?? (financing.fixedRateAmount && financing.totalMonths > 0 ? (financing.fixedRateAmount * financing.totalMonths - financing.totalAmount) / financing.totalMonths : 0);
                if (!interestPerRate || interestPerRate < 0.01) return null;
                return (
                  <>
                    <div className="summary-box" style={{ borderColor: '#3498db' }}>
                      <span className="summary-label">INTERESSI PAGATI</span>
                      <span className="summary-value" style={{ color: '#3498db' }}>{(interestPerRate * (financing.payments.length + (financing.initialPaidRates || 0))).toFixed(2)} €</span>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#e74c3c' }}>
                      <span className="summary-label">TOTALE DA PAGARE CON INTERESSI</span>
                      <span className="summary-value" style={{ color: '#e74c3c' }}>{(financing.totalAmount + interestPerRate * financing.totalMonths).toFixed(2)} €</span>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#1abc9c' }}>
                      <span className="summary-label">TOTALE PAGATO CON INTERESSI</span>
                      <span className="summary-value" style={{ color: '#1abc9c' }}>{(paid > 0 ? paid : 0).toFixed(2)} €</span>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#f1c40f' }}>
                      <span className="summary-label">RESTANTE CON INTERESSI</span>
                      <span className="summary-value" style={{ color: '#f1c40f' }}>{(() => {
                        const totalRatesPaidR = financing.payments.length + (financing.initialPaidRates || 0);
                        const capitalRemaining = financing.totalAmount - (paid - interestPerRate * totalRatesPaidR > 0 ? paid - interestPerRate * totalRatesPaidR : 0);
                        const interestRemaining = interestPerRate * (financing.totalMonths - totalRatesPaidR);
                        return Math.max(capitalRemaining + interestRemaining, 0).toFixed(2);
                      })()} €</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="progress-section">
            <span className="progress-label">AVANZAMENTO</span>
            <span className="progress-percent">{progress.toFixed(1)}%</span>
          </div>
          {(() => {
            const totalRatesPaidProg = financing.payments.length + (financing.initialPaidRates || 0);
            const interestPaidProg = financing.interestPerRate ? financing.interestPerRate * totalRatesPaidProg : 0;
            const capitalPaidProg = paid - interestPaidProg;
            const progressCapital = financing.totalAmount > 0 ? (Math.max(capitalPaidProg, 0) / financing.totalAmount) * 100 : 0;
            const totalRates = financing.totalMonths || 0;
            return (
              <div className="progress-bar big progress-bar-ticks">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(progressCapital, 100)}%`, background: getProgressColor(progressCapital) }}
                />
                {totalRates > 1 && Array.from({ length: totalRates - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="progress-tick"
                    style={{ left: `${((i + 1) / totalRates) * 100}%` }}
                  />
                ))}
              </div>
            );
          })()}
        </div>

        {/* RATE IRREGOLARI */}
        {isFixed && (() => {
          const irregularPayments = financing.payments.filter(p => p.amount !== rateAmount);
          const totalPaidRates = financing.payments.reduce((sum, p) => sum + p.amount, 0);
          const expectedTotal = financing.payments.length * rateAmount;
          const balance = totalPaidRates - expectedTotal;
          const isBalanced = Math.abs(balance) < 0.01;
          // always show section
          return (
            <div className="card section-card">
              <h3 className="section-heading" onClick={() => setShowIrregulars(!showIrregulars)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                ⚠️ IRREGOLARITÀ <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{showIrregulars ? '▲' : '▼'}</span>
              </h3>
              {showIrregulars && (
                <>
                  {dismissedIrregulars || irregularPayments.length === 0 ? (
                    <>
                      <p style={{ textAlign: 'center', color: '#6b9e7d', fontStyle: 'italic', margin: '0.5rem 0' }}>Nessuna irregolarità</p>
                      <hr className="card-separator" />
                      <div className="short-pay-status-label">STATO ATTUALE</div>
                      <div className="short-pay-balance balance-zero" style={progress >= 100 ? { borderColor: '#00c853', color: '#00c853' } : {}}>
                        <span>{progress >= 100 ? 'Concluso' : 'Pareggio di bilancio'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {irregularPayments.map(p => {
                        const diff = p.amount - rateAmount;
                        const isOver = diff > 0;
                        return (
                          <div key={p.id} className={`short-pay-item ${isOver ? 'short-pay-over' : 'short-pay-under'}`}>
                            <div className="short-pay-row-info"><span>Data:</span><span>{new Date(p.date).toLocaleDateString('it-IT')}</span></div>
                            {p.note && <div className="short-pay-row-info"><span>Nota:</span><span className="text-note">{p.note}</span></div>}
                            <div className="short-pay-row-info"><span>Rata fissa:</span><span>{rateAmount.toFixed(2)} €</span></div>
                            <div className="short-pay-row-info"><span>Pagato:</span><span>{p.amount.toFixed(2)} €</span></div>
                            <div className="short-pay-row-info">
                              <span>{isOver ? 'Eccedenza:' : 'Mancante:'}</span>
                              <span className={isOver ? 'text-green' : 'text-red'}>{Math.abs(diff).toFixed(2)} €</span>
                            </div>
                          </div>
                        );
                      })}
                      <hr className="card-separator" />
                      <div className="short-pay-status-label">STATO ATTUALE</div>
                      <div className={`short-pay-balance ${isBalanced ? 'balance-zero' : balance > 0 ? 'balance-positive' : 'balance-negative'}`}>
                        <span>{isBalanced ? (progress >= 100 ? 'Concluso' : 'Pareggio di bilancio') : balance > 0 ? 'Credito:' : 'Debito rata:'}</span>
                        {!isBalanced && <span>{balance > 0 ? '+' : '-'}{Math.abs(balance).toFixed(2)} €</span>}
                      </div>
                      {!isBalanced && balance < 0 && (
                        <div className="next-rate-hint">
                          <span>Prossima rata per il pareggio: <strong>{(rateAmount + Math.abs(balance)).toFixed(2)} €</strong></span>
                          <button
                            className="next-rate-btn"
                            onClick={() => {
                              const suggestedAmount = rateAmount + Math.abs(balance);
                              const intPart = Math.floor(suggestedAmount).toString();
                              const decPart = Math.round((suggestedAmount - Math.floor(suggestedAmount)) * 100);
                              setPaymentInt(intPart);
                              setPaymentDec(decPart > 0 ? decPart.toString() : '');
                              setTimeout(() => addPaymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                            }}
                            title="Imposta rata di pareggio"
                          >
                            →
                          </button>
                        </div>
                      )}
                      {isBalanced && irregularPayments.length > 0 && (
                        <button
                          className="short-pay-delete-all"
                          onClick={() => {
                            setDismissedIrregulars(true);
                            try {
                              const saved = localStorage.getItem('dismissedAlerts');
                              const set = saved ? new Set(JSON.parse(saved)) : new Set();
                              set.add(id);
                              localStorage.setItem('dismissedAlerts', JSON.stringify([...set]));
                            } catch {}
                          }}
                        >
                          Elimina irregolarità
                          <span className="btn-hint">(Consigliato)</span>
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
              {!showIrregulars && (
                <>
                  <div className="short-pay-status-label">STATO ATTUALE</div>
                  {dismissedIrregulars || irregularPayments.length === 0 ? (
                    <div className="short-pay-balance balance-zero" style={progress >= 100 ? { borderColor: '#00c853', color: '#00c853' } : {}}>
                      <span>{progress >= 100 ? 'Concluso' : 'Pareggio di bilancio'}</span>
                    </div>
                  ) : (
                    <div className={`short-pay-balance ${isBalanced ? 'balance-zero' : balance > 0 ? 'balance-positive' : 'balance-negative'}`} style={isBalanced && progress >= 100 ? { borderColor: '#00c853', color: '#00c853' } : {}}>
                      <span>{isBalanced ? (progress >= 100 ? 'Concluso' : 'Pareggio di bilancio') : balance > 0 ? 'Credito:' : 'Debito rata:'}</span>
                      {!isBalanced && <span>{balance > 0 ? '+' : '-'}{Math.abs(balance).toFixed(2)} €</span>}
                    </div>
                  )}
                  {!isBalanced && balance < 0 && !dismissedIrregulars && (
                    <div className="next-rate-hint">
                      <span>Prossima rata per il pareggio: <strong>{(rateAmount + Math.abs(balance)).toFixed(2)} €</strong></span>
                      <button
                        className="next-rate-btn"
                        onClick={() => {
                          const suggestedAmount = rateAmount + Math.abs(balance);
                          const intPart = Math.floor(suggestedAmount).toString();
                          const decPart = Math.round((suggestedAmount - Math.floor(suggestedAmount)) * 100);
                          setPaymentInt(intPart);
                          setPaymentDec(decPart > 0 ? decPart.toString() : '');
                          setTimeout(() => addPaymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                        }}
                        title="Imposta rata di pareggio"
                      >
                        →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* AGGIUNGI PAGAMENTO */}
        <div className="card section-card" ref={addPaymentRef}>
          <h3 className="section-heading" style={{ textAlign: 'center' }}>💳 AGGIUNGI PAGAMENTO</h3>
          <div className="amount-row">
            {isFixed && isModified && (
              <button className="btn-refresh" onClick={() => {
                setPaymentInt(fixedInt);
                setPaymentDec(fixedDec !== '0' ? fixedDec : '');
                setPaymentNote('');
              }}>
                ↺
              </button>
            )}
            <input
              type="number"
              placeholder="Euro"
              value={paymentInt}
              onChange={(e) => setPaymentInt(e.target.value)}
              style={{ flex: 2 }}
            />
            <span className="amount-sep">,</span>
            <input
              type="number"
              placeholder="Cent"
              value={paymentDec}
              onChange={(e) => setPaymentDec(e.target.value.slice(0, 2))}
              style={{ flex: 1 }}
            />
            <span className="amount-currency">€</span>
            <button className="btn-primary btn-tick" onClick={addPayment}>
              ✓
            </button>
          </div>
          {(isModified || !isFixed) && (
            <input
              type="text"
              placeholder="Nota (opzionale)..."
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="quick-pay-note"
              style={{ marginTop: '0.5rem' }}
            />
          )}
        </div>

        {/* STORICO PAGAMENTI */}
        <div className="card section-card">
            <h3 className="section-heading" style={{ textAlign: 'center' }}>📋 STORICO PAGAMENTI</h3>
            {financing.payments.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b9e7d', fontStyle: 'italic' }}>Nessun pagamento registrato</p>
            ) : (
            <div className="payments-list">
              <div className="payment-header">
                <span className="payment-col-date">Data</span>
                <span className="payment-col-amount">Importo</span>
                <span className="payment-col-note">Note</span>
                <span className="payment-col-spacer"></span>
                <span className="payment-col-actions"></span>
              </div>
              {[...financing.payments].reverse().map((p) => (
                <div key={p.id}>
                  <div className={`payment-item ${expandedNote === p.id && p.note ? 'note-open' : ''}`}>
                    <span className="payment-col-date">{new Date(p.date).toLocaleDateString('it-IT')}</span>
                    <span className="payment-col-amount payment-amount">{p.amount.toFixed(2)} €</span>
                    <span className="payment-col-note">
                      {p.note && (
                        <button className="note-info-btn" onClick={() => setExpandedNote(expandedNote === p.id ? null : p.id)} title={p.note}>
                          i
                        </button>
                      )}
                    </span>
                    <span className="payment-col-spacer"></span>
                    <span className="payment-col-actions">
                      <button className="card-action-btn card-btn-edit" onClick={() => openEditPayment(p)} title="Modifica">✏️</button>
                      <button className="card-action-btn card-btn-delete" onClick={() => setConfirmDeleteId(p.id)} title="Elimina">🗑️</button>
                    </span>
                  </div>
                  {expandedNote === p.id && p.note && (
                    <div className="payment-note-expanded">{p.note}</div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>

        {/* ESPORTA EXCEL */}
        <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
          <button
            className="btn-excel"
            onClick={() => {
              const wb = XLSX.utils.book_new();
              const totalRatesPaidX = financing.payments.length + (financing.initialPaidRates || 0);
              const interestPerRateX = financing.interestPerRate ?? 0;
              const interestPaidX = interestPerRateX * totalRatesPaidX;
              const capitalPaidX = Math.max(paid - interestPaidX, 0);

              // --- Foglio 1: Riepilogo ---
              const riepilogo = [];
              riepilogo.push(['DATI FINANZIAMENTO', '']);
              riepilogo.push(['Campo', 'Valore']);
              riepilogo.push(['Nome', financing.name]);
              riepilogo.push(['Totale da pagare', financing.totalAmount.toFixed(2) + ' €']);
              riepilogo.push(['Rate totali', financing.totalMonths]);
              riepilogo.push(['Tipo rata', financing.rateType.charAt(0).toUpperCase() + financing.rateType.slice(1)]);
              riepilogo.push(['Modalita rata', financing.rateMode.charAt(0).toUpperCase() + financing.rateMode.slice(1)]);
              riepilogo.push(['Data inizio', financing.startDate ? new Date(financing.startDate).toLocaleDateString('it-IT') : '-']);
              riepilogo.push(['Data fine', financing.endDate ? new Date(financing.endDate).toLocaleDateString('it-IT') : '-']);
              if (rateAmount > 0) riepilogo.push(['Importo rata', rateAmount.toFixed(2) + ' €']);
              if (interestPerRateX > 0) riepilogo.push(['Interessi per rata', interestPerRateX.toFixed(2) + ' €']);
              riepilogo.push(['', '']);
              riepilogo.push(['SITUAZIONE PAGAMENTI', '']);
              riepilogo.push(['Campo', 'Valore']);
              riepilogo.push(['Pagato (capitale)', capitalPaidX.toFixed(2) + ' €']);
              riepilogo.push(['Interessi pagati', interestPaidX.toFixed(2) + ' €']);
              riepilogo.push(['Totale versato', paid.toFixed(2) + ' €']);
              riepilogo.push(['Restante', Math.max(financing.totalAmount - paid, 0).toFixed(2) + ' €']);
              riepilogo.push(['', '']);
              riepilogo.push(['AVANZAMENTO RATE', '']);
              riepilogo.push(['Campo', 'Valore']);
              riepilogo.push(['Rate pagate', totalRatesPaidX]);
              riepilogo.push(['Rate rimanenti', Math.max(financing.totalMonths - totalRatesPaidX, 0)]);
              riepilogo.push(['Avanzamento', totalRatesPaidX + ' / ' + financing.totalMonths]);

              const wsRiepilogo = XLSX.utils.aoa_to_sheet(riepilogo);
              wsRiepilogo['!cols'] = [{ wch: 24 }, { wch: 22 }];
              XLSX.utils.book_append_sheet(wb, wsRiepilogo, 'Riepilogo');

              // --- Foglio 2: Storico pagamenti ---
              const payments = [...financing.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              const hasInterest = interestPerRateX > 0;
              const storico = [];
              if (hasInterest) {
                storico.push(['N.', 'Data', 'Importo totale', 'Capitale', 'Interessi', 'Note']);
                payments.forEach((p, i) => {
                  const cap = Math.max(p.amount - interestPerRateX, 0);
                  storico.push([i + 1, new Date(p.date).toLocaleDateString('it-IT'), p.amount.toFixed(2) + ' €', cap.toFixed(2) + ' €', interestPerRateX.toFixed(2) + ' €', p.note || '']);
                });
                storico.push([]);
                storico.push(['', 'TOTALE', payments.reduce((s, p) => s + p.amount, 0).toFixed(2) + ' €', capitalPaidX.toFixed(2) + ' €', interestPaidX.toFixed(2) + ' €', '']);
              } else {
                storico.push(['N.', 'Data', 'Importo', 'Note']);
                payments.forEach((p, i) => {
                  storico.push([i + 1, new Date(p.date).toLocaleDateString('it-IT'), p.amount.toFixed(2) + ' €', p.note || '']);
                });
                storico.push([]);
                storico.push(['', 'TOTALE', payments.reduce((s, p) => s + p.amount, 0).toFixed(2) + ' €', '']);
              }
              const wsStorico = XLSX.utils.aoa_to_sheet(storico);
              wsStorico['!cols'] = hasInterest
                ? [{ wch: 5 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 28 }]
                : [{ wch: 5 }, { wch: 14 }, { wch: 16 }, { wch: 28 }];
              XLSX.utils.book_append_sheet(wb, wsStorico, 'Storico Pagamenti');

              XLSX.writeFile(wb, financing.name + '_finanziamento.xlsx');
            }}
          >
            <span className="btn-excel-icon">X</span> Esporta in Excel
          </button>
        </div>
      </div>

      {editingPayment && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={() => setEditingPayment(null)}>
          <div className="modal" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Modifica pagamento</h2>
            <p className="modal-field-label">Data</p>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="modal-input"
            />
            <p className="modal-field-label">Importo</p>
            <div className="amount-row">
              {isFixed && parseFloat(`${editInt || '0'}.${editDec || '0'}`) !== rateAmount && (
                <button className="btn-refresh" onClick={() => {
                  setEditInt(fixedInt);
                  setEditDec(fixedDec !== '0' ? fixedDec : '');
                  setEditNote('');
                }}>
                  ↺
                </button>
              )}
              <input
                type="number"
                placeholder="Euro"
                value={editInt}
                onChange={(e) => setEditInt(e.target.value)}
                style={{ flex: 2 }}
              />
              <span className="amount-sep">,</span>
              <input
                type="number"
                placeholder="Cent"
                value={editDec}
                onChange={(e) => setEditDec(e.target.value.slice(0, 2))}
                style={{ flex: 1 }}
              />
              <span className="amount-currency">€</span>
            </div>
            {((isFixed && parseFloat(`${editInt || '0'}.${editDec || '0'}`) !== rateAmount) || !isFixed) && (
              <>
                <p className="modal-field-label">Nota</p>
                <input
                  type="text"
                  placeholder="Nota (opzionale)..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="modal-input"
                />
              </>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingPayment(null)}>Annulla</button>
              <button className="btn-primary" onClick={saveEditPayment}>Salva</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showSwitcher && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => setShowSwitcher(false)}>
          <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', minWidth: '220px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            {financings.filter(f => f.id !== id).sort((a, b) => a.name.localeCompare(b.name)).map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #eee', flex: 1 }}
                onClick={() => { setShowSwitcher(false); navigate(`/detail/${f.id}`); }}>
                <span style={{ fontSize: '1.3rem' }}>{f.emoji}</span>
                <span style={{ fontWeight: 600, color: '#2d5a3d', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', flex: 1 }}>{f.name.charAt(0).toUpperCase() + f.name.slice(1)} <span style={{ color: (f.rateMode || 'variabile') === 'fissa' ? '#8e44ad' : '#e91e8a', fontWeight: 400, fontSize: '0.8rem' }}>({(f.rateMode || 'variabile') === 'fissa' ? 'Fissa' : 'Variabile'})</span></span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {confirmDeleteId && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, touchAction: 'none', overscrollBehavior: 'contain' }} onClick={() => setConfirmDeleteId(null)} onTouchMove={(e) => e.preventDefault()}>
          <div className="modal" style={{ maxWidth: '320px' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Conferma eliminazione</h2>
            <p style={{ textAlign: 'center', color: '#666', margin: '1rem 0' }}>
              Vuoi eliminare il pagamento di <strong>{financing.payments.find(p => p.id === confirmDeleteId)?.amount.toFixed(2)} €</strong> in data <strong>{financing.payments.find(p => p.id === confirmDeleteId) ? new Date(financing.payments.find(p => p.id === confirmDeleteId)!.date).toLocaleDateString('it-IT') : ''}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>Annulla</button>
              <button className="btn-primary" style={{ background: '#c0392b' }} onClick={() => { const p = financing.payments.find(p => p.id === confirmDeleteId); deletePayment(confirmDeleteId); setConfirmDeleteId(null); showToast(`Pagamento di ${p?.amount.toFixed(2)} € eliminato!`, '#c0392b'); }}>Elimina</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
    {toast && (
      <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>
    )}
    {showProfile && (
      <div className="modal-overlay" onClick={() => { setProfileIcon(tempProfileIcon); setProfileColor(tempProfileColor); setShowProfile(false); }}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-modal-header">
            <h2>Il tuo profilo</h2>
            <button className="profile-modal-close" onClick={() => { setProfileIcon(tempProfileIcon); setProfileColor(tempProfileColor); setShowProfile(false); }}>&times;</button>
          </div>
          <div className="profile-modal-content">
            <div className="profile-preview" style={{ background: profileColor }}>
              <span>{profileIcon}</span>
            </div>
            <h3 className="profile-section-title">Scegli icona</h3>
            <div className="profile-grid">
              {(() => {
                const COLS = 5;
                const VISIBLE_ROWS = 3;
                const visibleCount = COLS * VISIBLE_ROWS;
                const icons = showAllProfileIcons
                  ? PROFILE_ICONS
                  : (() => {
                      const idx = PROFILE_ICONS.indexOf(profileIcon);
                      if (idx < visibleCount) return PROFILE_ICONS.slice(0, visibleCount);
                      const reordered = [profileIcon, ...PROFILE_ICONS.filter((i) => i !== profileIcon)];
                      return reordered.slice(0, visibleCount);
                    })();
                return icons.map((icon) => (
                  <button
                    key={icon}
                    className={`profile-grid-btn ${profileIcon === icon ? 'active' : ''}`}
                    onClick={() => setProfileIcon(icon)}
                  >
                    {icon}
                  </button>
                ));
              })()}
            </div>
            <button className="profile-show-more" onClick={() => setShowAllProfileIcons(!showAllProfileIcons)}>
              {showAllProfileIcons ? 'Mostra meno' : 'Mostra di più'}
            </button>
            <h3 className="profile-section-title">Colore sfondo</h3>
            <div className="profile-colors">
              {PROFILE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`profile-color-btn ${profileColor === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setProfileColor(color)}
                />
              ))}
            </div>
          </div>
          <div className="profile-modal-actions">
            <button className="profile-btn-back" onClick={() => { setProfileIcon(tempProfileIcon); setProfileColor(tempProfileColor); setShowProfile(false); }}>Indietro</button>
            <button className="profile-btn-save" onClick={() => { localStorage.setItem('profileIcon', profileIcon); localStorage.setItem('profileColor', profileColor); setShowProfile(false); }}>Salva</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
