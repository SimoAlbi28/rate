import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { AppsListDetail24Regular } from '@fluentui/react-icons';
import type { Financing, RateType, Payment } from '../types';

interface Props {
  financings: Financing[];
  onAdd: (name: string, emoji: string, totalAmount: number, totalMonths: number, rateType: RateType, rateMode: 'fissa' | 'variabile', startDate: string, endDate: string, initialPaid: number, initialPaidRates: number, fixedRateAmount?: number, initialPayments?: Payment[]) => void;
  onDelete: (id: string) => void;
  onUpdate: (updated: Financing) => void;
}

const EMOJI_OPTIONS = [
  '💰', '🚗', '🏠', '📱', '💻', '🏍️', '📺', '🎓', '✈️', '💳',
  '🛒', '🏥', '🦷', '⚡', '💧', '🔥', '📡', '🏋️', '🎮',
  '📦', '🐶', '🐱', '👶', '💍', '🛋️', '🧹', '🚌', '🅿️', '📰', '🏦',
];

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

export default function HomePage({ financings, onAdd, onDelete, onUpdate }: Props) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'tutti' | 'debito' | 'credito' | 'pareggio' | 'concluso'>('tutti');
  const [filterRateMode, setFilterRateMode] = useState<'tutti' | 'fissa' | 'variabile'>('tutti');
  const [showProfile, setShowProfile] = useState(false);
  const [profileIcon, setProfileIcon] = useState(() => localStorage.getItem('profileIcon') || '👤');
  const [profileColor, setProfileColor] = useState(() => localStorage.getItem('profileColor') || '#3498db');
  const [tempProfileIcon, setTempProfileIcon] = useState('');
  const [tempProfileColor, setTempProfileColor] = useState('');
  const [showAllProfileIcons, setShowAllProfileIcons] = useState(false);
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
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dismissedAlerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const updateDismissedAlerts = (updater: (prev: Set<string>) => Set<string>) => {
    setDismissedAlerts(prev => {
      const next = updater(prev);
      localStorage.setItem('dismissedAlerts', JSON.stringify([...next]));
      return next;
    });
  };
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
  const [, /* paidSlideDir */] = useState<'slide-left' | 'slide-right'>('slide-right');
  const [singleRates, setSingleRates] = useState<{ int: string; dec: string; date: string }[]>([]);
  const [missingDates, setMissingDates] = useState<Set<number>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // FLIP animation refs
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevPositions = useRef<Map<string, DOMRect>>(new Map());
  const prevOrder = useRef<string[]>([]);
  const [sortMode, setSortMode] = useState<'default' | 'progress-desc' | 'progress-asc'>(() => {
    const saved = localStorage.getItem('sortMode');
    if (saved === 'progress-desc' || saved === 'progress-asc') return saved;
    return 'default';
  });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const dateRefs = useRef<(HTMLDivElement | null)[]>([]);
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
    if (f.fixedRateAmount && f.fixedRateAmount > 0) {
      const frInt = Math.floor(f.fixedRateAmount);
      const frDec = Math.round((f.fixedRateAmount - frInt) * 100);
      setEditFixedRateInt(frInt.toString());
      setEditFixedRateDec(frDec > 0 ? frDec.toString() : '');
    } else {
      setEditFixedRateInt('');
      setEditFixedRateDec('');
    }
    const totalPaidRates = (f.initialPaidRates || 0) + f.payments.length;
    setEditInitialPaidRates(totalPaidRates.toString());
    // Build single rates array: initial rates + payment rates
    const singleRatesArr: { int: string; dec: string }[] = [];
    // Initial paid rates (use fixedRateAmount or divide initialPaid evenly)
    const initRateCount = f.initialPaidRates || 0;
    if (initRateCount > 0) {
      const perRate = f.fixedRateAmount || ((f.initialPaid || 0) / initRateCount);
      for (let i = 0; i < initRateCount; i++) {
        const ri = Math.floor(perRate);
        const rd = Math.round((perRate - ri) * 100);
        singleRatesArr.push({ int: ri.toString(), dec: rd > 0 ? rd.toString() : '' });
      }
    }
    // Payment rates
    for (const p of f.payments) {
      const pi = Math.floor(p.amount);
      const pd = Math.round((p.amount - pi) * 100);
      singleRatesArr.push({ int: pi.toString(), dec: pd > 0 ? pd.toString() : '' });
    }
    setEditSingleRates(singleRatesArr);
    setEditStartDate(f.startDate || '');
    setEditEndDate(f.endDate || '');
    const totalPaid = (f.initialPaid || 0) + f.payments.reduce((s, p) => s + p.amount, 0);
    const ipInt = Math.floor(totalPaid);
    const ipDec = Math.round((totalPaid - ipInt) * 100);
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
    const months = editDurationType === 'anni' ? dur * 12 : dur;
    const fixedRate = editRateMode === 'fissa' ? parseFloat(`${editFixedRateInt || '0'}.${editFixedRateDec || '0'}`) : f.fixedRateAmount;
    let interestPerRate = f.interestPerRate;
    let totalInterest = f.totalInterest;
    if (editRateMode === 'fissa' && fixedRate && fixedRate > 0 && months > 0) {
      const totalWithInterest = fixedRate * months;
      totalInterest = totalWithInterest - amount;
      interestPerRate = totalInterest / months;
    }
    onUpdate({
      ...f,
      name: editName.trim(),
      emoji: editEmoji,
      totalAmount: amount,
      totalMonths: months,
      rateType: editRateType,
      rateMode: editRateMode as 'fissa' | 'variabile',
      startDate: editStartDate,
      endDate: editEndDate,
      fixedRateAmount: fixedRate,
      interestPerRate,
      totalInterest,
    });
    setEditId(null);
  };

  const hasEditChanges = () => {
    const f = financings.find((x) => x.id === editId);
    if (!f) return false;
    const amount = parseFloat(`${editAmountInt || '0'}.${editAmountDec || '0'}`);
    const dur = parseInt(editDuration) || 0;
    const months = editDurationType === 'anni' ? dur * 12 : dur;
    const fixedRate = parseFloat(`${editFixedRateInt || '0'}.${editFixedRateDec || '0'}`);
    return (
      editName.trim() !== f.name ||
      editEmoji !== f.emoji ||
      Math.abs(amount - f.totalAmount) > 0.001 ||
      months !== f.totalMonths ||
      editRateType !== (f.rateType || 'mensile') ||
      editStartDate !== (f.startDate || '') ||
      editEndDate !== (f.endDate || '') ||
      (f.fixedRateAmount ? Math.abs(fixedRate - f.fixedRateAmount) > 0.001 : fixedRate > 0)
    );
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


  const autoFillRates = (n: number, rateIntVal: string, rateDecVal: string, mode: 'fissa' | 'variabile') => {
    if (mode === 'fissa' && (rateIntVal || rateDecVal)) {
      return Array(n).fill(null).map(() => ({
        int: rateIntVal || '',
        dec: rateDecVal || '',
        date: '',
      }));
    }
    return null;
  };

  const recalcPaidTotal = (rates: { int: string; dec: string; date: string }[]) => {
    const total = rates.reduce((sum, r) => sum + parseFloat(`${r.int || '0'}.${r.dec || '0'}`), 0);
    setInitialPaidInt(Math.floor(total).toString());
    const dec = Math.round((total - Math.floor(total)) * 100);
    setInitialPaidDec(dec > 0 ? dec.toString() : '');
  };

  const updatePaidRatesCount = (val: string) => {
    setInitialPaidRates(val);
    const n = parseInt(val) || 0;
    const filled = rateMode ? autoFillRates(n, fixedRateInt, fixedRateDec, rateMode) : null;
    if (filled) {
      setSingleRates(filled);
      recalcPaidTotal(filled);
    } else {
      setSingleRates((prev) => {
        const updated = n > prev.length ? [...prev, ...Array(n - prev.length).fill({ int: '', dec: '', date: '' })] : prev.slice(0, n);
        recalcPaidTotal(updated);
        return updated;
      });
    }
  };


  const getBalance = (f: Financing) => {
    const ra = f.fixedRateAmount || (f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0);
    if ((f.rateMode || 'variabile') !== 'fissa' || ra <= 0) return 0;
    if (f.payments.length === 0) return 0;
    const totalPaid = f.payments.reduce((sum, p) => sum + p.amount, 0);
    return totalPaid - (f.payments.length * ra);
  };

  const filteredFinancings = financings
    .filter(f => {
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterRateMode === 'fissa' && (f.rateMode || 'variabile') !== 'fissa') return false;
      if (filterRateMode === 'variabile' && (f.rateMode || 'variabile') !== 'variabile') return false;
      if (filterType === 'tutti') return true;
      const paid = f.payments.reduce((s, p) => s + p.amount, 0) + (f.initialPaid || 0);
      const intPaid = f.interestPerRate ? f.interestPerRate * (f.payments.length + (f.initialPaidRates || 0)) : 0;
      const capitalPaid = Math.max(paid - intPaid, 0);
      const progress = f.totalAmount > 0 ? (capitalPaid / f.totalAmount) * 100 : 0;
      if (filterType === 'concluso') return progress >= 100;
      if (filterType === 'pareggio') return progress < 100 && Math.abs(getBalance(f)) < 0.01;
      if (filterType === 'debito') return getBalance(f) < 0;
      if (filterType === 'credito') return getBalance(f) > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortMode !== 'default') {
        const getProgress = (f: Financing) => {
          const p = f.payments.reduce((s, pp) => s + pp.amount, 0) + (f.initialPaid || 0);
          const intP = f.interestPerRate ? f.interestPerRate * (f.payments.length + (f.initialPaidRates || 0)) : 0;
          const capP = Math.max(p - intP, 0);
          return f.totalAmount > 0 ? (capP / f.totalAmount) * 100 : 0;
        };
        if (sortMode === 'progress-desc') return getProgress(b) - getProgress(a);
        if (sortMode === 'progress-asc') return getProgress(a) - getProgress(b);
      }
      if (filterType === 'debito') return getBalance(a) - getBalance(b);
      if (filterType === 'credito') return getBalance(b) - getBalance(a);
      return a.name.localeCompare(b.name);
    });

  // FLIP animation: detect order changes
  const currentOrderKey = filteredFinancings.map(f => f.id).join(',');

  useLayoutEffect(() => {
    // Animate cards that moved
    const prevOrderStr = prevOrder.current.join(',');
    if (prevOrderStr && prevOrderStr !== currentOrderKey) {
      cardRefs.current.forEach((el, id) => {
        if (!el) return;
        const prev = prevPositions.current.get(id);
        if (!prev) return;
        const curr = el.getBoundingClientRect();
        const deltaY = prev.top - curr.top;
        const deltaX = prev.left - curr.left;
        if (Math.abs(deltaY) < 2 && Math.abs(deltaX) < 2) return;
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        el.style.transition = 'none';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transform = '';
            el.style.transition = 'transform 0.4s ease';
            el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
          });
        });
      });
    }
    // Save current positions and order for next render
    const positions = new Map<string, DOMRect>();
    cardRefs.current.forEach((el, id) => {
      if (el) positions.set(id, el.getBoundingClientRect());
    });
    prevPositions.current = positions;
    prevOrder.current = filteredFinancings.map(f => f.id);
  }, [currentOrderKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setTimeout(() => setToast(null), 3500);
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

  const handleDurationChange = (val: string) => {
    setNewDuration(val);
    const d = parseInt(val) || 0;
    const months = durationType === 'anni' ? d * 12 : d;
    if (startDate && months > 0) {
      setEndDate(addMonthsToDate(startDate, months));
    } else if (endDate && months > 0) {
      setStartDate(subMonthsFromDate(endDate, months));
    }
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
    const initialPayments: Payment[] = [];
    const missingDateIndices = new Set<number>();
    if (paidRates > 0) {
      let hasInvalidAmount = false;
      singleRates.forEach((r, i) => {
        const amt = parseFloat(`${r.int || '0'}.${r.dec || '0'}`);
        if (amt <= 0) hasInvalidAmount = true;
        if (!r.date) missingDateIndices.add(i);
        if (amt > 0 && r.date) {
          initialPayments.push({ id: crypto.randomUUID(), amount: amt, date: new Date(r.date).toISOString() });
        }
      });
      if (hasInvalidAmount) {
        missing.push('paidAmount');
        if (!firstRef) firstRef = paidAmountRef.current;
      }
      if (missingDateIndices.size > 0) {
        missing.push('paidDates');
        setMissingDates(missingDateIndices);
        setTimeout(() => setMissingDates(new Set()), 3000);
        const firstMissingIdx = Math.min(...missingDateIndices);
        if (dateRefs.current[firstMissingIdx]) {
          dateRefs.current[firstMissingIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      if (initialPayments.length !== paidRates) {
        if (!missing.includes('paidAmount') && !missing.includes('paidDates')) {
          missing.push('paidAmount');
        }
      }
    }

    if (missing.length > 0) {
      showErrors(missing, firstRef);
      return;
    }
    const months = durationType === 'anni' ? duration * 12 : duration;
    const fixedRate = rateMode === 'fissa' ? parseFloat(`${fixedRateInt || '0'}.${fixedRateDec || '0'}`) : undefined;
    onAdd(newName.trim(), selectedEmoji, amount, months, rateType as RateType, rateMode as 'fissa' | 'variabile', startDate, endDate, 0, 0, fixedRate, initialPayments);
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
          <div className="navbar-left">
            <img src="/rate-logo.png" alt="Logo" className="navbar-logo-img" />
          </div>
          <div className="navbar-center">
            <h1>Rate & Pagamenti</h1>
            <p className="navbar-tagline">Tutto quello che devi pagare, qui.</p>
          </div>
          <button className="navbar-profile" style={{ background: profileColor }} onClick={() => { setTempProfileIcon(profileIcon); setTempProfileColor(profileColor); setShowProfile(true); }}>
            <span>{profileIcon}</span>
          </button>
        </nav>

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
        <div className="sticky-bar">
          <h2 className="section-title">CARTELLE</h2>
          <div className="toolbar">
            <div style={{ position: 'relative' }}>
              <button
                className="toolbar-btn"
                onClick={() => setShowSortMenu(!showSortMenu)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 50, height: 42, padding: 0, boxSizing: 'border-box' }}
                title="Ordinamento"
              >
                {sortMode === 'default' && <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>A-Z</span>}
                {sortMode === 'progress-desc' && <img src="/green-line.jpg" alt="" style={{ width: 22, height: 'auto' }} />}
                {sortMode === 'progress-asc' && <img src="/red-line.jpg" alt="" style={{ width: 22, height: 'auto' }} />}
              </button>
              {showSortMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowSortMenu(false)} />
                  <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0', zIndex: 100, minWidth: '200px', overflow: 'hidden' }}>
                    {([
                      { key: 'default' as const, label: 'Predefinito (A-Z)' },
                      { key: 'progress-desc' as const, label: 'Più vicini al completamento' },
                      { key: 'progress-asc' as const, label: 'Più lontani dal completamento' },
                    ]).map((item) => (
                      <button
                        key={item.key}
                        onClick={() => { setSortMode(item.key); localStorage.setItem('sortMode', item.key); setShowSortMenu(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 0.75rem',
                          background: sortMode === item.key ? '#ebf5fb' : 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: '0.78rem', color: sortMode === item.key ? '#2980b9' : '#333', fontWeight: sortMode === item.key ? 700 : 400,
                          borderBottom: '1px solid #f0f0f0', textAlign: 'left'
                        }}
                      >
                        <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.key === 'default' && <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>A-Z</span>}
                          {item.key === 'progress-desc' && <img src="/green-line.jpg" alt="" style={{ width: 20, height: 'auto' }} />}
                          {item.key === 'progress-asc' && <img src="/red-line.jpg" alt="" style={{ width: 20, height: 'auto' }} />}
                        </span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="toolbar-btn toolbar-btn-create" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Plus size={18} /> Crea
            </button>
            <button
              className={`toolbar-btn toolbar-btn-search ${showSearch ? 'active' : ''}`}
              onClick={() => {
                if (showSearch) {
                  setSearchClosing(true);
                  setTimeout(() => { setShowSearch(false); setSearchClosing(false); }, 120);
                } else {
                  setShowSearch(true);
                }
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Search size={18} />
            </button>
            {!showSearch && (searchQuery || filterType !== 'tutti' || filterRateMode !== 'tutti') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterType('tutti'); setFilterRateMode('tutti'); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#c0392b', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', padding: '0.5rem 0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                title="Reset filtri"
              >
                <X size={18} color="white" />
              </button>
            )}
          </div>
          {showSearch && (
            <div className={`search-bar ${searchClosing ? 'closing' : ''}`}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Cerca per nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  style={{ position: 'absolute', right: '0.75rem', top: '-6px', bottom: 0, margin: 'auto', height: 'fit-content', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', opacity: (searchQuery || filterType !== 'tutti' || filterRateMode !== 'tutti') ? 1 : 0, pointerEvents: (searchQuery || filterType !== 'tutti' || filterRateMode !== 'tutti') ? 'auto' : 'none' }}
                  onClick={() => { setSearchQuery(''); setFilterType('tutti'); setFilterRateMode('tutti'); }}
                  title="Reset filtri"
                >
                  <X size={18} color="#999" />
                </button>
              </div>
              <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <div style={{ display: 'flex', gap: '0.35rem', whiteSpace: 'nowrap', minWidth: 'min-content' }}>
                  <button
                    className={`filter-btn ${filterRateMode === 'fissa' ? 'active' : ''}`}
                    style={filterRateMode === 'fissa' ? { background: '#8e44ad', color: 'white', borderColor: '#8e44ad' } : { color: '#8e44ad', borderColor: '#8e44ad' }}
                    onClick={() => setFilterRateMode(filterRateMode === 'fissa' ? 'tutti' : 'fissa')}
                  >
                    Fissa
                  </button>
                  <button
                    className={`filter-btn ${filterRateMode === 'variabile' ? 'active' : ''}`}
                    style={filterRateMode === 'variabile' ? { background: '#e91e8a', color: 'white', borderColor: '#e91e8a' } : { color: '#e91e8a', borderColor: '#e91e8a' }}
                    onClick={() => setFilterRateMode(filterRateMode === 'variabile' ? 'tutti' : 'variabile')}
                  >
                    Variabile
                  </button>
                  <span style={{ width: '1px', height: '1.5rem', background: '#ccc', flexShrink: 0, alignSelf: 'center' }} />
                  <button
                    className={`filter-btn ${filterType === 'pareggio' ? 'active' : ''}`}
                    style={filterType === 'pareggio' ? { background: '#27ae60', color: 'white', borderColor: '#27ae60' } : { color: '#27ae60', borderColor: '#27ae60' }}
                    onClick={() => setFilterType(filterType === 'pareggio' ? 'tutti' : 'pareggio')}
                  >
                    Pareggio
                  </button>
                  <button
                    className={`filter-btn ${filterType === 'debito' ? 'active' : ''}`}
                    style={filterType === 'debito' ? { background: '#c0392b', color: 'white', borderColor: '#c0392b' } : { color: '#c0392b', borderColor: '#c0392b' }}
                    onClick={() => setFilterType(filterType === 'debito' ? 'tutti' : 'debito')}
                  >
                    Debito
                  </button>
                  <button
                    className={`filter-btn ${filterType === 'credito' ? 'active' : ''}`}
                    style={filterType === 'credito' ? { background: '#3498db', color: 'white', borderColor: '#3498db' } : { color: '#3498db', borderColor: '#3498db' }}
                    onClick={() => setFilterType(filterType === 'credito' ? 'tutti' : 'credito')}
                  >
                    Credito
                  </button>
                  <button
                    className={`filter-btn ${filterType === 'concluso' ? 'active' : ''}`}
                    style={filterType === 'concluso' ? { background: '#00c853', color: 'white', borderColor: '#00c853' } : { color: '#00c853', borderColor: '#00c853' }}
                    onClick={() => setFilterType(filterType === 'concluso' ? 'tutti' : 'concluso')}
                  >
                    Concluso
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="content">
        <div className="cards-grid">
          {filteredFinancings.map((f) => {
            const paid = f.payments.reduce((s, p) => s + p.amount, 0) + (f.initialPaid || 0);
            const rateAmount = f.fixedRateAmount || (f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0);
            // Per fissa: multipli della rata contano N rate. Per variabile: ogni pagamento = 1 rata.
            const isFixedMode = (f.rateMode || 'variabile') === 'fissa' && rateAmount > 0;
            const maxRatesHP = f.totalMonths - (f.initialPaidRates || 0);
            const effectiveRatesHP = (() => {
              if (!isFixedMode || rateAmount <= 0) return f.payments.length;
              let cum = 0;
              for (const p of f.payments) {
                const ratio = p.amount / rateAmount;
                const rounded = Math.round(ratio);
                const isMult = rounded >= 1 && Math.abs(p.amount - rounded * rateAmount) < 0.01;
                if (isMult) { cum += Math.min(rounded, Math.max(maxRatesHP - cum, 0)); } else { cum += 1; }
              }
              return cum;
            })();
            const totalRatesHP = effectiveRatesHP + (f.initialPaidRates || 0);
            const ratesPaid = totalRatesHP;
            const remainingMonths = f.totalMonths - ratesPaid;
            const maxReachedHP = f.totalMonths > 0 && totalRatesHP >= f.totalMonths;

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
                ref={(el) => { if (el) cardRefs.current.set(f.id, el); else cardRefs.current.delete(f.id); }}
                className="card financing-card"
                onClick={() => {
                  setExpandedCards(prev => {
                    const n = new Set(prev);
                    if (n.has(f.id)) n.delete(f.id); else n.add(f.id);
                    return n;
                  });
                }}
              >
                <div className="card-top-row" style={{ background: (f.rateMode || 'variabile') === 'fissa' ? '#f3e8ff' : '#ffe8f0', borderRadius: '0.75rem', margin: '-1rem -1rem 0', padding: '0.75rem 1rem' }}>
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
                      disabled={maxReachedHP}
                      style={maxReachedHP ? { opacity: 0.4, pointerEvents: 'none' } : {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (quickPayId === f.id) {
                          setQuickPayId(null);
                          return;
                        }
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
                        setTimeout(() => {
                          document.getElementById(`quickpay-${f.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      }}
                      title="Aggiungi rata"
                    >
                      <Plus size={10} strokeWidth={3} /><span style={{ position: 'relative', top: '-0.5px' }}>Rata</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/detail/${f.id}`);
                      }}
                      className="riepilogo-icon-box"
                      style={{ background: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', boxSizing: 'border-box', lineHeight: 0, position: 'relative' }}
                      title="Apri dettaglio"
                    >
                      <AppsListDetail24Regular style={{ fontSize: 15, color: '#2ecc71', position: 'absolute', clipPath: 'inset(0 0 50% 0)' }} />
                      <AppsListDetail24Regular style={{ fontSize: 15, color: '#e74c3c', position: 'absolute', clipPath: 'inset(50% 0 0 0)' }} />
                    </button>
                  </div>
                </div>
                {expandedCards.has(f.id) && (<>
                <hr className="card-separator" />
                {formatPeriod() && <div className="card-period-center">{formatPeriod()}</div>}
                <div className="card-info-center" style={{ color: '#333' }}>Rate mancanti: {remainingMonths > 0 ? remainingMonths : 0} su {f.totalMonths}</div>
                <hr className="card-separator" />
                <div className="card-info-table">
                  {(() => {
                    const totalRatesPaid = f.payments.length + (f.initialPaidRates || 0);
                    const interestPaid = f.interestPerRate ? f.interestPerRate * totalRatesPaid : 0;
                    const capitalPaid = paid - interestPaid;
                    return (
                      <>
                        {(f.rateMode || 'variabile') === 'fissa' && f.interestPerRate != null && f.interestPerRate > 0 ? (
                          <>
                            <div className="card-info-center" style={{ color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase' as const }}>Senza interessi</div>
                            <div className="card-info card-info-red"><span>Totale da pagare:</span><span>{f.totalAmount.toFixed(2)} €</span></div>
                            <div className="card-info card-info-green"><span>Totale Pagato:</span><span>{capitalPaid > 0.004 ? capitalPaid.toFixed(2) + ' €' : '- €'}</span></div>
                            <hr className="card-separator" />
                            <div className="card-info card-info-yellow"><span>Restante:</span><span>{(() => {
                              const r = f.totalAmount - (capitalPaid > 0 ? capitalPaid : 0);
                              return r > 0.004 ? r.toFixed(2) + ' €' : '- €';
                            })()}</span></div>
                            <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '6px 0', opacity: 0.3 }} />
                            <div className="card-info-center" style={{ color: '#3498db', fontWeight: 'bold', textTransform: 'uppercase' as const }}>Con interessi</div>
                            <div className="card-info" style={{ color: '#e74c3c' }}><span>Totale da pagare:</span><span>{(f.totalAmount + f.interestPerRate * f.totalMonths).toFixed(2)} €</span></div>
                            <div className="card-info" style={{ color: '#1abc9c' }}><span>Totale Pagato:</span><span>{paid > 0.004 ? paid.toFixed(2) + ' €' : '- €'}</span></div>
                            <hr className="card-separator" />
                            <div className="card-info" style={{ color: '#f1c40f' }}><span>Restante:</span><span>{(() => {
                              const capitalRemaining = f.totalAmount - (capitalPaid > 0 ? capitalPaid : 0);
                              const interestRemaining = f.interestPerRate ? f.interestPerRate * (f.totalMonths - totalRatesPaid) : 0;
                              const restante = capitalRemaining + interestRemaining;
                              return restante > 0.004 ? restante.toFixed(2) + ' €' : '- €';
                            })()}</span></div>
                            <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '6px 0', opacity: 0.3 }} />
                          </>
                        ) : (
                          <>
                            <div className="card-info card-info-red"><span>Da pagare:</span><span>{f.totalAmount.toFixed(2)} €</span></div>
                            <div className="card-info card-info-green"><span>Pagato:</span><span>{paid > 0.004 ? paid.toFixed(2) + ' €' : '- €'}</span></div>
                            <hr className="card-separator" />
                            <div className="card-info card-info-yellow"><span>Restante:</span><span>{f.totalAmount - paid > 0.004 ? Math.max(f.totalAmount - paid, 0).toFixed(2) + ' €' : '- €'}</span></div>
                            <hr className="card-separator" />
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="card-info-center" style={{ color: '#333', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '1px' }}>AVANZAMENTO</div>
                {(() => {
                  const isFixedProg = (f.rateMode || 'variabile') === 'fissa';
                  const totalRatesPaidProg = f.payments.length + (f.initialPaidRates || 0);
                  const interestPaidProg = isFixedProg && f.interestPerRate ? f.interestPerRate * totalRatesPaidProg : 0;
                  const capitalPaidProg = paid - interestPaidProg;
                  const progressCapital = f.totalAmount > 0 ? (Math.min(Math.max(capitalPaidProg, 0), f.totalAmount) / f.totalAmount) * 100 : 0;
                  const totalRates = f.totalMonths || 0;
                  return (
                    <div className="progress-bar progress-bar-ticks">
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
                {(f.rateMode || 'variabile') === 'fissa' && f.interestPerRate != null && f.interestPerRate > 0 && (<hr className="card-separator" />)}
                {(f.rateMode || 'variabile') === 'fissa' && f.interestPerRate != null && f.interestPerRate > 0 && (() => {
                  const totalRatesPaidInt = f.payments.length + (f.initialPaidRates || 0);
                  const interestPaidInt = f.interestPerRate * totalRatesPaidInt;
                  return (
                    <>
                      <div className="card-info-center" style={{ background: 'linear-gradient(to right, #1a5276, #3498db)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase' as const }}>INTERESSI</div>
                      <div className="card-info-center" style={{ color: '#1a5276' }}>
                        Interesse x rata: {f.interestPerRate!.toFixed(2)} €
                      </div>
                      <div className="card-info-center" style={{ color: '#3498db' }}>
                        Interessi Totali Pagati: {interestPaidInt > 0.004 ? interestPaidInt.toFixed(2) + ' €' : '- €'}
                      </div>
                    </>
                  );
                })()}
                {(f.rateMode || 'variabile') !== 'fissa' && (() => {
                  const interessiVar = Math.max(paid - f.totalAmount, 0);
                  const avgInterestVar = f.payments.length > 0 ? interessiVar / f.payments.length : 0;
                  return (
                    <>
                      <hr className="card-separator" />
                      <div className="card-info-center" style={{ background: 'linear-gradient(to right, #1a5276, #3498db)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase' as const }}>INTERESSI</div>
                      <div className="card-info-center" style={{ color: '#1a5276' }}>
                        Interesse medio x rata: {maxReachedHP && avgInterestVar > 0.004 ? avgInterestVar.toFixed(2) + ' €' : '- €'}
                      </div>
                      <div className="card-info-center" style={{ color: '#3498db' }}>
                        Interessi Totali Pagati: {maxReachedHP && interessiVar > 0.004 ? interessiVar.toFixed(2) + ' €' : '- €'}
                      </div>
                    </>
                  );
                })()}
                </>)}
                {!expandedCards.has(f.id) && (() => {
                  const isFixedProg2 = (f.rateMode || 'variabile') === 'fissa';
                  const totalRatesPaidProg = f.payments.length + (f.initialPaidRates || 0);
                  const interestPaidProg = isFixedProg2 && f.interestPerRate ? f.interestPerRate * totalRatesPaidProg : 0;
                  const capitalPaidProg = paid - interestPaidProg;
                  const progressCapital = f.totalAmount > 0 ? (Math.min(Math.max(capitalPaidProg, 0), f.totalAmount) / f.totalAmount) * 100 : 0;
                  const totalRates = f.totalMonths || 0;
                  return (
                    <>
                      <hr className="card-separator" />
                      <div className="progress-bar progress-bar-ticks">
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
                    </>
                  );
                })()}
                <hr className="card-separator" />
                <div className={`card-rate-mode ${(f.rateMode || 'variabile') === 'fissa' ? 'mode-fissa' : 'mode-variabile'}`}>
                  Rata {((f.rateMode || 'variabile').charAt(0).toUpperCase() + (f.rateMode || 'variabile').slice(1))}
                </div>
                {rateAmount > 0 && f.rateType && (f.rateMode || 'variabile') === 'fissa' && (() => {
                  const irregularPayments = f.payments.filter(p => p.amount !== rateAmount);
                  const hasIrregular = irregularPayments.length > 0;
                  const totalPaid = f.payments.reduce((sum, p) => sum + p.amount, 0);
                  const irregularBalance = f.payments.length > 0 ? totalPaid - (f.payments.length * rateAmount) : 0;
                  const isBalanced = f.payments.length === 0 || Math.abs(irregularBalance) < 0.01;
                  return (
                    <>
                      <div className="card-rate-info-row">
                        <div className="card-rate-info">
                          {f.interestPerRate != null && f.interestPerRate > 0 && (
                            <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '2px' }}>
                              {(rateAmount - f.interestPerRate).toFixed(2)} € + {f.interestPerRate.toFixed(2)} € <span style={{ color: '#1a5276' }}>(interessi)</span>
                            </div>
                          )}
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
                            const balance = irregularBalance;
                            const isBalanced = Math.abs(balance) < 0.01;
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
                                      updateDismissedAlerts(prev => new Set([...prev, f.id]));
                                      setShortPayDetail(null);
                                    }}
                                  >
                                    Elimina irregolarità
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
                  <div id={`quickpay-${f.id}`} className="quick-pay-section" onClick={(e) => e.stopPropagation()}>
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
                      {(f.rateMode || 'variabile') === 'fissa' && quickPayOriginal && `${quickPayInt || '0'}.${quickPayDec || '0'}` !== quickPayOriginal && (
                        <button
                          className="btn-refresh"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ra = f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0;
                            setQuickPayInt(Math.floor(ra).toString());
                            const d = Math.round((ra - Math.floor(ra)) * 100);
                            setQuickPayDec(d > 0 ? d.toString() : '');
                            setQuickPayNote('');
                          }}
                        >
                          ↺
                        </button>
                      )}
                      <input
                        type="number"
                        placeholder="Euro"
                        value={quickPayInt}
                        onChange={(e) => setQuickPayInt(e.target.value)}
                        className="quick-pay-input"
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
                    {((quickPayOriginal && `${quickPayInt || '0'}.${quickPayDec || '0'}` !== quickPayOriginal) || (f.rateMode || 'variabile') === 'variabile') && (
                      <input
                        type="text"
                        placeholder="Nota (opzionale)..."
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
            <p className={`modal-field-label ${errors.has('amount') ? 'label-error' : ''}`}>Importo totale da pagare (senza interessi) <span className="required-tag">*</span></p>
            <div className={`amount-row ${errors.has('amount') ? 'input-error-row' : ''}`}>
              <input
                ref={amountRef}
                type="number"
                placeholder="Euro"
                value={amountInt}
                onChange={(e) => setAmountInt(e.target.value)}
              />
              <span className="amount-sep">,</span>
              <input
                type="number"
                placeholder="Cent"
                value={amountDec}
                onChange={(e) => setAmountDec(e.target.value.slice(0, 2))}
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
                onChange={(e) => setRateMode(e.target.value as 'fissa' | 'variabile' | '')}
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
                <p className="modal-field-label">Importo singola rata (compresa d'interessi)</p>
                <div className="amount-row">
                  <input
                    type="number"
                    placeholder="Euro"
                    value={fixedRateInt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFixedRateInt(val);
                      const n = parseInt(initialPaidRates) || 0;
                      if (n > 0) {
                        const updated = singleRates.map(r => ({ ...r, int: val, dec: fixedRateDec }));
                        setSingleRates(updated);
                        recalcPaidTotal(updated);
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
                      const n = parseInt(initialPaidRates) || 0;
                      if (n > 0) {
                        const updated = singleRates.map(r => ({ ...r, int: fixedRateInt, dec: val }));
                        setSingleRates(updated);
                        recalcPaidTotal(updated);
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
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        onInput={(e) => { const val = (e.target as HTMLInputElement).value; if (val !== startDate) handleStartDateChange(val); }}
                        style={!startDate ? { color: 'transparent' } : {}}
                      />
                      {startDate && (
                        <button type="button" onClick={() => handleStartDateChange('')} style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: '#c0392b', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={10} color="white" /></button>
                      )}
                      {!startDate && <span style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem', pointerEvents: 'none' }}>Data</span>}
                    </div>
                  </div>
                  <div className="date-field">
                    <label>Fine</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        onInput={(e) => { const val = (e.target as HTMLInputElement).value; if (val !== endDate) handleEndDateChange(val); }}
                        style={!endDate ? { color: 'transparent' } : {}}
                      />
                      {endDate && (
                        <button type="button" onClick={() => handleEndDateChange('')} style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: '#c0392b', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={10} color="white" /></button>
                      )}
                      {!endDate && <span style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem', pointerEvents: 'none' }}>Data</span>}
                    </div>
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
                <p className={`modal-field-label ${errors.has('paidAmount') ? 'label-error' : ''}`}>Rate pagate <span className="required-tag">*</span></p>
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
                            recalcPaidTotal(arr);
                          }}
                          {...(rateMode === 'fissa' ? { disabled: true, style: { opacity: 0.6 } } : {})}
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
                            recalcPaidTotal(arr);
                          }}
                          className="amount-dec"
                          {...(rateMode === 'fissa' ? { disabled: true, style: { opacity: 0.6 } } : {})}
                        />
                        <span className="amount-currency">€</span>
                      </div>
                      <div style={{ position: 'relative', marginTop: '0.4rem' }} ref={el => { dateRefs.current[i] = el; }}>
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => {
                            const arr = [...singleRates];
                            arr[i] = { ...arr[i], date: e.target.value };
                            setSingleRates(arr);
                            setMissingDates(prev => { const n = new Set(prev); n.delete(i); return n; });
                          }}
                          onInput={(e) => {
                            const val = (e.target as HTMLInputElement).value;
                            if (val !== r.date) {
                              const arr = [...singleRates];
                              arr[i] = { ...arr[i], date: val };
                              setSingleRates(arr);
                            }
                          }}
                          style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.6rem', border: `2px solid ${missingDates.has(i) ? '#c0392b' : '#d4edda'}`, borderRadius: '0.75rem', fontSize: '1rem', color: r.date ? '#2d5a3d' : 'transparent', background: missingDates.has(i) ? '#fde8e8' : '#f0f9f2', textAlign: 'center', boxSizing: 'border-box', transition: 'border-color 0.3s, background 0.3s' }}
                        />
                        {r.date && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const arr = [...singleRates];
                              arr[i] = { ...arr[i], date: '' };
                              setSingleRates(arr);
                            }}
                            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: '#c0392b', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={12} color="white" />
                          </button>
                        )}
                        {!r.date && (
                          <span style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0392b', fontSize: '0.85rem', pointerEvents: 'none' }}>Aggiungere Data</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="modal-field-label">Totale pagato</p>
                <div className="amount-row" style={{ opacity: 0.5, pointerEvents: 'none' }}>
                  <input type="number" placeholder="Euro" value={initialPaidInt} disabled />
                  <span className="amount-sep">,</span>
                  <input type="number" placeholder="Cent" value={initialPaidDec} disabled className="amount-dec" />
                  <span className="amount-currency">€</span>
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
            <p className="modal-field-label">Importo totale da pagare (senza interessi) <span className="required-tag">*</span></p>
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
            <p className="modal-field-label" style={{ opacity: 0.5 }}>Tipo di rata</p>
            <div className="rate-type-row" style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <select
                className="modal-select"
                value={editRateType}
                disabled
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
                disabled
              >
                <option value="variabile">Variabile</option>
                <option value="fissa">Fissa</option>
              </select>
            </div>
            <p className="modal-field-label">N° Rate Totali <span className="required-tag">*</span></p>
            <div className="inline-field" style={{ justifyContent: 'center' }}>
              <div className="stepper">
                <button type="button" className="stepper-btn stepper-btn-minus" {...stepperMinus(() => parseInt(editDuration) || 0, (v: string) => handleEditDuration(v))}>−</button>
                <input
                  type="number"
                  min="0"
                  value={editDuration}
                  onChange={(e) => handleEditDuration(e.target.value)}
                  className="stepper-input"
                />
                <button type="button" className="stepper-btn stepper-btn-plus" {...stepperPlus(() => parseInt(editDuration) || 0, (v: string) => handleEditDuration(v))}>+</button>
              </div>
            </div>
            {editRateMode === 'fissa' && (
              <>
                <p className="modal-field-label">Importo singola rata (compresa d'interessi)</p>
                <div className="amount-row">
                  <input
                    type="number"
                    placeholder="Euro"
                    value={editFixedRateInt}
                    onChange={(e) => setEditFixedRateInt(e.target.value)}
                  />
                  <span className="amount-sep">,</span>
                  <input
                    type="number"
                    placeholder="Cent"
                    value={editFixedRateDec}
                    onChange={(e) => setEditFixedRateDec(e.target.value.slice(0, 2))}
                    className="amount-dec"
                  />
                  <span className="amount-currency">€</span>
                </div>
              </>
            )}
            {(parseInt(editDuration) || 0) > 0 && (
              <>
                <p className="modal-field-label">Periodo <span className="optional-tag">(opzionale)</span></p>
                <div className="date-row">
                  <div className="date-field">
                    <label>Inizio</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => handleEditStartDate(e.target.value)}
                        onInput={(e) => { const val = (e.target as HTMLInputElement).value; if (val !== editStartDate) handleEditStartDate(val); }}
                        style={!editStartDate ? { color: 'transparent' } : {}}
                      />
                      {editStartDate && (
                        <button type="button" onClick={() => handleEditStartDate('')} style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: '#c0392b', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={10} color="white" /></button>
                      )}
                      {!editStartDate && <span style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem', pointerEvents: 'none' }}>Data</span>}
                    </div>
                  </div>
                  <div className="date-field">
                    <label>Fine</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => handleEditEndDate(e.target.value)}
                        onInput={(e) => { const val = (e.target as HTMLInputElement).value; if (val !== editEndDate) handleEditEndDate(val); }}
                        style={!editEndDate ? { color: 'transparent' } : {}}
                      />
                      {editEndDate && (
                        <button type="button" onClick={() => handleEditEndDate('')} style={{ position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: '#c0392b', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={10} color="white" /></button>
                      )}
                      {!editEndDate && <span style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem', pointerEvents: 'none' }}>Data</span>}
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="inline-field" style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <p className="modal-field-label">N° Rate già pagate</p>
              <div className="stepper">
                <button type="button" className="stepper-btn stepper-btn-minus" disabled>−</button>
                <input
                  type="number"
                  min="0"
                  value={editInitialPaidRates}
                  disabled
                  className="stepper-input"
                />
                <button type="button" className="stepper-btn stepper-btn-plus" disabled>+</button>
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
                {editPaidMode === 'singola' ? (
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
                ) : (
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
                )}
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
              <button className="btn-primary" onClick={handleSaveEdit} disabled={!hasEditChanges()} style={!hasEditChanges() ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
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
