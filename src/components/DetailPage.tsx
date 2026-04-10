import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Home } from 'lucide-react';
import { AppsListDetail24Regular } from '@fluentui/react-icons';
import type { Financing, Payment } from '../types';
import ProfileMenu from './ProfileMenu';

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
  const todayStr = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };
  const [paymentDate, setPaymentDate] = useState(todayStr);
  // Tracks the last auto-assigned date so we can detect manual user edits
  const lastAutoDateRef = useRef(paymentDate);
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
  const editOriginal = useRef<{ date: string; int: string; dec: string; note: string } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [swipeOut, setSwipeOut] = useState(false);
  const addPaymentRef = useRef<HTMLDivElement>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [profileIcon, setProfileIcon] = useState(localStorage.getItem('profileIcon') || '👤');
  const [profileColor, setProfileColor] = useState(localStorage.getItem('profileColor') || '#3498db');
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const tempProfileIcon = profileIcon;
  const tempProfileColor = profileColor;
  const [showAllProfileIcons, setShowAllProfileIcons] = useState(false);
  const [showInterestTip, setShowInterestTip] = useState<string | null>(null);

  useEffect(() => {
    if (!showInterestTip) return;
    const close = () => setShowInterestTip(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [showInterestTip]);

  // Keep paymentDate in sync with "today" until the user manually edits it.
  // Triggers on focus, tab visibility change, and once a minute as fallback.
  useEffect(() => {
    const tick = () => {
      const today = todayStr();
      setPaymentDate((current) => {
        if (current === lastAutoDateRef.current && current !== today) {
          lastAutoDateRef.current = today;
          return today;
        }
        return current;
      });
    };
    const interval = window.setInterval(tick, 60000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

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

  const fmtEuro = (v: number) => v <= 0.004 ? '- €' : `${v.toFixed(2)} €`;

  const paymentsPaid = financing.payments.reduce((s, p) => s + p.amount, 0);
  const paid = paymentsPaid + (financing.initialPaid || 0);
  const rateAmount = financing.fixedRateAmount || (financing.totalMonths > 0 ? financing.totalAmount / financing.totalMonths : 0);
  const isFixed = (financing.rateMode || 'variabile') === 'fissa' && rateAmount > 0;

  // Per rata fissa: un pagamento multiplo della rata conta come N rate. Per variabile: ogni pagamento = 1 rata.
  const countEffectiveRates = (p: Payment) => {
    if (!isFixed || rateAmount <= 0) return 1;
    const ratio = p.amount / rateAmount;
    const rounded = Math.round(ratio);
    if (rounded >= 1 && Math.abs(p.amount - rounded * rateAmount) < 0.01) return rounded;
    return 1;
  };

  const maxRatesFromPayments = financing.totalMonths - (financing.initialPaidRates || 0);
  const { effectiveRates: effectiveRatesFromPayments, excessCredit, cappedPayments } = (() => {
    if (!isFixed || rateAmount <= 0) return { effectiveRates: financing.payments.length, excessCredit: 0, cappedPayments: [] as { payment: Payment, ratesUsed: number, accDebt: number }[] };
    let cumulative = 0;
    let credit = 0;
    let runningDebt = 0;
    const capped: { payment: Payment, ratesUsed: number, accDebt: number }[] = [];
    for (const p of financing.payments) {
      const ratio = p.amount / rateAmount;
      const rounded = Math.round(ratio);
      const isMultiple = rounded >= 1 && Math.abs(p.amount - rounded * rateAmount) < 0.01;
      if (isMultiple) {
        const canAdd = Math.max(maxRatesFromPayments - cumulative, 0);
        const actual = Math.min(rounded, canAdd);
        cumulative += actual;
        if (rounded > actual) {
          credit += (rounded - actual) * rateAmount;
          capped.push({ payment: p, ratesUsed: actual, accDebt: runningDebt });
        }
      } else {
        cumulative += 1;
        const diff = rateAmount - p.amount;
        if (diff > 0.01) runningDebt += diff;
      }
    }
    return { effectiveRates: cumulative, excessCredit: credit, cappedPayments: capped };
  })();
  const totalPaymentsCount = effectiveRatesFromPayments + (financing.initialPaidRates || 0);
  const maxReached = financing.totalMonths > 0 && totalPaymentsCount >= financing.totalMonths;

  const ratesPaid = totalPaymentsCount;
  const remainingMonths = financing.totalMonths - ratesPaid;
  // Per rata fissa: sottrai interessi dal progresso. Per variabile: progresso diretto su pagato/totale
  const progressInterestPaid = isFixed && financing.interestPerRate ? financing.interestPerRate * totalPaymentsCount : 0;
  const progressCapitalOnly = Math.max(paid - progressInterestPaid, 0);
  const progress = financing.totalAmount > 0 ? (Math.min(progressCapitalOnly, financing.totalAmount) / financing.totalAmount) * 100 : 0;

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

  // Un pagamento è irregolare solo se NON è un multiplo della rata fissa
  const isIrregularPayment = (p: Payment) => {
    if (!isFixed || rateAmount <= 0) return true;
    const ratio = p.amount / rateAmount;
    const rounded = Math.round(ratio);
    return !(rounded >= 1 && Math.abs(p.amount - rounded * rateAmount) < 0.01);
  };

  // Credito: eccedenza da pagamenti multipli che superano il cap + eventuale eccedenza rispetto al totale con interessi
  const totalePagatoAll = financing.payments.reduce((s, p) => s + p.amount, 0);
  // Debito: pagato meno del dovuto in base alle rate effettive (cappate)
  const totaleDovutoAll = rateAmount > 0 ? rateAmount * effectiveRatesFromPayments : 0;
  const debtAmount = totalePagatoAll - excessCredit - totaleDovutoAll;

  const addPayment = () => {
    if (maxReached) return;
    const val = parseFloat(`${paymentInt || '0'}.${paymentDec || '0'}`);
    if (isNaN(val) || val <= 0) return;
    let isoDate: string;
    if (paymentDate) {
      const [yy, mm, dd] = paymentDate.split('-').map(Number);
      const now = new Date();
      isoDate = new Date(yy, (mm || 1) - 1, dd || 1, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
    } else {
      isoDate = new Date().toISOString();
    }
    const payment: Payment = {
      id: crypto.randomUUID(),
      amount: val,
      date: isoDate,
      ...(paymentNote ? { note: paymentNote } : {}),
    };
    onUpdate({
      ...financing,
      payments: [...financing.payments, payment],
    });
    setPaymentInt(isFixed ? fixedInt : '');
    setPaymentDec(isFixed && fixedDec !== '0' ? fixedDec : '');
    setPaymentNote('');
    const today = todayStr();
    setPaymentDate(today);
    lastAutoDateRef.current = today;
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
    } catch { /* ignore */ }
    if (isFixed) {
      setShowIrregulars(true);
    }
  };

  const openEditPayment = (p: Payment) => {
    setEditingPayment(p.id);
    const d = new Date(p.date);
    const dateStr = d.toISOString().split('T')[0];
    const intStr = Math.floor(p.amount).toString();
    const dec = Math.round((p.amount - Math.floor(p.amount)) * 100);
    const decStr = dec > 0 ? dec.toString() : '';
    const noteStr = p.note || '';
    setEditDate(dateStr);
    setEditInt(intStr);
    setEditDec(decStr);
    setEditNote(noteStr);
    editOriginal.current = { date: dateStr, int: intStr, dec: decStr, note: noteStr };
  };

  const editHasChanges = editingPayment !== null && editOriginal.current !== null && (
    editDate !== editOriginal.current.date ||
    editInt !== editOriginal.current.int ||
    editDec !== editOriginal.current.dec ||
    editNote !== editOriginal.current.note
  );

  // Lock body scroll while the edit-payment modal is open
  useEffect(() => {
    if (!editingPayment) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [editingPayment]);

  // Close the financing switcher dropdown on any scroll outside it
  useEffect(() => {
    if (!showSwitcher) return;
    const handler = () => setShowSwitcher(false);
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [showSwitcher]);

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
          <button className="navbar-profile" style={{ background: profileColor }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <span>{profileIcon}</span>
          </button>
        </nav>
        {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} />}
        <div className="detail-riepilogo-bar-wrap" style={{ background: 'var(--theme-bg-sticky, #d0e8d2)', padding: '0.5rem 1rem 0.5rem' }}>
          <div className="detail-riepilogo-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--theme-bg-card, white)', borderRadius: '1rem', padding: '0.6rem 1rem', boxShadow: 'var(--theme-card-shadow, 0 2px 8px rgba(0,0,0,0.08))' }}>
            <span className="riepilogo-icon-box" onClick={() => navigate('/')} style={{ position: 'relative', width: 36, height: 36, display: 'inline-flex', flexShrink: 0, borderRadius: '0.45rem', cursor: 'pointer' }}>
              <AppsListDetail24Regular style={{ fontSize: 20, color: '#2ecc71', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', clipPath: 'inset(0 0 50% 0)' }} />
              <AppsListDetail24Regular style={{ fontSize: 20, color: '#e74c3c', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', clipPath: 'inset(50% 0 0 0)' }} />
            </span>
            <h3 className="section-heading riepilogo-title" style={{ textAlign: 'center', fontSize: '1.15rem', margin: 0, flex: 1 }}>RIEPILOGO</h3>
            <button onClick={() => navigate('/')} style={{ background: 'white', border: '1.5px solid #333', borderRadius: '0.5rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 39, height: 39, flexShrink: 0, boxSizing: 'border-box' }} title="Torna alla Home"><Home size={24} color="#333" /></button>
          </div>
        </div>
        <div className="sticky-bar" style={{ padding: 0, height: '1px' }} />
      </div>
      <div className="content" style={{ paddingTop: '0.5rem' }}>
        {/* RIEPILOGO */}
        <div className="card section-card" style={{ position: 'relative' }}>
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Dati Finanziamento</h3>
          <hr className="card-separator" />
          <div className="summary-grid">
            <div className="summary-column">
              {(financing.rateMode || 'variabile') === 'fissa' && (() => {
                const netBal = debtAmount + excessCredit;
                const isComplete = maxReached && netBal >= -0.01;
                const label = isComplete ? (netBal > 0.01 ? 'Concluso' : 'Concluso') : Math.abs(netBal) < 0.01 ? 'Pareggio di bilancio' : netBal > 0 ? 'Credito' : 'Debito';
                const color = isComplete ? '#00c853' : Math.abs(netBal) < 0.01 ? '#1a7a42' : netBal > 0 ? '#1a5276' : '#7b241c';
                return (
                  <div className="summary-box" style={{ borderColor: color, color, position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'situazione' ? null : 'situazione')}>
                    <span className="summary-label">SITUAZIONE</span>
                    <span className="summary-value" style={{ color }}>{label}</span>
                    {Math.abs(netBal) >= 0.01 && (
                      <span className="summary-value" style={{ color, fontSize: '0.65rem', fontWeight: 'normal' }}>({netBal > 0 ? 'Credito' : 'Debito'}: {netBal > 0 ? '+' : '-'}{Math.abs(netBal).toFixed(2)} €)</span>
                    )}
                    <div className={`tip-bubble-right ${showInterestTip === 'situazione' ? 'tip-visible' : ''}`}>
                      Stato attuale del finanziamento in base alle rate pagate e ai pagamenti effettuati
                      <div className="tip-arrow-left" />
                    </div>
                  </div>
                );
              })()}
              <div className="summary-box" style={{ borderColor: '#333', color: '#333', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'rimanenti' ? null : 'rimanenti')}>
                <span className="summary-label">RATE RIMANENTI</span>
                <span className="summary-value" style={{ color: '#333' }}>{Math.max(remainingMonths, 0)}</span>
                <div className={`tip-bubble-right ${showInterestTip === 'rimanenti' ? 'tip-visible' : ''}`}>
                  Formula: Rate totali − Rate pagate
                  <div className="tip-arrow-left" />
                </div>
              </div>
              {financing.interestPerRate != null && financing.interestPerRate > 0 && (
                <div className="summary-box" style={{ borderColor: '#1a5276', color: '#1a5276', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'intxrata' ? null : 'intxrata')}>
                  <span className="summary-label">INTERESSI X RATA</span>
                  <span className="summary-value" style={{ color: '#1a5276' }}>{financing.interestPerRate.toFixed(2)} €</span>
                  <div className={`tip-bubble-right ${showInterestTip === 'intxrata' ? 'tip-visible' : ''}`}>
                    Formula: (Rata fissa × N° rate − Importo totale) ÷ N° rate
                    <div className="tip-arrow-left" />
                  </div>
                </div>
              )}
              {isFixed ? (
                <>
                  <div className="summary-box" style={{ borderColor: '#c0392b', color: '#c0392b', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'totdapagare' ? null : 'totdapagare')}>
                    <span className="summary-label">TOTALE DA PAGARE <br /><span style={{ color: '#3498db' }}>(SENZA INTERESSI)</span></span>
                    <span className="summary-value" style={{ color: '#c0392b' }}>{financing.totalAmount.toFixed(2)} €</span>
                    <div className={`tip-bubble-right ${showInterestTip === 'totdapagare' ? 'tip-visible' : ''}`}>
                      Importo totale del finanziamento senza gli interessi
                      <div className="tip-arrow-left" />
                    </div>
                  </div>
                  {(() => {
                    const totalRatesPaidCount = financing.payments.length + (financing.initialPaidRates || 0);
                    const interestPaid = financing.interestPerRate ? financing.interestPerRate * totalRatesPaidCount : 0;
                    const capitalPaid = paid - interestPaid;
                    return (
                      <>
                        <div className="summary-box" style={{ borderColor: '#27ae60', color: '#27ae60', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'pagatosi' ? null : 'pagatosi')}>
                          <span className="summary-label">PAGATO <br /><span style={{ color: '#3498db' }}>(SENZA INTERESSI)</span></span>
                          <span className="summary-value" style={{ color: '#27ae60' }}>{fmtEuro(capitalPaid > 0 ? capitalPaid : 0)}</span>
                          <div className={`tip-bubble-right ${showInterestTip === 'pagatosi' ? 'tip-visible' : ''}`}>
                            Formula: Totale versato − (Interessi x rata × Rate pagate)
                            <div className="tip-arrow-left" />
                          </div>
                        </div>
                        <div className="summary-box" style={{ borderColor: '#d4a017', color: '#d4a017', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'restantesi' ? null : 'restantesi')}>
                          <span className="summary-label">RESTANTE <br /><span style={{ color: '#3498db' }}>(SENZA INTERESSI)</span></span>
                          <span className="summary-value" style={{ color: '#d4a017' }}>{fmtEuro(Math.max(financing.totalAmount - (capitalPaid > 0 ? capitalPaid : 0), 0))}</span>
                          <div className={`tip-bubble-right ${showInterestTip === 'restantesi' ? 'tip-visible' : ''}`}>
                            Formula: Da pagare (senza interessi) − Pagato (senza interessi)
                            <div className="tip-arrow-left" />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="summary-box" style={{ borderColor: '#c0392b', color: '#c0392b', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'dapagare' ? null : 'dapagare')}>
                    <span className="summary-label">DA PAGARE</span>
                    <span className="summary-value" style={{ color: '#c0392b' }}>{financing.totalAmount.toFixed(2)} €</span>
                    <div className={`tip-bubble-right ${showInterestTip === 'dapagare' ? 'tip-visible' : ''}`}>
                      Importo totale del finanziamento (senza interessi)
                      <div className="tip-arrow-left" />
                    </div>
                  </div>
                  <div className="summary-box" style={{ borderColor: '#27ae60', color: '#27ae60', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'pagato' ? null : 'pagato')}>
                    <span className="summary-label">PAGATO</span>
                    <span className="summary-value" style={{ color: '#27ae60' }}>{fmtEuro(paid > 0 ? paid : 0)}</span>
                    <div className={`tip-bubble-right ${showInterestTip === 'pagato' ? 'tip-visible' : ''}`}>
                      Somma di tutti i pagamenti effettuati (compresi eventuali interessi)
                      <div className="tip-arrow-left" />
                    </div>
                  </div>
                  <div className="summary-box" style={{ borderColor: '#d4a017', color: '#d4a017', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'restante' ? null : 'restante')}>
                    <span className="summary-label">RESTANTE</span>
                    <span className="summary-value" style={{ color: '#d4a017' }}>{fmtEuro(Math.max(financing.totalAmount - paid, 0))}</span>
                    <div className={`tip-bubble-right ${showInterestTip === 'restante' ? 'tip-visible' : ''}`}>
                      Formula: Da pagare − Pagato
                      <div className="tip-arrow-left" />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="summary-column">
              {(financing.rateMode || 'variabile') === 'fissa' && rateAmount > 0 && (
                <div className="summary-box" style={{ borderColor: '#8e44ad', color: '#8e44ad', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'ratafissa' ? null : 'ratafissa')}>
                  <span className="summary-label">RATA FISSA</span>
                  <span className="summary-value" style={{ color: '#8e44ad' }}>{rateAmount.toFixed(2)} €</span>
                  <div className={`tip-bubble ${showInterestTip === 'ratafissa' ? 'tip-visible' : ''}`}>
                    Importo fisso di ogni singola rata (comprensivo di interessi)
                    <div className="tip-arrow" />
                  </div>
                </div>
              )}
              <div className="summary-box" style={{ borderColor: '#666', color: '#666', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'pagate' ? null : 'pagate')}>
                <span className="summary-label">RATE PAGATE</span>
                <span className="summary-value" style={{ color: '#666' }}>{ratesPaid}</span>
                <span className="summary-sub">su {financing.totalMonths} rate totali</span>
                <div className={`tip-bubble ${showInterestTip === 'pagate' ? 'tip-visible' : ''}`}>
                  Numero di pagamenti effettuati nello storico
                  <div className="tip-arrow" />
                </div>
              </div>
              {!isFixed && (() => {
                const totalRatesPaidVar = financing.payments.length + (financing.initialPaidRates || 0);
                const avgRate = totalRatesPaidVar > 0 ? paid / totalRatesPaidVar : 0;
                const interessiPagati = Math.max(paid - financing.totalAmount, 0);
                const avgInterest = totalRatesPaidVar > 0 ? interessiPagati / totalRatesPaidVar : 0;
                return (
                  <>
                    <div className="summary-box" style={{ borderColor: '#8e44ad', color: '#8e44ad', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'media' ? null : 'media')}>
                      <span className="summary-label">RATA MEDIA</span>
                      <span className="summary-value" style={{ color: '#8e44ad' }}>{fmtEuro(avgRate)}</span>
                      <div className={`tip-bubble ${showInterestTip === 'media' ? 'tip-visible' : ''}`}>
                        {totalRatesPaidVar > 0 ? 'Formula: Totale pagato ÷ Numero rate pagate' : <><span>Calcolato dopo almeno una rata pagata</span><br /><span style={{ opacity: 0.7 }}>Formula: Totale pagato ÷ Numero rate pagate</span></>}
                        <div className="tip-arrow" />
                      </div>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#3498db', color: '#3498db', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'interessi' ? null : 'interessi')}>
                      <span className="summary-label">INTERESSI PAGATI</span>
                      <span className="summary-value" style={{ color: '#3498db' }}>{maxReached && interessiPagati > 0.004 ? interessiPagati.toFixed(2) + ' €' : '- €'}</span>
                      <div className={`tip-bubble ${showInterestTip === 'interessi' ? 'tip-visible' : ''}`}>
                        {maxReached ? 'Formula: Pagato − Da pagare' : <><span>Calcolati dopo il pagamento di tutte le rate</span><br /><span style={{ opacity: 0.7 }}>Formula: Pagato − Da pagare</span></>}
                        <div className="tip-arrow" />
                      </div>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#1a5276', color: '#1a5276', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'medio' ? null : 'medio')}>
                      <span className="summary-label">INTERESSE MEDIO X RATA</span>
                      <span className="summary-value" style={{ color: '#1a5276' }}>{totalRatesPaidVar > 0 && avgInterest > 0.004 ? avgInterest.toFixed(2) + ' €' : '- €'}</span>
                      <div className={`tip-bubble ${showInterestTip === 'medio' ? 'tip-visible' : ''}`}>
                        {totalRatesPaidVar > 0 ? <><span>Calcolati dopo il pagamento di tutte le rate</span><br /><span style={{ opacity: 0.7 }}>Formula: Interessi pagati ÷ Numero rate pagate</span></> : <><span>Calcolato dopo almeno una rata pagata</span><br /><span style={{ opacity: 0.7 }}>Formula: Interessi pagati ÷ Numero rate pagate</span></>}
                        <div className="tip-arrow" />
                      </div>
                    </div>
                  </>
                );
              })()}
              {isFixed && (() => {
                const interestPerRate = financing.interestPerRate ?? (financing.fixedRateAmount && financing.totalMonths > 0 ? (financing.fixedRateAmount * financing.totalMonths - financing.totalAmount) / financing.totalMonths : 0);
                if (!interestPerRate || interestPerRate < 0.01) return null;
                return (
                  <>
                    <div className="summary-box" style={{ borderColor: '#3498db', color: '#3498db', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'intpagati_f' ? null : 'intpagati_f')}>
                      <span className="summary-label">INTERESSI PAGATI</span>
                      <span className="summary-value" style={{ color: '#3498db' }}>{fmtEuro(interestPerRate * (financing.payments.length + (financing.initialPaidRates || 0)))}</span>
                      <div className={`tip-bubble ${showInterestTip === 'intpagati_f' ? 'tip-visible' : ''}`}>
                        Formula: Interessi x rata × Rate pagate
                        <div className="tip-arrow" />
                      </div>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#e74c3c', color: '#e74c3c', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'totdapagare_ci' ? null : 'totdapagare_ci')}>
                      <span className="summary-label">TOTALE DA PAGARE<br /><span style={{ color: '#3498db' }}>(CON INTERESSI)</span></span>
                      <span className="summary-value" style={{ color: '#e74c3c' }}>{(financing.totalAmount + interestPerRate * financing.totalMonths).toFixed(2)} €</span>
                      <div className={`tip-bubble ${showInterestTip === 'totdapagare_ci' ? 'tip-visible' : ''}`}>
                        Formula: Importo totale + (Interessi x rata × N° rate)
                        <div className="tip-arrow" />
                      </div>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#1abc9c', color: '#1abc9c', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'totpagato_ci' ? null : 'totpagato_ci')}>
                      <span className="summary-label">TOTALE PAGATO<br /><span style={{ color: '#3498db' }}>(CON INTERESSI)</span></span>
                      <span className="summary-value" style={{ color: '#1abc9c' }}>{fmtEuro(paid > 0 ? paid : 0)}</span>
                      <div className={`tip-bubble ${showInterestTip === 'totpagato_ci' ? 'tip-visible' : ''}`}>
                        Somma di tutti i versamenti effettuati (capitale + interessi)
                        <div className="tip-arrow" />
                      </div>
                    </div>
                    <div className="summary-box" style={{ borderColor: '#f1c40f', color: '#f1c40f', position: 'relative', overflow: 'visible', cursor: 'pointer' }} onClick={() => setShowInterestTip(showInterestTip === 'restante_ci' ? null : 'restante_ci')}>
                      <span className="summary-label">RESTANTE<br /><span style={{ color: '#3498db' }}>(CON INTERESSI)</span></span>
                      <span className="summary-value" style={{ color: '#f1c40f' }}>{(() => {
                        const totalRatesPaidR = financing.payments.length + (financing.initialPaidRates || 0);
                        const capitalRemaining = financing.totalAmount - (paid - interestPerRate * totalRatesPaidR > 0 ? paid - interestPerRate * totalRatesPaidR : 0);
                        const interestRemaining = interestPerRate * (financing.totalMonths - totalRatesPaidR);
                        return fmtEuro(Math.max(capitalRemaining + interestRemaining, 0));
                      })()}</span>
                      <div className={`tip-bubble ${showInterestTip === 'restante_ci' ? 'tip-visible' : ''}`}>
                        Formula: Da pagare (con interessi) − Pagato (con interessi)
                        <div className="tip-arrow" />
                      </div>
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
            const interestPaidProg = isFixed && financing.interestPerRate ? financing.interestPerRate * totalPaymentsCount : 0;
            const capitalPaidProg = paid - interestPaidProg;
            const progressCapital = financing.totalAmount > 0 ? (Math.min(Math.max(capitalPaidProg, 0), financing.totalAmount) / financing.totalAmount) * 100 : 0;
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
          const irregularPayments = financing.payments.filter(p => isIrregularPayment(p));
          const totalPaidRates = financing.payments.reduce((sum, p) => sum + p.amount, 0);
          const expectedTotal = effectiveRatesFromPayments * rateAmount;
          // Sottrai l'eccesso da cap per non contarlo doppio
          const balance = totalPaidRates - excessCredit - expectedTotal;
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
                      {excessCredit > 0.01 ? (
                        <div className="short-pay-balance balance-positive">
                          <span>{maxReached ? 'Concluso con credito:' : 'Credito:'}</span><span>+{excessCredit.toFixed(2)} €</span>
                        </div>
                      ) : (
                        <div className="short-pay-balance balance-zero" style={progress >= 100 ? { borderColor: '#00c853', color: '#00c853' } : {}}>
                          <span>{progress >= 100 ? 'Concluso' : 'Pareggio di bilancio'}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {(() => {
                        const netBal = balance + excessCredit;
                        const hasCapped = cappedPayments.length > 0;
                        return irregularPayments
                          .filter(p => {
                            // Nascondi irregolarità con mancante se coperte dal pagamento cappato
                            if (hasCapped && p.amount < rateAmount && netBal >= -0.01) return false;
                            return true;
                          })
                          .map(p => {
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
                          });
                      })()}
                      {cappedPayments.map(cp => {
                        const rataMancante = cp.ratesUsed * rateAmount + cp.accDebt;
                        const eccedenza = cp.payment.amount - rataMancante;
                        return (
                          <div key={cp.payment.id} className={`short-pay-item ${eccedenza >= 0 ? 'short-pay-over' : 'short-pay-under'}`}>
                            <div className="short-pay-row-info"><span>Data:</span><span>{new Date(cp.payment.date).toLocaleDateString('it-IT')}</span></div>
                            {cp.payment.note && <div className="short-pay-row-info"><span>Nota:</span><span className="text-note">{cp.payment.note}</span></div>}
                            <div className="short-pay-row-info"><span>Rata mancante:</span><span>{rataMancante.toFixed(2)} €</span></div>
                            <div className="short-pay-row-info"><span>Pagato:</span><span>{cp.payment.amount.toFixed(2)} €</span></div>
                            <div className="short-pay-row-info">
                              <span>{eccedenza >= 0 ? 'Eccedenza:' : 'Mancante:'}</span>
                              <span className={eccedenza >= 0 ? 'text-green' : 'text-red'}>{Math.abs(eccedenza).toFixed(2)} €</span>
                            </div>
                          </div>
                        );
                      })}
                      <hr className="card-separator" />
                      <div className="short-pay-status-label">STATO ATTUALE</div>
                      {(() => {
                        const netBalance = balance + excessCredit;
                        const netBalanced = Math.abs(netBalance) < 0.01;
                        return (
                          <div className={`short-pay-balance ${netBalanced ? 'balance-zero' : netBalance > 0 ? 'balance-positive' : 'balance-negative'}`} style={netBalanced && progress >= 100 ? { borderColor: '#00c853', color: '#00c853' } : {}}>
                            <span>{netBalanced ? (progress >= 100 ? 'Concluso' : 'Pareggio di bilancio') : netBalance > 0 ? (maxReached ? 'Concluso con credito:' : 'Credito:') : (maxReached ? 'Concluso con debito rata:' : 'Debito rata:')}</span>
                            {!netBalanced && <span>{netBalance > 0 ? '+' : '-'}{Math.abs(netBalance).toFixed(2)} €</span>}
                          </div>
                        );
                      })()}
                      {!isBalanced && balance < 0 && !maxReached && (
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
                            } catch { /* ignore */ }
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
                  ) : (() => {
                    const netBalance = balance + excessCredit;
                    const netBalanced = Math.abs(netBalance) < 0.01;
                    return (
                      <div className={`short-pay-balance ${netBalanced ? 'balance-zero' : netBalance > 0 ? 'balance-positive' : 'balance-negative'}`} style={netBalanced && progress >= 100 ? { borderColor: '#00c853', color: '#00c853' } : {}}>
                        <span>{netBalanced ? (progress >= 100 ? 'Concluso' : 'Pareggio di bilancio') : netBalance > 0 ? (maxReached ? 'Concluso con credito:' : 'Credito:') : (maxReached ? 'Concluso con debito rata:' : 'Debito rata:')}</span>
                        {!netBalanced && <span>{netBalance > 0 ? '+' : '-'}{Math.abs(netBalance).toFixed(2)} €</span>}
                      </div>
                    );
                  })()}
                  {!isBalanced && balance < 0 && !dismissedIrregulars && !maxReached && (
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
        <div className="card section-card" ref={addPaymentRef} style={maxReached ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
          <h3 className="section-heading" style={{ textAlign: 'center' }}>💳 AGGIUNGI PAGAMENTO</h3>
          {maxReached && (() => {
            const netBal = debtAmount + excessCredit;
            if (netBal > 0.01) return <p style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Concluso con credito di {netBal.toFixed(2)} €</p>;
            if (netBal < -0.01) return <p style={{ textAlign: 'center', color: '#e74c3c', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Concluso con debito di {Math.abs(netBal).toFixed(2)} €</p>;
            return <p style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Tutte le rate sono state pagate!</p>;
          })()}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>Data:</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{ padding: '0.35rem 0.6rem', borderRadius: '0.4rem', border: '1.5px solid #ccc', fontSize: '0.85rem', outline: 'none', background: 'white', color: '#333' }}
                />
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
            <button className="btn-primary btn-tick" onClick={addPayment} style={{ flexShrink: 0 }}>
              ✓
            </button>
          </div>
        </div>

        {/* STORICO PAGAMENTI */}
        <div className="card section-card">
            <h3 className="section-heading" style={{ textAlign: 'center' }}>📋 STORICO PAGAMENTI</h3>
            {financing.payments.length === 0 && (
              <p style={{ textAlign: 'center', color: '#6b9e7d', fontStyle: 'italic' }}>Nessun pagamento registrato</p>
            )}
            {financing.payments.length > 0 && (
            <div className="payments-list">
              <div className="payment-header">
                <span className="payment-col-date">Data</span>
                <span className="payment-col-amount">Importo</span>
                <span className="payment-col-note">Note</span>
                <span className="payment-col-spacer"></span>
                <span className="payment-col-actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {financing.totalMonths > 0 && (() => {
                    const netBal = debtAmount + excessCredit;
                    const badgeColor = maxReached ? (Math.abs(netBal) < 0.01 ? '#27ae60' : netBal > 0 ? '#3498db' : '#e74c3c') : '#333';
                    const badgeBg = maxReached ? (Math.abs(netBal) < 0.01 ? '#eafaf1' : netBal > 0 ? '#ebf5fb' : '#fdecea') : '#f0f0f0';
                    return (
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: badgeColor, background: badgeBg, padding: '1px 6px', borderRadius: '1rem', whiteSpace: 'nowrap' }}>
                        {totalPaymentsCount}/{financing.totalMonths}
                      </span>
                    );
                  })()}
                </span>
              </div>
              {[...financing.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p) => (
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
            {financing.payments.length > 0 && (() => {
              const totalePagato = financing.payments.reduce((s, p) => s + p.amount, 0);
              const netDiff = debtAmount + excessCredit;
              return (
                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '0.5rem 0' }} />
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--theme-text-primary, #333)' }}>
                    Totale pagato: {totalePagato.toFixed(2)} €
                  </div>
                  {isFixed && Math.abs(netDiff) >= 0.01 && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.25rem', color: netDiff > 0 ? '#2ecc71' : '#e74c3c' }}>
                      {maxReached
                        ? (netDiff > 0 ? `Concluso con credito: +${netDiff.toFixed(2)} €` : `Concluso con debito: ${Math.abs(netDiff).toFixed(2)} €`)
                        : (netDiff > 0 ? `Credito: +${netDiff.toFixed(2)} €` : `Debito: ${Math.abs(netDiff).toFixed(2)} €`)
                      }
                    </div>
                  )}
                  {isFixed && Math.abs(netDiff) < 0.01 && maxReached && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.25rem', color: '#27ae60' }}>
                      Concluso
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        {/* ESPORTA EXCEL */}
        <hr style={{ border: 'none', borderTop: '1.5px solid rgba(0,0,0,0.15)', margin: '1rem 1rem 0' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '1rem 0 1.5rem', flexWrap: 'nowrap' }}>
          <button
            className="btn-excel"
            style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
            onClick={() => {
              const wb = XLSX.utils.book_new();
              const interestPerRateX = financing.interestPerRate ?? 0;
              const interestPaidX = interestPerRateX * totalPaymentsCount;
              const capitalPaidX = Math.max(paid - interestPaidX, 0);
              const totalWithInterestX = financing.totalAmount + interestPerRateX * financing.totalMonths;
              const netBalX = debtAmount + excessCredit;
              const situazioneLabel = maxReached
                ? (Math.abs(netBalX) < 0.01 ? 'Concluso' : netBalX > 0 ? 'Concluso con credito' : 'Concluso con debito')
                : (Math.abs(netBalX) < 0.01 ? 'In corso - Pareggio' : netBalX > 0 ? 'In corso - Credito' : 'In corso - Debito');

              // --- Foglio 1: Riepilogo ---
              const riepilogo: (string | number)[][] = [];
              riepilogo.push(['DATI FINANZIAMENTO', '']);
              riepilogo.push(['Campo', 'Valore']);
              riepilogo.push(['Nome', financing.name]);
              riepilogo.push(['Totale da pagare (senza interessi)', financing.totalAmount.toFixed(2) + ' €']);
              if (interestPerRateX > 0) riepilogo.push(['Totale da pagare (con interessi)', totalWithInterestX.toFixed(2) + ' €']);
              riepilogo.push(['Rate totali', financing.totalMonths]);
              riepilogo.push(['Tipo rata', financing.rateType.charAt(0).toUpperCase() + financing.rateType.slice(1)]);
              riepilogo.push(['Modalita rata', financing.rateMode.charAt(0).toUpperCase() + financing.rateMode.slice(1)]);
              if (isFixed) riepilogo.push(['Rata fissa', rateAmount.toFixed(2) + ' €']);
              if (interestPerRateX > 0) riepilogo.push(['Interessi per rata', interestPerRateX.toFixed(2) + ' €']);
              riepilogo.push(['Data inizio', financing.startDate ? new Date(financing.startDate).toLocaleDateString('it-IT') : '-']);
              riepilogo.push(['Data fine', financing.endDate ? new Date(financing.endDate).toLocaleDateString('it-IT') : '-']);
              riepilogo.push(['', '']);
              riepilogo.push(['SITUAZIONE PAGAMENTI', '']);
              riepilogo.push(['Campo', 'Valore']);
              riepilogo.push(['Situazione', situazioneLabel]);
              if (Math.abs(netBalX) >= 0.01) riepilogo.push([netBalX > 0 ? 'Credito' : 'Debito', (netBalX > 0 ? '+' : '') + netBalX.toFixed(2) + ' €']);
              riepilogo.push(['Pagato (senza interessi)', capitalPaidX.toFixed(2) + ' €']);
              if (interestPerRateX > 0) riepilogo.push(['Interessi pagati', interestPaidX.toFixed(2) + ' €']);
              riepilogo.push(['Totale versato', paid.toFixed(2) + ' €']);
              riepilogo.push(['Restante (senza interessi)', Math.max(financing.totalAmount - capitalPaidX, 0).toFixed(2) + ' €']);
              if (interestPerRateX > 0) {
                const capitalRem = Math.max(financing.totalAmount - capitalPaidX, 0);
                const interestRem = Math.max(interestPerRateX * (financing.totalMonths - totalPaymentsCount), 0);
                riepilogo.push(['Restante (con interessi)', Math.max(capitalRem + interestRem, 0).toFixed(2) + ' €']);
              }
              riepilogo.push(['', '']);
              riepilogo.push(['AVANZAMENTO RATE', '']);
              riepilogo.push(['Campo', 'Valore']);
              riepilogo.push(['Rate pagate (effettive)', totalPaymentsCount]);
              riepilogo.push(['Rate rimanenti', Math.max(financing.totalMonths - totalPaymentsCount, 0)]);
              riepilogo.push(['Avanzamento', totalPaymentsCount + ' / ' + financing.totalMonths]);
              riepilogo.push(['Progresso', progress.toFixed(1) + '%']);

              const wsRiepilogo = XLSX.utils.aoa_to_sheet(riepilogo);
              wsRiepilogo['!cols'] = [{ wch: 32 }, { wch: 22 }];
              XLSX.utils.book_append_sheet(wb, wsRiepilogo, 'Riepilogo');

              // --- Foglio 2: Storico pagamenti ---
              const payments = [...financing.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              const hasInterest = interestPerRateX > 0;
              const storico: (string | number)[][] = [];
              if (hasInterest) {
                storico.push(['N.', 'Data', 'Importo totale', 'Capitale', 'Interessi', 'Rate effettive', 'Note']);
                payments.forEach((p, i) => {
                  const effRates = countEffectiveRates(p);
                  const cap = Math.max(p.amount - interestPerRateX * effRates, 0);
                  storico.push([i + 1, new Date(p.date).toLocaleDateString('it-IT'), p.amount.toFixed(2) + ' €', cap.toFixed(2) + ' €', (interestPerRateX * effRates).toFixed(2) + ' €', effRates, p.note || '']);
                });
                storico.push([]);
                const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
                storico.push(['', 'TOTALE', totalPaid.toFixed(2) + ' €', capitalPaidX.toFixed(2) + ' €', interestPaidX.toFixed(2) + ' €', effectiveRatesFromPayments, '']);
              } else {
                storico.push(['N.', 'Data', 'Importo', 'Rate effettive', 'Note']);
                payments.forEach((p, i) => {
                  storico.push([i + 1, new Date(p.date).toLocaleDateString('it-IT'), p.amount.toFixed(2) + ' €', countEffectiveRates(p), p.note || '']);
                });
                storico.push([]);
                storico.push(['', 'TOTALE', payments.reduce((s, p) => s + p.amount, 0).toFixed(2) + ' €', effectiveRatesFromPayments, '']);
              }
              if (Math.abs(netBalX) >= 0.01) {
                storico.push([]);
                storico.push(['', netBalX > 0 ? 'CREDITO' : 'DEBITO', (netBalX > 0 ? '+' : '') + netBalX.toFixed(2) + ' €']);
              }
              const wsStorico = XLSX.utils.aoa_to_sheet(storico);
              wsStorico['!cols'] = hasInterest
                ? [{ wch: 5 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 28 }]
                : [{ wch: 5 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 28 }];
              XLSX.utils.book_append_sheet(wb, wsStorico, 'Storico Pagamenti');

              try {
                XLSX.writeFile(wb, financing.name + '_finanziamento.xlsx', { bookType: 'xlsx' });
              } catch (err) {
                console.error('Errore export Excel:', err);
                alert('Errore durante l\'esportazione: ' + (err as Error).message);
              }
            }}
          >
            <span className="btn-excel-icon">X</span> Esporta in Excel
          </button>
          <button
            className="btn-excel btn-copy"
            style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
            onClick={() => {
              const interestPerRateX = financing.interestPerRate ?? 0;
              const interestPaidX = interestPerRateX * totalPaymentsCount;
              const capitalPaidX = Math.max(paid - interestPaidX, 0);
              const totalWithInterestX = financing.totalAmount + interestPerRateX * financing.totalMonths;
              const netBalX = debtAmount + excessCredit;
              const situazioneLabel = maxReached
                ? (Math.abs(netBalX) < 0.01 ? 'Concluso' : netBalX > 0 ? 'Concluso con credito' : 'Concluso con debito')
                : (Math.abs(netBalX) < 0.01 ? 'In corso - Pareggio' : netBalX > 0 ? 'In corso - Credito' : 'In corso - Debito');

              let text = `📊 RIEPILOGO - ${financing.name}\n`;
              text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
              text += `📋 DATI FINANZIAMENTO\n`;
              text += `Totale da pagare: ${financing.totalAmount.toFixed(2)} €\n`;
              if (interestPerRateX > 0) text += `Totale con interessi: ${totalWithInterestX.toFixed(2)} €\n`;
              text += `Rate totali: ${financing.totalMonths}\n`;
              text += `Tipo rata: ${financing.rateType.charAt(0).toUpperCase() + financing.rateType.slice(1)}\n`;
              text += `Modalità: ${financing.rateMode.charAt(0).toUpperCase() + financing.rateMode.slice(1)}\n`;
              if (isFixed) text += `Rata fissa: ${rateAmount.toFixed(2)} €\n`;
              if (interestPerRateX > 0) text += `Interessi per rata: ${interestPerRateX.toFixed(2)} €\n`;
              if (financing.startDate) text += `Periodo: ${new Date(financing.startDate).toLocaleDateString('it-IT')} - ${financing.endDate ? new Date(financing.endDate).toLocaleDateString('it-IT') : '-'}\n`;
              text += `\n💰 SITUAZIONE\n`;
              text += `Stato: ${situazioneLabel}\n`;
              if (Math.abs(netBalX) >= 0.01) text += `${netBalX > 0 ? 'Credito' : 'Debito'}: ${netBalX > 0 ? '+' : ''}${netBalX.toFixed(2)} €\n`;
              text += `Pagato (senza interessi): ${capitalPaidX.toFixed(2)} €\n`;
              if (interestPerRateX > 0) text += `Interessi pagati: ${interestPaidX.toFixed(2)} €\n`;
              text += `Totale versato: ${paid.toFixed(2)} €\n`;
              text += `Restante: ${Math.max(financing.totalAmount - capitalPaidX, 0).toFixed(2)} €\n`;
              text += `\n📈 AVANZAMENTO\n`;
              text += `Rate pagate: ${totalPaymentsCount} / ${financing.totalMonths}\n`;
              text += `Progresso: ${progress.toFixed(1)}%\n`;
              text += `\n📋 STORICO PAGAMENTI\n`;
              text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              const payments = [...financing.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              payments.forEach((p, i) => {
                const effRates = countEffectiveRates(p);
                text += `${i + 1}. ${new Date(p.date).toLocaleDateString('it-IT')} - ${p.amount.toFixed(2)} €`;
                if (effRates > 1) text += ` (x${effRates} rate)`;
                if (p.note) text += ` [${p.note}]`;
                text += `\n`;
              });
              text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              text += `Totale: ${payments.reduce((s, p) => s + p.amount, 0).toFixed(2)} €\n`;
              if (Math.abs(netBalX) >= 0.01) text += `${netBalX > 0 ? 'Credito' : 'Debito'}: ${netBalX > 0 ? '+' : ''}${netBalX.toFixed(2)} €\n`;

              navigator.clipboard.writeText(text).then(() => showToast('Dati copiati negli appunti!', '#3498db'));
            }}
          >
            <span className="btn-excel-icon">📋</span> Copia dati
          </button>
        </div>
      </div>

      {editingPayment && createPortal(
        <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={() => setEditingPayment(null)}>
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
              <button
                className="btn-primary"
                onClick={saveEditPayment}
                disabled={!editHasChanges}
                style={!editHasChanges ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                Salva
              </button>
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
    {showInterestTip && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowInterestTip(null)} />
    )}
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
