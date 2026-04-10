import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpDown, Trash2 } from 'lucide-react';
import type { Financing, Payment } from '../types';
import ProfileMenu from './ProfileMenu';

interface Props {
  financings: Financing[];
}

type SortMode = 'date' | 'amount-desc' | 'amount-asc' | 'alpha';
type RateModeFilter = 'tutti' | 'fissa' | 'variabile';

interface PaymentRow {
  payment: Payment;
  financing: Financing;
}

export default function CronologiaPage({ financings }: Props) {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(
    () => (localStorage.getItem('cronologia-sort') as SortMode) || 'date'
  );
  const [filterRateMode, setFilterRateMode] = useState<RateModeFilter>('tutti');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Dismissed notifications (payment IDs hidden from cronologia, real payments untouched)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('cronologia-dismissed');
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const persistDismissed = (next: Set<string>) => {
    try { localStorage.setItem('cronologia-dismissed', JSON.stringify([...next])); } catch { /* ignore */ }
  };
  const profileIcon = localStorage.getItem('profileIcon') || '👤';
  const profileColor = localStorage.getItem('profileColor') || '#3498db';

  const setSort = (m: SortMode) => {
    setSortMode(m);
    localStorage.setItem('cronologia-sort', m);
    setShowSortMenu(false);
  };

  // Build a flat list of all payments with their parent financing
  const allRows: PaymentRow[] = useMemo(() => {
    const rows: PaymentRow[] = [];
    for (const f of financings) {
      for (const p of f.payments) rows.push({ payment: p, financing: f });
    }
    return rows;
  }, [financings]);

  // Apply dismissed filter + filters + search + sort
  const visibleRows = useMemo(() => {
    let rows = allRows.filter((r) => !dismissedIds.has(r.payment.id));

    if (filterRateMode !== 'tutti') {
      rows = rows.filter((r) => (r.financing.rateMode || 'variabile') === filterRateMode);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const name = r.financing.name.toLowerCase();
        const note = (r.payment.note || '').toLowerCase();
        const amount = r.payment.amount.toFixed(2);
        return name.includes(q) || note.includes(q) || amount.includes(q);
      });
    }

    const byDateDesc = (a: PaymentRow, b: PaymentRow) =>
      new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime();

    switch (sortMode) {
      case 'amount-desc':
        rows = [...rows].sort((a, b) => b.payment.amount - a.payment.amount);
        break;
      case 'amount-asc':
        rows = [...rows].sort((a, b) => a.payment.amount - b.payment.amount);
        break;
      case 'alpha':
        rows = [...rows].sort((a, b) => {
          const cmp = a.financing.name.localeCompare(b.financing.name, 'it', { sensitivity: 'base' });
          if (cmp !== 0) return cmp;
          return byDateDesc(a, b);
        });
        break;
      case 'date':
      default:
        rows = [...rows].sort(byDateDesc);
    }

    return rows;
  }, [allRows, dismissedIds, filterRateMode, searchQuery, sortMode]);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectionMode(true);
      setSelectedIds(new Set());
    }
  };

  const toggleSelected = (paymentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  };

  const selectAllVisible = () => {
    const all = new Set(visibleRows.map((r) => r.payment.id));
    setSelectedIds(all);
  };

  const dismissSelected = () => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectedIds) next.add(id);
      persistDismissed(next);
      return next;
    });
    setSelectedIds(new Set());
    setSelectionMode(false);
    setConfirmDelete(false);
  };

  const sortLabels: Record<SortMode, string> = {
    'date': 'Data (più recenti)',
    'amount-desc': 'Importo (alto → basso)',
    'amount-asc': 'Importo (basso → alto)',
    'alpha': 'Cartella (A → Z)',
  };

  const allSelected = visibleRows.length > 0 && selectedIds.size === visibleRows.length;

  // FLIP animation: animate cards when their order changes
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevPositions = useRef<Map<string, DOMRect>>(new Map());
  const prevOrder = useRef<string[]>([]);
  const currentOrderKey = visibleRows.map((r) => r.payment.id).join(',');

  useLayoutEffect(() => {
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
    const positions = new Map<string, DOMRect>();
    cardRefs.current.forEach((el, id) => {
      if (el) positions.set(id, el.getBoundingClientRect());
    });
    prevPositions.current = positions;
    prevOrder.current = visibleRows.map((r) => r.payment.id);
  }, [currentOrderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="home-sticky-top">
        <nav className="navbar">
          <div className="navbar-left">
            <img src="/rate-logo.png" alt="Logo" className="navbar-logo-img" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
          </div>
          <div className="navbar-center">
            <h1>Rate & Pagamenti</h1>
            <p className="navbar-tagline">Tutto quello che devi pagare, qui.</p>
          </div>
          <button className="navbar-profile" style={{ background: profileColor }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <span>{profileIcon}</span>
          </button>
        </nav>
        {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} />}
        <div className="sticky-bar">
          <h2 className="section-title">CRONOLOGIA NOTIFICHE</h2>
          <div className="toolbar" style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                className="toolbar-btn"
                onClick={() => setShowSortMenu(!showSortMenu)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 50, height: 42, padding: 0, boxSizing: 'border-box', background: 'white' }}
                title="Ordinamento"
              >
                <ArrowUpDown size={18} />
              </button>
              {showSortMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowSortMenu(false)} />
                  <div className="sort-dropdown-menu" style={{ position: 'absolute', top: '110%', left: 0, background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e0e0e0', zIndex: 100, minWidth: '210px', overflow: 'hidden' }}>
                    {(Object.keys(sortLabels) as SortMode[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSort(key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem 0.75rem',
                          background: sortMode === key ? '#ebf5fb' : 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: '0.78rem', color: sortMode === key ? '#2980b9' : '#333', fontWeight: sortMode === key ? 700 : 400,
                          borderBottom: '1px solid #f0f0f0', textAlign: 'left',
                        }}
                      >
                        {sortLabels[key]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              className={`toolbar-btn toolbar-btn-search ${showSearch ? 'active' : ''}`}
              onClick={() => setShowSearch(!showSearch)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Search size={18} />
            </button>
            {!showSearch && (searchQuery || filterRateMode !== 'tutti') && (
              <button
                onClick={() => { setSearchQuery(''); setFilterRateMode('tutti'); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1.5px solid #e74c3c', borderRadius: '0.75rem', cursor: 'pointer', padding: '0.5rem 0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                title="Reset filtri"
              >
                <X size={18} color="#e74c3c" />
              </button>
            )}
            {visibleRows.length > 0 && (
              <button
                className={`toolbar-btn crono-trash-btn ${selectionMode ? 'crono-trash-btn-active' : ''}`}
                onClick={toggleSelectionMode}
                style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectionMode ? 'white' : '#c0392b', borderColor: '#c0392b', color: selectionMode ? '#c0392b' : 'white', width: 46, height: 42, padding: 0, boxSizing: 'border-box' }}
                title={selectionMode ? 'Annulla selezione' : 'Seleziona notifiche da rimuovere'}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          {showSearch && (
            <div className="search-bar">
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Cerca per cartella, nota o importo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  style={{ position: 'absolute', right: '0.75rem', top: '-6px', bottom: 0, margin: 'auto', height: 'fit-content', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', opacity: (searchQuery || filterRateMode !== 'tutti') ? 1 : 0, pointerEvents: (searchQuery || filterRateMode !== 'tutti') ? 'auto' : 'none' }}
                  onClick={() => { setSearchQuery(''); setFilterRateMode('tutti'); }}
                  title="Reset filtri"
                >
                  <X size={18} color="#999" />
                </button>
              </div>
              <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <div style={{ display: 'flex', gap: '0.35rem', whiteSpace: 'nowrap', minWidth: 'min-content', justifyContent: 'center' }}>
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
                </div>
              </div>
            </div>
          )}
          {selectionMode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.5rem 0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c0392b' }}>
                Selezionati: {selectedIds.size}
              </span>
              <button
                onClick={() => allSelected ? setSelectedIds(new Set()) : selectAllVisible()}
                style={{ padding: '0.35rem 0.95rem', borderRadius: '0.5rem', border: '1.5px solid #c0392b', background: allSelected ? '#c0392b' : 'white', color: allSelected ? 'white' : '#c0392b', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
              >
                Tutti
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="content" style={{ paddingTop: '0.5rem', paddingBottom: selectedIds.size > 0 ? '5rem' : undefined }}>
        {visibleRows.length === 0 ? (
          <div className="card section-card" style={{ textAlign: 'center', color: '#999', padding: '1.5rem' }}>
            {allRows.length === 0
              ? 'Nessuna notifica.'
              : (allRows.length - dismissedIds.size <= 0
                  ? 'Nessuna notifica (tutte rimosse).'
                  : 'Nessuna notifica corrisponde ai filtri.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {visibleRows.map((row, idx) => {
              const { payment, financing } = row;
              const rateMode = financing.rateMode || 'variabile';
              const accent = rateMode === 'fissa' ? '#8e44ad' : '#e91e8a';
              const isSelected = selectedIds.has(payment.id);

              // Group separator: insert before the first card of each new group
              const groupKey = (r: PaymentRow): string => {
                switch (sortMode) {
                  case 'amount-desc':
                  case 'amount-asc':
                    return r.payment.amount.toFixed(2);
                  case 'alpha':
                    return r.financing.id;
                  case 'date':
                  default:
                    return new Date(r.payment.date).toLocaleDateString('it-IT');
                }
              };
              const groupLabel = (r: PaymentRow): string => {
                switch (sortMode) {
                  case 'amount-desc':
                  case 'amount-asc':
                    return `${r.payment.amount.toFixed(2)} €`;
                  case 'alpha':
                    return `${r.financing.emoji} ${r.financing.name}`;
                  case 'date':
                  default:
                    return new Date(r.payment.date).toLocaleDateString('it-IT');
                }
              };
              const separatorsEnabled = localStorage.getItem('settings-cronologia-separators') !== '0';
              const prev = idx > 0 ? visibleRows[idx - 1] : null;
              const showSeparator = separatorsEnabled && (!prev || groupKey(prev) !== groupKey(row));
              const cardStyle: React.CSSProperties = {
                padding: '0.6rem 0.8rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                transition: 'background 0.15s, border-color 0.15s',
              };
              // Selection highlight is handled via CSS class so dark mode can override
              return (
                <div key={payment.id} style={{ display: 'contents' }}>
                  {showSeparator && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: idx === 0 ? '0 0.25rem 0.1rem' : '0.5rem 0.25rem 0.1rem' }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.15)' }} />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {groupLabel(row)}
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.15)' }} />
                    </div>
                  )}
                <div
                  ref={(el) => {
                    if (el) cardRefs.current.set(payment.id, el);
                    else cardRefs.current.delete(payment.id);
                  }}
                  onClick={() => {
                    if (selectionMode) toggleSelected(payment.id);
                    else navigate(`/detail/${financing.id}`);
                  }}
                  className={`card section-card ${isSelected ? 'crono-card-selected' : ''}`}
                  style={cardStyle}
                >
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '1rem' }}>{financing.emoji}</span>
                    <span>{financing.name}</span>
                  </div>
                  <hr className="card-separator" />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#666', fontWeight: 500 }}>{new Date(payment.date).toLocaleDateString('it-IT')}</span>
                    <span style={{ color: '#27ae60', fontWeight: 700 }}>{payment.amount.toFixed(2)} €</span>
                  </div>
                  {payment.note && (
                    <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: '0.35rem' }}>
                      {payment.note}
                    </div>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectionMode && selectedIds.size > 0 && (
        <button
          onClick={() => setConfirmDelete(true)}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
            transform: 'translateX(-50%)',
            background: '#c0392b',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            padding: '0.75rem 1.75rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 6px 20px rgba(192, 57, 43, 0.45)',
            cursor: 'pointer',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Trash2 size={16} /> Elimina ({selectedIds.size})
        </button>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '360px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Rimuovere le notifiche selezionate?</h3>
            <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
              Verranno rimosse <b>{selectedIds.size}</b> notifiche dalla cronologia.
            </p>
            <p style={{ color: '#27ae60', fontSize: '0.78rem', margin: '0 0 1rem', fontWeight: 600 }}>
              ℹ️ I pagamenti reali nelle cartelle non verranno eliminati.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1.5px solid #999', background: 'white', color: '#666', fontWeight: 600, cursor: 'pointer' }}
              >
                Annulla
              </button>
              <button
                onClick={dismissSelected}
                style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: 'none', background: '#e74c3c', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Rimuovi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
