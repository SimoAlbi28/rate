import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Financing, RateType } from '../types';

interface Props {
  financings: Financing[];
  onAdd: (name: string, emoji: string, totalAmount: number, totalMonths: number, rateType: RateType, rateMode: 'fissa' | 'variabile', startDate: string, endDate: string, initialPaid: number, initialPaidRates: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (updated: Financing) => void;
}

const EMOJI_OPTIONS = [
  '💰', '🚗', '🏠', '📱', '💻', '🏍️', '📺', '🎓', '✈️', '💳',
  '🛒', '🏥', '🦷', '⚡', '💧', '🔥', '📡', '🏋️', '🎮',
  '📦', '🐶', '🐱', '👶', '💍', '🛋️', '🧹', '🚌', '🅿️', '📰', '🏦',
];

export default function HomePage({ financings, onAdd, onDelete, onUpdate }: Props) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'tutti' | 'debito' | 'credito'>('tutti');
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const paidAmountRef = useRef<HTMLInputElement>(null);

  const showErrors = useCallback((fields: string[], scrollTo: HTMLInputElement | null) => {
    setErrors(new Set(fields));
    if (scrollTo) {
      scrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setErrors(new Set()), 3000);
  }, []);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [quickPayId, setQuickPayId] = useState<string | null>(null);
  const [quickPayInt, setQuickPayInt] = useState('');
  const [quickPayDec, setQuickPayDec] = useState('');
  const [quickPayOriginal, setQuickPayOriginal] = useState('');
  const [quickPayNote, setQuickPayNote] = useState('');
  const [shortPayDetail, setShortPayDetail] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editAmountInt, setEditAmountInt] = useState('');
  const [editAmountDec, setEditAmountDec] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editDurationType, setEditDurationType] = useState<'mesi' | 'anni'>('mesi');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editRateType, setEditRateType] = useState<RateType>('mensile');
  const [editRateMode, setEditRateMode] = useState<'fissa' | 'variabile'>('variabile');
  const [editFixedRateInt, setEditFixedRateInt] = useState('');
  const [editFixedRateDec, setEditFixedRateDec] = useState('');
  const [editInitialPaidRates, setEditInitialPaidRates] = useState('');
  const [editPaidMode, setEditPaidMode] = useState<'singola' | 'totale'>('totale');
  const [, /* editPaidSlideDir */] = useState<'slide-left' | 'slide-right'>('slide-right');
  const [editSingleRates, setEditSingleRates] = useState<{ int: string; dec: string }[]>([]);
  const [editInitialPaidInt, setEditInitialPaidInt] = useState('');
  const [editInitialPaidDec, setEditInitialPaidDec] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💰');
  const [amountInt, setAmountInt] = useState('');
  const [amountDec, setAmountDec] = useState('');
  const [newDuration, setNewDuration] = useState('0');
  const [durationType, setDurationType] = useState<'mesi' | 'anni'>('mesi');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rateType, setRateType] = useState<RateType | ''>('mensile');
  const [rateMode, setRateMode] = useState<'fissa' | 'variabile' | ''>('fissa');
  const [fixedRateInt, setFixedRateInt] = useState('');
  const [fixedRateDec, setFixedRateDec] = useState('');
  const [initialPaidRates, setInitialPaidRates] = useState('0');
  const [paidMode, setPaidMode] = useState<'singola' | 'totale'>('totale');
  const [, /* paidSlideDir */] = useState<'slide-left' | 'slide-right'>('slide-right');
  const [singleRates, setSingleRates] = useState<{ int: string; dec: string }[]>([]);
  const [initialPaidInt, setInitialPaidInt] = useState('');
  const [initialPaidDec, setInitialPaidDec] = useState('');

  const openEdit = (f: Financing) => {
    setEditId(f.id);
    setEditName(f.name);
    setEditEmoji(f.emoji);
    const intPart = Math.floor(f.totalAmount);
    const decPart = Math.round((f.totalAmount - intPart) * 100);
    setEditAmountInt(intPart.toString());
    setEditAmountDec(decPart > 0 ? decPart.toString() : '');
    const months = f.totalMonths;
    if (months >= 12 && months % 12 === 0) {
      setEditDurationType('anni');
      setEditDuration((months / 12).toString());
    } else {
      setEditDurationType('mesi');
      setEditDuration(months.toString());
    }
    setEditRateType(f.rateType || 'mensile');
    setEditRateMode(f.rateMode || 'variabile');
    setEditInitialPaidRates((f.initialPaidRates || 0).toString());
    setEditStartDate(f.startDate || '');
    setEditEndDate(f.endDate || '');
    const ipInt = Math.floor(f.initialPaid || 0);
    const ipDec = Math.round(((f.initialPaid || 0) - ipInt) * 100);
    setEditInitialPaidInt(ipInt > 0 ? ipInt.toString() : '');
    setEditInitialPaidDec(ipDec > 0 ? ipDec.toString() : '');
  };

  const handleSaveEdit = () => {
    const f = financings.find((x) => x.id === editId);
    if (!f || !editName.trim()) return;
    const amount = parseFloat(`${editAmountInt || '0'}.${editAmountDec || '0'}`);
    if (amount <= 0) return;
    const dur = parseInt(editDuration);
    if (!dur || dur <= 0) return;
    const editPaidRatesNum = parseInt(editInitialPaidRates) || 0;
    let initialPaid = 0;
    if (editPaidRatesNum > 0) {
      if (editPaidMode === 'totale') {
        initialPaid = parseFloat(`${editInitialPaidInt || '0'}.${editInitialPaidDec || '0'}`);
      } else {
        initialPaid = editSingleRates.reduce((sum, r) => sum + parseFloat(`${r.int || '0'}.${r.dec || '0'}`), 0);
      }
      if (initialPaid <= 0) return;
    }
    const months = editDurationType === 'anni' ? dur * 12 : dur;
    onUpdate({
      ...f,
      name: editName.trim(),
      emoji: editEmoji,
      totalAmount: amount,
      totalMonths: months,
      rateType: editRateType,
      rateMode: editRateMode as 'fissa' | 'variabile',
      initialPaidRates: parseInt(editInitialPaidRates) || 0,
      startDate: editStartDate,
      endDate: editEndDate,
      initialPaid,
    });
    setEditId(null);
  };

  const editAddMonths = (dateStr: string, months: number): string => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const editSubMonths = (dateStr: string, months: number): string => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  };

  const getEditDurationMonths = () => {
    const d = parseInt(editDuration) || 0;
    return editDurationType === 'anni' ? d * 12 : d;
  };

  const handleEditStartDate = (val: string) => {
    setEditStartDate(val);
    const m = getEditDurationMonths();
    if (val && m > 0) setEditEndDate(editAddMonths(val, m));
  };

  const handleEditEndDate = (val: string) => {
    setEditEndDate(val);
    const m = getEditDurationMonths();
    if (val && m > 0) setEditStartDate(editSubMonths(val, m));
  };

  const handleEditDuration = (val: string) => {
    setEditDuration(val);
    const d = parseInt(val) || 0;
    const m = editDurationType === 'anni' ? d * 12 : d;
    if (editStartDate && m > 0) setEditEndDate(editAddMonths(editStartDate, m));
    else if (editEndDate && m > 0) setEditStartDate(editSubMonths(editEndDate, m));
  };

  const handleEditDurationType = (val: 'mesi' | 'anni') => {
    setEditDurationType(val);
    const d = parseInt(editDuration) || 0;
    const m = val === 'anni' ? d * 12 : d;
    if (editStartDate && m > 0) setEditEndDate(editAddMonths(editStartDate, m));
    else if (editEndDate && m > 0) setEditStartDate(editSubMonths(editEndDate, m));
  };

  const autoFillRates = (n: number, rateIntVal: string, rateDecVal: string, mode: 'fissa' | 'variabile') => {
    if (mode === 'fissa' && (rateIntVal || rateDecVal)) {
      const rata = parseFloat(`${rateIntVal || '0'}.${rateDecVal || '0'}`);
      const total = rata * n;
      setInitialPaidInt(Math.floor(total).toString());
      const dec = Math.round((total - Math.floor(total)) * 100);
      setInitialPaidDec(dec > 0 ? dec.toString() : '');
      return Array(n).fill(null).map(() => ({
        int: rateIntVal || '',
        dec: rateDecVal || '',
      }));
    }
    return null;
  };

  const updatePaidRatesCount = (val: string) => {
    setInitialPaidRates(val);
    const n = parseInt(val) || 0;
    const filled = rateMode ? autoFillRates(n, fixedRateInt, fixedRateDec, rateMode) : null;
    if (filled) {
      setSingleRates(filled);
    } else {
      setSingleRates((prev) => {
        if (n > prev.length) return [...prev, ...Array(n - prev.length).fill({ int: '', dec: '' })];
        return prev.slice(0, n);
      });
    }
  };

  const updateEditPaidRatesCount = (val: string) => {
    setEditInitialPaidRates(val);
    const n = parseInt(val) || 0;
    if (editRateMode === 'fissa' && (editFixedRateInt || editFixedRateDec)) {
      const rata = parseFloat(`${editFixedRateInt || '0'}.${editFixedRateDec || '0'}`);
      const total = rata * n;
      setEditInitialPaidInt(Math.floor(total).toString());
      const dec = Math.round((total - Math.floor(total)) * 100);
      setEditInitialPaidDec(dec > 0 ? dec.toString() : '');
      setEditSingleRates(Array(n).fill(null).map(() => ({
        int: editFixedRateInt || '',
        dec: editFixedRateDec || '',
      })));
    } else {
      setEditSingleRates((prev) => {
        if (n > prev.length) return [...prev, ...Array(n - prev.length).fill({ int: '', dec: '' })];
        return prev.slice(0, n);
      });
    }
  };

  const getBalance = (f: Financing) => {
    const ra = f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0;
    if ((f.rateMode || 'variabile') !== 'fissa' || ra <= 0) return 0;
    const irregulars = f.payments.filter(p => p.amount !== ra);
    return irregulars.reduce((sum, p) => sum + (p.amount - ra), 0);
  };

  const filteredFinancings = financings
    .filter(f => {
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType === 'debito') return getBalance(f) < 0;
      if (filterType === 'credito') return getBalance(f) > 0;
      return true;
    })
    .sort((a, b) => {
      if (filterType === 'debito') return getBalance(a) - getBalance(b);
      if (filterType === 'credito') return getBalance(b) - getBalance(a);
      return a.name.localeCompare(b.name);
    });

  const lpTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lpCounter = useRef(0);
  const lpActive = useRef(false);

  const lpStart = (initial: number, step: number, min: number, onChange: (v: string) => void) => {
    lpCounter.current = initial;
    lpActive.current = false;
    lpTimeout.current = setTimeout(() => {
      lpActive.current = true;
      lpInterval.current = setInterval(() => {
        lpCounter.current = Math.max(min, lpCounter.current + step);
        onChange(String(lpCounter.current));
      }, 120);
    }, 500);
  };

  const lpStop = () => {
    if (lpTimeout.current) { clearTimeout(lpTimeout.current); lpTimeout.current = null; }
    if (lpInterval.current) { clearInterval(lpInterval.current); lpInterval.current = null; }
  };

  useEffect(() => () => lpStop(), []);

  const stepperMinus = (getVal: () => number, onChange: (v: string) => void, min = 0) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); lpStart(getVal(), -1, min, onChange); },
    onPointerUp: () => { if (!lpActive.current) onChange(String(Math.max(min, (lpCounter.current) - 1))); lpStop(); },
    onPointerLeave: () => lpStop(),
  });

  const stepperPlus = (getVal: () => number, onChange: (v: string) => void) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); lpStart(getVal(), 1, 0, onChange); },
    onPointerUp: () => { if (!lpActive.current) onChange(String((lpCounter.current) + 1)); lpStop(); },
    onPointerLeave: () => lpStop(),
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const getVisibleEmojis = (selected: string) => {
    if (showAllEmojis) return EMOJI_OPTIONS;
    if (EMOJI_OPTIONS.indexOf(selected) < 10) return EMOJI_OPTIONS.slice(0, 10);
    const filtered = EMOJI_OPTIONS.filter(x => x !== selected);
    return [selected, ...filtered.slice(0, 9)];
  };

  const getProgressColor = (pct: number) => {
    if (pct <= 20) return '#e74c3c';
    if (pct <= 40) return '#e67e22';
    if (pct <= 60) return '#f1c40f';
    if (pct <= 80) return '#a8d641';
    return '#2ecc71';
  };

  const getDurationMonths = () => {
    const d = parseInt(newDuration) || 0;
    return durationType === 'anni' ? d * 12 : d;
  };

  const addMonthsToDate = (dateStr: string, months: number): string => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const subMonthsFromDate = (dateStr: string, months: number): string => {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const months = getDurationMonths();
    if (val && months > 0) {
      setEndDate(addMonthsToDate(val, months));
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    const months = getDurationMonths();
    if (val && months > 0) {
      setStartDate(subMonthsFromDate(val, months));
    }
  };

  const recalcFixedRate = (dur: number) => {
    if (rateMode === 'fissa' && dur > 0) {
      const tot = parseFloat(`${amountInt || '0'}.${amountDec || '0'}`);
      if (tot > 0) {
        const rata = tot / dur;
        setFixedRateInt(Math.floor(rata).toString());
        const dec = Math.round((rata - Math.floor(rata)) * 100);
        setFixedRateDec(dec > 0 ? dec.toString() : '');
      }
    }
  };

  const handleDurationChange = (val: string) => {
    setNewDuration(val);
    const d = parseInt(val) || 0;
    const months = durationType === 'anni' ? d * 12 : d;
    if (startDate && months > 0) {
      setEndDate(addMonthsToDate(startDate, months));
    } else if (endDate && months > 0) {
      setStartDate(subMonthsFromDate(endDate, months));
    }
    recalcFixedRate(d);
  };


  const handleCreate = () => {
    const missing: string[] = [];
    let firstRef: HTMLInputElement | null = null;

    if (!newName.trim()) {
      missing.push('name');
      if (!firstRef) firstRef = nameRef.current;
    }
    const amount = parseFloat(`${amountInt || '0'}.${amountDec || '0'}`);
    if (amount <= 0) {
      missing.push('amount');
      if (!firstRef) firstRef = amountRef.current;
    }
    const duration = parseInt(newDuration);
    if (!duration || duration <= 0) {
      missing.push('duration');
      if (!firstRef) firstRef = durationRef.current;
    }
    if (!rateType) {
      missing.push('rateType');
    }
    if (!rateMode) {
      missing.push('rateType');
    }
    const paidRates = parseInt(initialPaidRates) || 0;
    let initialPaid = 0;
    if (paidRates > 0) {
      if (paidMode === 'totale') {
        initialPaid = parseFloat(`${initialPaidInt || '0'}.${initialPaidDec || '0'}`);
      } else {
        initialPaid = singleRates.reduce((sum, r) => sum + parseFloat(`${r.int || '0'}.${r.dec || '0'}`), 0);
      }
      if (initialPaid <= 0) {
        missing.push('paidAmount');
        if (!firstRef) firstRef = paidAmountRef.current;
      }
    }

    if (missing.length > 0) {
      showErrors(missing, firstRef);
      return;
    }
    const months = durationType === 'anni' ? duration * 12 : duration;
    onAdd(newName.trim(), selectedEmoji, amount, months, rateType as RateType, rateMode as 'fissa' | 'variabile', startDate, endDate, initialPaid, paidRates);
    setNewName('');
    setSelectedEmoji('💳');
    setAmountInt('');
    setAmountDec('');
    setNewDuration('0');
    setDurationType('mesi');
    setRateType('mensile');
    setRateMode('fissa');
    setFixedRateInt('');
    setFixedRateDec('');
    setInitialPaidRates('0');
    setPaidMode('totale');
    setSingleRates([]);
    setStartDate('');
    setEndDate('');
    setInitialPaidInt('');
    setInitialPaidDec('');
    setShowModal(false);
  };

  return (
    <div className="page home-page">
      <div className="home-sticky-top">
        <nav className="navbar">
          <div className="navbar-brand">
            <div className="navbar-logo">
              <span className="logo-icon">R</span>
            </div>
            <div className="navbar-text">
              <h1>Rate & Pagamenti</h1>
              <p className="navbar-tagline">Riprendi il controllo</p>
            </div>
          </div>
          <div className="navbar-glow"></div>
        </nav>
        <div className="sticky-bar">
          <h2 className="section-title">CARTELLE</h2>
          <div className="toolbar">
            <button className="toolbar-btn toolbar-btn-create" onClick={() => setShowModal(true)}>
              + Crea
            </button>
            <button
              className={`toolbar-btn toolbar-btn-search ${showSearch ? 'active' : ''}`}
              onClick={() => { setShowSearch(!showSearch); if (showSearch) { setSearchQuery(''); setFilterType('tutti'); } }}
            >
              🔍
            </button>
          </div>
          {showSearch && (
            <div className="search-bar">
              <input
                type="text"
                placeholder="Cerca per nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                autoFocus
              />
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filterType === 'tutti' ? 'active' : ''}`}
                  onClick={() => setFilterType('tutti')}
                >
                  Tutti
                </button>
                <button
                  className={`filter-btn filter-debito ${filterType === 'debito' ? 'active' : ''}`}
                  onClick={() => setFilterType(filterType === 'debito' ? 'tutti' : 'debito')}
                >
                  Debito
                </button>
                <button
                  className={`filter-btn filter-credito ${filterType === 'credito' ? 'active' : ''}`}
                  onClick={() => setFilterType(filterType === 'credito' ? 'tutti' : 'credito')}
                >
                  Credito
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="content">
        <div className="cards-grid">
          {filteredFinancings.map((f) => {
            const paid = f.payments.reduce((s, p) => s + p.amount, 0) + (f.initialPaid || 0);
            const rateAmount = f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0;
            const ratesPaid = (rateAmount > 0 ? Math.floor(paid / rateAmount) : 0) + (f.initialPaidRates || 0);
            const remainingMonths = f.totalMonths - ratesPaid;
            const progress = f.totalAmount > 0 ? (paid / f.totalAmount) * 100 : 0;

            const residuo = f.totalAmount - paid;
            const formatPeriod = () => {
              if (f.startDate && f.endDate) {
                const s = new Date(f.startDate).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
                const e = new Date(f.endDate).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
                return `(${s} - ${e})`;
              }
              return '';
            };

            return (
              <div
                key={f.id}
                className="card financing-card"
                onClick={() => navigate(`/detail/${f.id}`)}
              >
                <div className="card-top-row">
                  <div className="card-emoji">{f.emoji}</div>
                  <div className="card-name">{f.name.charAt(0).toUpperCase() + f.name.slice(1)}</div>
                  <div className="card-actions">
                    <button
                      className="card-action-btn card-btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(f.id);
                      }}
                      title="Elimina"
                    >
                      🗑️
                    </button>
                    <button
                      className="card-action-btn card-btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(f);
                      }}
                      title="Modifica"
                    >
                      ✏️
                    </button>
                    <button
                      className="card-action-btn card-btn-add"
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((f.rateMode || 'variabile') === 'fissa' && rateAmount > 0) {
                          const intPart = Math.floor(rateAmount).toString();
                          const decPart = Math.round((rateAmount - Math.floor(rateAmount)) * 100);
                          setQuickPayInt(intPart);
                          setQuickPayDec(decPart > 0 ? decPart.toString() : '');
                          setQuickPayOriginal(`${intPart}.${decPart > 0 ? decPart : '0'}`);
                          setQuickPayNote('');
                        } else {
                          setQuickPayInt('');
                          setQuickPayDec('');
                          setQuickPayOriginal('');
                          setQuickPayNote('');
                        }
                        setQuickPayId(f.id);
                      }}
                      title="Aggiungi rata"
                    >
                      + Rata
                    </button>
                  </div>
                </div>
                <hr className="card-separator" />
                {formatPeriod() && <div className="card-period-center">{formatPeriod()}</div>}
                <div className="card-info-center card-info-blue">Mesi mancanti: {remainingMonths > 0 ? remainingMonths : 0}</div>
                <hr className="card-separator" />
                <div className="card-info-table">
                  <div className="card-info card-info-red"><span>Da pagare:</span><span>{f.totalAmount.toFixed(2)} €</span></div>
                  <div className="card-info card-info-green"><span>Pagato:</span><span>{paid.toFixed(2)} €</span></div>
                  <hr className="card-separator" />
                  <div className="card-info card-info-yellow"><span>Restante:</span><span>{residuo > 0 ? residuo.toFixed(2) : '0.00'} €</span></div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(progress, 100)}%`, background: getProgressColor(progress) }}
                  />
                </div>
                <hr className="card-separator" />
                <div className={`card-rate-mode ${(f.rateMode || 'variabile') === 'fissa' ? 'mode-fissa' : 'mode-variabile'}`}>
                  Rata {((f.rateMode || 'variabile').charAt(0).toUpperCase() + (f.rateMode || 'variabile').slice(1))}
                </div>
                {rateAmount > 0 && f.rateType && (f.rateMode || 'variabile') === 'fissa' && (() => {
                  const irregularPayments = f.payments.filter(p => p.amount !== rateAmount);
                  const hasIrregular = irregularPayments.length > 0;
                  const irregularBalance = irregularPayments.reduce((sum, p) => sum + (p.amount - rateAmount), 0);
                  const isBalanced = hasIrregular && irregularBalance === 0;
                  return (
                    <>
                      <div className="card-rate-info-row">
                        <div className="card-rate-info">
                          {rateAmount.toFixed(2)} € <span className="card-rate-type">{f.rateType.charAt(0).toUpperCase() + f.rateType.slice(1)}</span>
                        </div>
                        {hasIrregular && !dismissedAlerts.has(f.id) && (
                          <button
                            className={`short-pay-alert ${isBalanced ? 'no-pulse' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShortPayDetail(shortPayDetail === f.id ? null : f.id);
                            }}
                            title="Rate irregolari"
                          >
                          </button>
                        )}
                      </div>
                      {shortPayDetail === f.id && hasIrregular && !dismissedAlerts.has(f.id) && (
                        <div className="short-pay-popup" onClick={(e) => e.stopPropagation()}>
                          <div className="short-pay-header">
                            <span>Rate irregolari</span>
                            <button className="short-pay-close" onClick={(e) => { e.stopPropagation(); setShortPayDetail(null); }}>×</button>
                          </div>
                          {(() => {
                            const balance = irregularPayments.reduce((sum, p) => sum + (p.amount - rateAmount), 0);
                            const isBalanced = balance === 0;
                            return (
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
                                <div className="short-pay-status-label">Stato Attuale</div>
                                <div className={`short-pay-balance ${isBalanced ? 'balance-zero' : balance > 0 ? 'balance-positive' : 'balance-negative'}`}>
                                  <span>{isBalanced ? 'Pareggio di bilancio' : balance > 0 ? 'Credito:' : 'Debito rata:'}</span>
                                  {!isBalanced && <span>{balance > 0 ? '+' : '-'}{Math.abs(balance).toFixed(2)} €</span>}
                                </div>
                                {!isBalanced && balance < 0 && (
                                  <div className="next-rate-hint">
                                    <span>Prossima rata per il pareggio: <strong>{(rateAmount + Math.abs(balance)).toFixed(2)} €</strong></span>
                                    <button
                                      className="next-rate-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const suggestedAmount = rateAmount + Math.abs(balance);
                                        const intPart = Math.floor(suggestedAmount).toString();
                                        const decPart = Math.round((suggestedAmount - Math.floor(suggestedAmount)) * 100);
                                        setQuickPayInt(intPart);
                                        setQuickPayDec(decPart > 0 ? decPart.toString() : '');
                                        setQuickPayOriginal(`${Math.floor(rateAmount)}.${Math.round((rateAmount - Math.floor(rateAmount)) * 100) || '0'}`);
                                        setQuickPayNote('');
                                        setQuickPayId(f.id);
                                        setShortPayDetail(null);
                                      }}
                                      title="Aggiungi rata di pareggio"
                                    >
                                      →
                                    </button>
                                  </div>
                                )}
                                {isBalanced && (
                                  <button
                                    className="short-pay-delete-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDismissedAlerts(prev => new Set([...prev, f.id]));
                                      setShortPayDetail(null);
                                    }}
                                  >
                                    Elimina notifiche
                                    <span className="btn-hint">(Consigliato)</span>
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  );
                })()}
                {quickPayId === f.id ? (
                  <><hr className="card-separator" />
                  <div className="quick-pay-section" onClick={(e) => e.stopPropagation()}>
                    <div className="quick-pay-row">
                      <button
                        className="card-action-btn card-btn-cancel"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickPayId(null);
                          setQuickPayInt('');
                          setQuickPayDec('');
                          setQuickPayNote('');
                        }}
                      >
                        ←
                      </button>
                      <input
                        type="number"
                        placeholder="Euro"
                        value={quickPayInt}
                        onChange={(e) => setQuickPayInt(e.target.value)}
                        className="quick-pay-input"
                        autoFocus
                      />
                      <span className="amount-sep">,</span>
                      <input
                        type="number"
                        placeholder="Cent"
                        value={quickPayDec}
                        onChange={(e) => setQuickPayDec(e.target.value.slice(0, 2))}
                        className="quick-pay-input quick-pay-dec"
                      />
                      <span className="amount-currency">€</span>
                      <button
                        className="card-action-btn card-btn-confirm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const val = parseFloat(`${quickPayInt || '0'}.${quickPayDec || '0'}`);
                          if (!isNaN(val) && val > 0) {
                            onUpdate({
                              ...f,
                              payments: [...f.payments, {
                                id: crypto.randomUUID(),
                                amount: val,
                                date: new Date().toISOString(),
                                ...(quickPayNote ? { note: quickPayNote } : {}),
                              }],
                            });
                            showToast(`Rata di ${val.toFixed(2)} € aggiunta!`);
                          }
                          setQuickPayId(null);
                          setQuickPayInt('');
                          setQuickPayDec('');
                          setQuickPayNote('');
                        }}
                      >
                        ✓
                      </button>
                    </div>
                    {quickPayOriginal && `${quickPayInt || '0'}.${quickPayDec || '0'}` !== quickPayOriginal && (
                      <input
                        type="text"
                        placeholder="Nota: motivo della modifica (opzionale)"
                        value={quickPayNote}
                        onChange={(e) => setQuickPayNote(e.target.value)}
                        className="quick-pay-note"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div></>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nuova Cartella</h3>
            <input
              ref={nameRef}
              type="text"
              placeholder="Nome finanziamento"
              className={errors.has('name') ? 'input-error' : ''}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <p className={`modal-field-label ${errors.has('amount') ? 'label-error' : ''}`}>Importo totale da pagare <span className="required-tag">*</span></p>
            <div className={`amount-row ${errors.has('amount') ? 'input-error-row' : ''}`}>
              <input
                ref={amountRef}
                type="number"
                placeholder="Euro"
                value={amountInt}
                onChange={(e) => {
                  setAmountInt(e.target.value);
                  if (rateMode === 'fissa') {
                    const tot = parseFloat(`${e.target.value || '0'}.${amountDec || '0'}`);
                    const dur = parseInt(newDuration) || 0;
                    if (tot > 0 && dur > 0) {
                      const rata = tot / dur;
                      setFixedRateInt(Math.floor(rata).toString());
                      const d = Math.round((rata - Math.floor(rata)) * 100);
                      setFixedRateDec(d > 0 ? d.toString() : '');
                    }
                  }
                }}
              />
              <span className="amount-sep">,</span>
              <input
                type="number"
                placeholder="Cent"
                value={amountDec}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 2);
                  setAmountDec(val);
                  if (rateMode === 'fissa') {
                    const tot = parseFloat(`${amountInt || '0'}.${val || '0'}`);
                    const dur = parseInt(newDuration) || 0;
                    if (tot > 0 && dur > 0) {
                      const rata = tot / dur;
                      setFixedRateInt(Math.floor(rata).toString());
                      const d = Math.round((rata - Math.floor(rata)) * 100);
                      setFixedRateDec(d > 0 ? d.toString() : '');
                    }
                  }
                }}
                className="amount-dec"
              />
              <span className="amount-currency">€</span>
            </div>
            <p className={`modal-field-label ${errors.has('rateType') ? 'label-error' : ''}`}>Tipo di rata <span className="required-tag">*</span></p>
            <div className="rate-type-row">
              <select
                className={`modal-select ${errors.has('rateType') ? 'input-error' : ''}`}
                value={rateType}
                onChange={(e) => setRateType(e.target.value as RateType)}
              >
                <option value="" disabled>Seleziona</option>
                <option value="mensile">Mensile</option>
                <option value="bimestrale">Bimestrale</option>
                <option value="trimestrale">Trimestrale</option>
                <option value="quadrimestrale">Quadrimestrale</option>
                <option value="semestrale">Semestrale</option>
                <option value="annuale">Annuale</option>
              </select>
              <select
                className="modal-select"
                value={rateMode}
                onChange={(e) => {
                  const mode = e.target.value as 'fissa' | 'variabile' | '';
                  setRateMode(mode);
                  if (mode === 'fissa') {
                    const amount = parseFloat(`${amountInt || '0'}.${amountDec || '0'}`);
                    const duration = parseInt(newDuration) || 0;
                    if (amount > 0 && duration > 0) {
                      const rata = amount / duration;
                      setFixedRateInt(Math.floor(rata).toString());
                      const dec = Math.round((rata - Math.floor(rata)) * 100);
                      setFixedRateDec(dec > 0 ? dec.toString() : '');
                    }
                  }
                }}
              >
                <option value="" disabled>Seleziona</option>
                <option value="variabile">Variabile</option>
                <option value="fissa">Fissa</option>
              </select>
            </div>
            <p className={`modal-field-label ${errors.has('duration') ? 'label-error' : ''}`}>N° Rate da pagare <span className="required-tag">*</span></p>
            <div className="inline-field" style={{ justifyContent: 'center' }}>
              <div className="stepper">
                <button type="button" className="stepper-btn stepper-btn-minus" {...stepperMinus(() => parseInt(newDuration) || 0, handleDurationChange)}>−</button>
                <input
                  ref={durationRef}
                  type="number"
                  min="0"
                  value={newDuration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="stepper-input"
                />
                <button type="button" className="stepper-btn stepper-btn-plus" {...stepperPlus(() => parseInt(newDuration) || 0, handleDurationChange)}>+</button>
              </div>
            </div>
            {rateMode === 'fissa' && (
              <>
                <p className="modal-field-label">Importo singola rata</p>
                <div className="amount-row">
                  <input
                    type="number"
                    placeholder="Euro"
                    value={fixedRateInt}
                    onChange={(e) => {
                      setFixedRateInt(e.target.value);
                      const rata = parseFloat(`${e.target.value || '0'}.${fixedRateDec || '0'}`);
                      const amount = parseFloat(`${amountInt || '0'}.${amountDec || '0'}`);
                      if (rata > 0 && amount > 0) {
                        handleDurationChange(Math.ceil(amount / rata).toString());
                      }
                    }}
                  />
                  <span className="amount-sep">,</span>
                  <input
                    type="number"
                    placeholder="Cent"
                    value={fixedRateDec}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 2);
                      setFixedRateDec(val);
                      const rata = parseFloat(`${fixedRateInt || '0'}.${val || '0'}`);
                      const amount = parseFloat(`${amountInt || '0'}.${amountDec || '0'}`);
                      if (rata > 0 && amount > 0) {
                        handleDurationChange(Math.ceil(amount / rata).toString());
                      }
                    }}
                    className="amount-dec"
                  />
                  <span className="amount-currency">€</span>
                </div>
              </>
            )}
            {(parseInt(newDuration) || 0) > 0 && (
              <>
                <p className="modal-field-label">Periodo <span className="optional-tag">(opzionale)</span></p>
                <div className="date-row">
                  <div className="date-field">
                    <label>Inizio</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>
                  <div className="date-field">
                    <label>Fine</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="inline-field">
              <p className="modal-field-label">N° Rate già pagate <span className="optional-tag">(opzionale)</span></p>
              <div className="stepper">
                <button type="button" className="stepper-btn stepper-btn-minus" {...stepperMinus(() => parseInt(initialPaidRates) || 0, updatePaidRatesCount)}>−</button>
                <input
                  type="number"
                  min="0"
                  value={initialPaidRates}
                  onChange={(e) => updatePaidRatesCount(e.target.value)}
                  className="stepper-input"
                />
                <button type="button" className="stepper-btn stepper-btn-plus" {...stepperPlus(() => parseInt(initialPaidRates) || 0, updatePaidRatesCount)}>+</button>
              </div>
            </div>
            {(parseInt(initialPaidRates) || 0) > 0 && (
              <>
                <p className={`modal-field-label ${errors.has('paidAmount') ? 'label-error' : ''}`}>Importo rate pagate <span className="required-tag">*</span></p>
                <div className={`paid-mode-toggle ${errors.has('paidAmount') ? 'input-error-row' : ''}`}>
                  <div className={`paid-mode-slider ${paidMode === 'totale' ? 'right' : 'left'}`} />
                  <button
                    className={`paid-mode-btn ${paidMode === 'singola' ? 'active' : ''}`}
                    onClick={() => setPaidMode('singola')}
                  >
                    Singola
                  </button>
                  <button
                    className={`paid-mode-btn ${paidMode === 'totale' ? 'active' : ''}`}
                    onClick={() => setPaidMode('totale')}
                  >
                    Totale
                  </button>
                </div>
                <div className="paid-carousel">
                  <div className={`paid-carousel-track ${paidMode === 'singola' ? 'show-left' : 'show-right'}`}>
                    <div className="paid-carousel-panel">
                      <div className="single-rates-list">
                        {singleRates.map((r, i) => (
                          <div key={i} className="single-rate-card">
                            <span className="single-rate-label">Rata {i + 1}</span>
                            <div className="amount-row">
                              <input
                                type="number"
                                placeholder="Euro"
                                value={r.int}
                                onChange={(e) => {
                                  const arr = [...singleRates];
                                  arr[i] = { ...arr[i], int: e.target.value };
                                  setSingleRates(arr);
                                }}
                              />
                              <span className="amount-sep">,</span>
                              <input
                                type="number"
                                placeholder="Cent"
                                value={r.dec}
                                onChange={(e) => {
                                  const arr = [...singleRates];
                                  arr[i] = { ...arr[i], dec: e.target.value.slice(0, 2) };
                                  setSingleRates(arr);
                                }}
                                className="amount-dec"
                              />
                              <span className="amount-currency">€</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="paid-carousel-panel">
                      <div className="amount-row">
                        <input
                          type="number"
                          placeholder="Euro"
                          value={initialPaidInt}
                          onChange={(e) => setInitialPaidInt(e.target.value)}
                        />
                        <span className="amount-sep">,</span>
                        <input
                          type="number"
                          placeholder="Cent"
                          value={initialPaidDec}
                          onChange={(e) => setInitialPaidDec(e.target.value.slice(0, 2))}
                          className="amount-dec"
                        />
                        <span className="amount-currency">€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            <p className="emoji-picker-title">Icona</p>
            <div className="emoji-picker">
              {getVisibleEmojis(selectedEmoji).map((e) => (
                <button
                  key={e}
                  className={`emoji-btn ${selectedEmoji === e ? 'selected' : ''}`}
                  onClick={() => setSelectedEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <button className="emoji-toggle-btn" onClick={() => setShowAllEmojis(!showAllEmojis)}>
              {showAllEmojis ? 'Mostra di meno' : 'Mostra di più'}
            </button>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Annulla
              </button>
              <button className="btn-primary" onClick={handleCreate}>
                Crea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale conferma eliminazione */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal modal-small" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDeleteConfirmId(null)}>×</button>
            <h3>Eliminare questa cartella?</h3>
            <p className="delete-confirm-text">Questa azione non puo' essere annullata.</p>
            <div className="modal-actions">
              <button
                className="btn-danger"
                onClick={() => {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale modifica */}
      {editId && (
        <div className="modal-overlay" onClick={() => setEditId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Modifica Cartella</h3>
            <input
              type="text"
              placeholder="Nome finanziamento"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <p className="modal-field-label">Importo totale da pagare <span className="required-tag">*</span></p>
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
            <p className="modal-field-label">Durata <span className="required-tag">*</span></p>
            <div className="duration-row">
              <select
                className="duration-select"
                value={editDurationType}
                onChange={(e) => handleEditDurationType(e.target.value as 'mesi' | 'anni')}
              >
                <option value="mesi">Mesi</option>
                <option value="anni">Anni</option>
              </select>
              <input
                type="number"
                placeholder="Durata"
                value={editDuration}
                onChange={(e) => handleEditDuration(e.target.value)}
              />
            </div>
            {(parseInt(editDuration) || 0) > 0 && (
              <>
                <p className="modal-field-label">Periodo <span className="optional-tag">(opzionale)</span></p>
                <div className="date-row">
                  <div className="date-field">
                    <label>Inizio</label>
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => handleEditStartDate(e.target.value)}
                    />
                  </div>
                  <div className="date-field">
                    <label>Fine</label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => handleEditEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            <p className="modal-field-label">Tipo di rata <span className="required-tag">*</span></p>
            <div className="rate-type-row">
              <select
                className="modal-select"
                value={editRateType}
                onChange={(e) => setEditRateType(e.target.value as RateType)}
              >
                <option value="mensile">Mensile</option>
                <option value="bimestrale">Bimestrale</option>
                <option value="trimestrale">Trimestrale</option>
                <option value="quadrimestrale">Quadrimestrale</option>
                <option value="semestrale">Semestrale</option>
                <option value="annuale">Annuale</option>
              </select>
              <select
                className="modal-select"
                value={editRateMode}
                onChange={(e) => {
                  const mode = e.target.value as 'fissa' | 'variabile';
                  setEditRateMode(mode);
                  if (mode === 'fissa') {
                    const amount = parseFloat(`${editAmountInt || '0'}.${editAmountDec || '0'}`);
                    const dur = parseInt(editDuration) || 0;
                    if (amount > 0 && dur > 0) {
                      const rata = amount / dur;
                      setEditFixedRateInt(Math.floor(rata).toString());
                      const dec = Math.round((rata - Math.floor(rata)) * 100);
                      setEditFixedRateDec(dec > 0 ? dec.toString() : '');
                    }
                  }
                }}
              >
                <option value="variabile">Variabile</option>
                <option value="fissa">Fissa</option>
              </select>
            </div>
            {editRateMode === 'fissa' && (
              <>
                <p className="modal-field-label">Importo singola rata</p>
                <div className="amount-row">
                  <input
                    type="number"
                    placeholder="Euro"
                    value={editFixedRateInt}
                    onChange={(e) => {
                      setEditFixedRateInt(e.target.value);
                      const rata = parseFloat(`${e.target.value || '0'}.${editFixedRateDec || '0'}`);
                      const dur = parseInt(editDuration) || 0;
                      if (rata > 0 && dur > 0) {
                        const tot = rata * dur;
                        setEditAmountInt(Math.floor(tot).toString());
                        const dec = Math.round((tot - Math.floor(tot)) * 100);
                        setEditAmountDec(dec > 0 ? dec.toString() : '');
                      }
                    }}
                  />
                  <span className="amount-sep">,</span>
                  <input
                    type="number"
                    placeholder="Cent"
                    value={editFixedRateDec}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 2);
                      setEditFixedRateDec(val);
                      const rata = parseFloat(`${editFixedRateInt || '0'}.${val || '0'}`);
                      const dur = parseInt(editDuration) || 0;
                      if (rata > 0 && dur > 0) {
                        const tot = rata * dur;
                        setEditAmountInt(Math.floor(tot).toString());
                        const dec = Math.round((tot - Math.floor(tot)) * 100);
                        setEditAmountDec(dec > 0 ? dec.toString() : '');
                      }
                    }}
                    className="amount-dec"
                  />
                  <span className="amount-currency">€</span>
                </div>
              </>
            )}
            <div className="inline-field">
              <p className="modal-field-label">N° Rate già pagate <span className="optional-tag">(opzionale)</span></p>
              <div className="stepper">
                <button type="button" className="stepper-btn stepper-btn-minus" {...stepperMinus(() => parseInt(editInitialPaidRates) || 0, updateEditPaidRatesCount)}>−</button>
                <input
                  type="number"
                  min="0"
                  value={editInitialPaidRates}
                  onChange={(e) => updateEditPaidRatesCount(e.target.value)}
                  className="stepper-input"
                />
                <button type="button" className="stepper-btn stepper-btn-plus" {...stepperPlus(() => parseInt(editInitialPaidRates) || 0, updateEditPaidRatesCount)}>+</button>
              </div>
            </div>
            {(parseInt(editInitialPaidRates) || 0) > 0 && (
              <>
                <p className="modal-field-label">Importo rate pagate <span className="required-tag">*</span></p>
                <div className="paid-mode-toggle">
                  <div className={`paid-mode-slider ${editPaidMode === 'totale' ? 'right' : 'left'}`} />
                  <button
                    className={`paid-mode-btn ${editPaidMode === 'singola' ? 'active' : ''}`}
                    onClick={() => setEditPaidMode('singola')}
                  >
                    Singola
                  </button>
                  <button
                    className={`paid-mode-btn ${editPaidMode === 'totale' ? 'active' : ''}`}
                    onClick={() => setEditPaidMode('totale')}
                  >
                    Totale
                  </button>
                </div>
                <div className="paid-carousel">
                  <div className={`paid-carousel-track ${editPaidMode === 'singola' ? 'show-left' : 'show-right'}`}>
                    <div className="paid-carousel-panel">
                      <div className="single-rates-list">
                        {editSingleRates.map((r, i) => (
                          <div key={i} className="single-rate-card">
                            <span className="single-rate-label">Rata {i + 1}</span>
                            <div className="amount-row">
                              <input
                                type="number"
                                placeholder="Euro"
                                value={r.int}
                                onChange={(e) => {
                                  const arr = [...editSingleRates];
                                  arr[i] = { ...arr[i], int: e.target.value };
                                  setEditSingleRates(arr);
                                }}
                              />
                              <span className="amount-sep">,</span>
                              <input
                                type="number"
                                placeholder="Cent"
                                value={r.dec}
                                onChange={(e) => {
                                  const arr = [...editSingleRates];
                                  arr[i] = { ...arr[i], dec: e.target.value.slice(0, 2) };
                                  setEditSingleRates(arr);
                                }}
                                className="amount-dec"
                              />
                              <span className="amount-currency">€</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="paid-carousel-panel">
                      <div className="amount-row">
                        <input
                          type="number"
                          placeholder="Euro"
                          value={editInitialPaidInt}
                          onChange={(e) => setEditInitialPaidInt(e.target.value)}
                        />
                        <span className="amount-sep">,</span>
                        <input
                          type="number"
                          placeholder="Cent"
                          value={editInitialPaidDec}
                          onChange={(e) => setEditInitialPaidDec(e.target.value.slice(0, 2))}
                          className="amount-dec"
                        />
                        <span className="amount-currency">€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            <p className="emoji-picker-title">Icona</p>
            <div className="emoji-picker">
              {getVisibleEmojis(editEmoji).map((e) => (
                <button
                  key={e}
                  className={`emoji-btn ${editEmoji === e ? 'selected' : ''}`}
                  onClick={() => setEditEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <button className="emoji-toggle-btn" onClick={() => setShowAllEmojis(!showAllEmojis)}>
              {showAllEmojis ? 'Mostra di meno' : 'Mostra di più'}
            </button>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditId(null)}>
                Annulla
              </button>
              <button className="btn-primary" onClick={handleSaveEdit}>
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  );
}
