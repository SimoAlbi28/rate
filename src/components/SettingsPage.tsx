import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Cloud, CloudOff, Send, Info, SunMoon, Check } from 'lucide-react';
import type { Financing } from '../types';
import { exportAllFinancings, getLastSyncISO, getLastSyncError } from '../storage';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import ProfileMenu from './ProfileMenu';

declare const __APP_VERSION__: string;

type SortMode = 'date' | 'amount-desc' | 'amount-asc' | 'alpha';
type HomeSortMode = 'default' | 'progress-desc' | 'progress-asc';

interface Props {
  financings: Financing[];
}

const SORT_LABELS: Record<SortMode, string> = {
  'date': 'Data (più recenti)',
  'amount-desc': 'Importo (alto → basso)',
  'amount-asc': 'Importo (basso → alto)',
  'alpha': 'Cartella (A → Z)',
};

const HOME_SORT_LABELS: Record<HomeSortMode, string> = {
  'default': 'Predefinito (A → Z)',
  'progress-desc': 'Più vicini al completamento',
  'progress-asc': 'Più lontani dal completamento',
};

export default function SettingsPage({ financings }: Props) {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileIcon = localStorage.getItem('profileIcon') || '👤';
  const profileColor = localStorage.getItem('profileColor') || '#3498db';

  // Home preferences (default applied on next app reload)
  const [homeSort, setHomeSort] = useState<HomeSortMode>(() => {
    const saved = localStorage.getItem('sortMode-default');
    if (saved === 'progress-desc' || saved === 'progress-asc') return saved;
    return 'default';
  });

  // Cronologia preferences (default applied on next app reload)
  const [cronoSort, setCronoSort] = useState<SortMode>(
    () => (localStorage.getItem('cronologia-sort-default') as SortMode) || 'date'
  );
  const [cronoSeparators, setCronoSeparators] = useState<boolean>(
    () => localStorage.getItem('settings-cronologia-separators') !== '0'
  );

  // Theme: 'light' | 'dark' | 'auto' (auto = dark dalle 20:00 alle 06:00)
  type ThemeMode = 'light' | 'dark' | 'auto';
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('settings-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
    return 'auto';
  });

  const isDarkHour = () => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    // Dark dalle 20:00 alle 06:00
    return minutes >= 20 * 60 || minutes < 6 * 60;
  };

  useEffect(() => {
    localStorage.setItem('settings-theme', themeMode);
    const applyDark = themeMode === 'dark' || (themeMode === 'auto' && isDarkHour());
    if (applyDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    // If auto, recheck every minute so the page switches at 20:00 / 06:00
    if (themeMode !== 'auto') return;
    const interval = window.setInterval(() => {
      const dark = isDarkHour();
      if (dark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [themeMode]);

  const darkMode = themeMode === 'dark' || (themeMode === 'auto' && isDarkHour());

  // These write only to the *-default keys; on app reopen main.tsx copies them
  // into the live keys (sortMode, cronologia-sort). This way changes here don't
  // affect the active session in Home/Cronologia, and vice versa.
  const applyHomeSort = (m: HomeSortMode) => {
    setHomeSort(m);
    localStorage.setItem('sortMode-default', m);
  };

  const applyCronoSort = (m: SortMode) => {
    setCronoSort(m);
    localStorage.setItem('cronologia-sort-default', m);
  };

  const applyCronoSeparators = (v: boolean) => {
    setCronoSeparators(v);
    localStorage.setItem('settings-cronologia-separators', v ? '1' : '0');
  };

  // Copy summary to clipboard
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle');

  const buildPlainTextSummary = (): string => {
    if (financings.length === 0) return 'Nessun finanziamento.';
    const lines: string[] = [];
    lines.push('=== RATE & PAGAMENTI — RIEPILOGO ===');
    lines.push(`Esportato il: ${new Date().toLocaleString('it-IT')}`);
    lines.push(`Numero cartelle: ${financings.length}`);
    lines.push('');
    for (const f of financings) {
      const rateMode = f.rateMode || 'variabile';
      const isFixed = rateMode === 'fissa';
      const interestPerRate = f.interestPerRate ?? 0;
      const paid = f.payments.reduce((s, p) => s + p.amount, 0) + (f.initialPaid || 0);
      const totalWithInterest = f.totalAmount + interestPerRate * f.totalMonths;
      const totalToPay = isFixed && interestPerRate > 0 ? totalWithInterest : f.totalAmount;
      const restante = Math.max(totalToPay - paid, 0);
      const ratePagate = f.payments.length + (f.initialPaidRates || 0);
      const rateAmount = f.fixedRateAmount || (f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0);

      lines.push(`---  ${f.emoji}  ${f.name.toUpperCase()}  ---`);
      lines.push(`Tipo rata: ${rateMode}`);
      if (isFixed) lines.push(`Rata fissa: ${rateAmount.toFixed(2)} €`);
      lines.push(`Totale da pagare: ${totalToPay.toFixed(2)} €`);
      if (interestPerRate > 0) lines.push(`(Senza interessi: ${f.totalAmount.toFixed(2)} €, interessi totali: ${(interestPerRate * f.totalMonths).toFixed(2)} €)`);
      lines.push(`Totale pagato: ${paid.toFixed(2)} €`);
      lines.push(`Restante: ${restante.toFixed(2)} €`);
      lines.push(`Rate: ${ratePagate} / ${f.totalMonths}`);
      if (f.startDate) lines.push(`Data inizio: ${new Date(f.startDate).toLocaleDateString('it-IT')}`);
      if (f.endDate) lines.push(`Data fine: ${new Date(f.endDate).toLocaleDateString('it-IT')}`);
      if (f.payments.length > 0) {
        lines.push('');
        lines.push('Storico pagamenti:');
        const sorted = [...f.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        sorted.forEach((p, i) => {
          const note = p.note ? `  — ${p.note}` : '';
          lines.push(`  ${i + 1}. ${new Date(p.date).toLocaleDateString('it-IT')}  →  ${p.amount.toFixed(2)} €${note}`);
        });
      }
      lines.push('');
    }
    return lines.join('\n');
  };

  const copyToClipboard = async () => {
    const text = buildPlainTextSummary();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyState('ok');
      setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2500);
    }
  };

  // Last sync info
  const lastSyncISO = getLastSyncISO();
  const lastSyncError = getLastSyncError();
  const lastSyncLabel = lastSyncISO
    ? new Date(lastSyncISO).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  // Feedback form
  const fbNome = (user?.user_metadata?.nome as string) || localStorage.getItem('profile-nome') || '';
  const fbCognome = (user?.user_metadata?.cognome as string) || localStorage.getItem('profile-cognome') || '';
  const [fbMessaggio, setFbMessaggio] = useState('');
  const [fbSending, setFbSending] = useState(false);
  const [fbToast, setFbToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const sendFeedback = async () => {
    if (fbMessaggio.trim().length < 10) {
      setFbToast({ type: 'error', msg: 'Il messaggio deve avere almeno 10 caratteri' });
      setTimeout(() => setFbToast(null), 3500);
      return;
    }
    setFbSending(true);
    try {
      const { error } = await supabase.from('user_feedback').insert({
        user_id: user?.id ?? null,
        nome: fbNome.trim() || null,
        cognome: fbCognome.trim() || null,
        messaggio: fbMessaggio.trim(),
      });
      if (error) throw error;
      setFbToast({ type: 'success', msg: 'Messaggio inviato! Grazie del feedback.' });
      setFbMessaggio('');
      setTimeout(() => setFbToast(null), 3500);
    } catch (err) {
      setFbToast({ type: 'error', msg: 'Errore: ' + ((err as Error).message || 'impossibile inviare') });
      setTimeout(() => setFbToast(null), 4000);
    } finally {
      setFbSending(false);
    }
  };

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
          <h2 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#333', letterSpacing: '2px', textTransform: 'uppercase' }}>Impostazioni</h2>
        </div>
      </div>

      <div className="content" style={{ paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

        {/* SEZIONE: DATI */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>📊 Dati</h3>
          <hr className="card-separator" />
          <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', margin: '0.5rem 0 0.75rem' }}>
            Scarica un backup di tutti i tuoi finanziamenti in formato Excel.
          </p>
          <button
            onClick={() => exportAllFinancings(financings)}
            disabled={financings.length === 0}
            className={financings.length === 0 ? '' : 'btn-shine'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
              background: financings.length === 0 ? '#b0c8b7' : '#27ae60', color: 'white',
              fontWeight: 700, fontSize: '0.9rem', cursor: financings.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <span className="btn-excel-icon">X</span> Esporta in Excel
          </button>
          <p style={{ fontSize: '0.78rem', color: darkMode ? '#a8cdb3' : '#666', textAlign: 'center', margin: '0.75rem 0 0.5rem' }}>
            Oppure copia tutto come testo (per Word, Note, Whatsapp, ecc.):
          </p>
          <button
            onClick={copyToClipboard}
            disabled={financings.length === 0}
            className={financings.length === 0 ? '' : 'btn-shine'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
              background: financings.length === 0 ? '#a8c4d8' : (copyState === 'ok' ? '#27ae60' : '#3498db'),
              color: 'white', fontWeight: 700, fontSize: '0.9rem',
              cursor: financings.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {copyState === 'ok' ? (<><Check size={16} /> Copiato!</>) : (<><span className="btn-excel-icon">📋</span> Copia dati</>)}
          </button>
          {copyState === 'error' && (
            <p style={{ fontSize: '0.7rem', color: '#c0392b', textAlign: 'center', margin: '0.4rem 0 0' }}>
              Errore nella copia. Riprova.
            </p>
          )}
          {financings.length === 0 && (
            <p style={{ fontSize: '0.7rem', color: '#999', textAlign: 'center', margin: '0.4rem 0 0' }}>
              Nessun finanziamento da esportare.
            </p>
          )}
        </div>

        {/* SEZIONE: ASPETTO */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>🎨 Aspetto</h3>
          <hr className="card-separator" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
            {([
              { key: 'light' as const, icon: <Sun size={16} />, label: 'Tema chiaro' },
              { key: 'dark' as const, icon: <Moon size={16} />, label: 'Tema scuro' },
              { key: 'auto' as const, icon: <SunMoon size={16} />, label: 'Auto' },
            ]).map((opt) => {
              const active = themeMode === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setThemeMode(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem',
                    border: `1.5px solid ${active ? '#27ae60' : (darkMode ? 'rgba(255,255,255,0.2)' : '#e0e0e0')}`,
                    borderRadius: '0.5rem', cursor: 'pointer',
                    background: active ? '#eafaf1' : 'transparent',
                    fontSize: '0.85rem', fontWeight: active ? 700 : 500,
                    color: active ? '#1e8449' : (darkMode ? '#e8f5ea' : '#333'),
                    textAlign: 'center', transition: 'all 0.15s',
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '0.7rem', color: darkMode ? '#a8cdb3' : '#999', textAlign: 'center', margin: '0.5rem 0 0', fontStyle: 'italic', lineHeight: 1.4 }}>
            Auto: tema chiaro di giorno, scuro dalle 20:00 alle 06:00 per non affaticare gli occhi.
          </p>
        </div>

        {/* SEZIONE: HOME / CARTELLE */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>🏠 Home · Cartelle</h3>
          <hr className="card-separator" />
          <p style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, margin: '0.75rem 0 0.4rem', textAlign: 'center' }}>
            Ordinamento predefinito
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {(Object.keys(HOME_SORT_LABELS) as HomeSortMode[]).map((key) => (
              <button
                key={key}
                onClick={() => applyHomeSort(key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem 0.75rem',
                  border: `1.5px solid ${homeSort === key ? '#27ae60' : (darkMode ? 'rgba(255,255,255,0.2)' : '#e0e0e0')}`,
                  borderRadius: '0.5rem', cursor: 'pointer',
                  background: homeSort === key ? '#eafaf1' : 'transparent',
                  fontSize: '0.85rem', fontWeight: homeSort === key ? 700 : 500,
                  color: homeSort === key ? '#1e8449' : (darkMode ? '#e8f5ea' : '#333'),
                  textAlign: 'center', transition: 'all 0.15s',
                }}
              >
                {HOME_SORT_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {/* SEZIONE: CRONOLOGIA */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>📋 Cronologia notifiche</h3>
          <hr className="card-separator" />

          <p style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, margin: '0.75rem 0 0.4rem', textAlign: 'center' }}>
            Ordinamento predefinito
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {(Object.keys(SORT_LABELS) as SortMode[]).map((key) => (
              <button
                key={key}
                onClick={() => applyCronoSort(key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.55rem 0.75rem',
                  border: `1.5px solid ${cronoSort === key ? '#27ae60' : (darkMode ? 'rgba(255,255,255,0.2)' : '#e0e0e0')}`,
                  borderRadius: '0.5rem', cursor: 'pointer',
                  background: cronoSort === key ? '#eafaf1' : 'transparent',
                  fontSize: '0.85rem', fontWeight: cronoSort === key ? 700 : 500,
                  color: cronoSort === key ? '#1e8449' : (darkMode ? '#e8f5ea' : '#333'),
                  textAlign: 'center', transition: 'all 0.15s',
                }}
              >
                {SORT_LABELS[key]}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, margin: '1rem 0 0.4rem', textAlign: 'center' }}>
            Separatori di gruppo
          </p>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', border: '1.5px solid #e0e0e0', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <span>Mostra le linee tra gruppi (data, importo, cartella)</span>
            <input
              type="checkbox"
              checked={cronoSeparators}
              onChange={(e) => applyCronoSeparators(e.target.checked)}
              style={{ accentColor: '#27ae60', width: 18, height: 18 }}
            />
          </label>
        </div>

        {/* SEZIONE: SINCRONIZZAZIONE */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>☁️ Sincronizzazione</h3>
          <hr className="card-separator" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', background: isGuest ? '#fff3cd' : (lastSyncError ? '#fdecea' : '#eafaf1'), border: `1.5px solid ${isGuest ? '#f1c40f' : (lastSyncError ? '#e74c3c' : '#27ae60')}`, marginTop: '0.5rem' }}>
            {isGuest ? <CloudOff size={18} color="#856404" /> : <Cloud size={18} color={lastSyncError ? '#c0392b' : '#1e8449'} />}
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isGuest ? '#856404' : (lastSyncError ? '#c0392b' : '#1e8449') }}>
              {isGuest
                ? 'Solo su questo dispositivo (modalità ospite)'
                : (lastSyncError ? 'Errore di sincronizzazione' : 'Sincronizzato con Supabase')}
            </div>
          </div>
          {!isGuest && lastSyncLabel && !lastSyncError && (
            <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center', margin: '0.5rem 0 0' }}>
              Ultima sincronizzazione: <b>{lastSyncLabel}</b>
            </p>
          )}
          {!isGuest && lastSyncError && (
            <p style={{ fontSize: '0.72rem', color: '#c0392b', textAlign: 'center', margin: '0.5rem 0 0' }}>
              {lastSyncError}
            </p>
          )}
          {isGuest && (
            <p style={{ fontSize: '0.72rem', color: '#856404', textAlign: 'center', margin: '0.5rem 0 0' }}>
              Crea un account per sincronizzare i dati sul cloud.
            </p>
          )}
        </div>

        {/* SEZIONE: FEEDBACK */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>💬 Feedback</h3>
          <hr className="card-separator" />
          <p style={{ fontSize: '0.8rem', color: '#666', textAlign: 'center', margin: '0.5rem 0 0.75rem' }}>
            Hai consigli, miglioramenti o segnalazioni? Scrivi qui.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Nome"
                value={fbNome}
                readOnly
                style={{ flex: 1, minWidth: 0, padding: '0.55rem 0.7rem', borderRadius: '0.4rem', border: '1.5px solid #e0e0e0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', background: '#f5f5f5', color: '#666', cursor: 'not-allowed' }}
              />
              <input
                type="text"
                placeholder="Cognome"
                value={fbCognome}
                readOnly
                style={{ flex: 1, minWidth: 0, padding: '0.55rem 0.7rem', borderRadius: '0.4rem', border: '1.5px solid #e0e0e0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', background: '#f5f5f5', color: '#666', cursor: 'not-allowed' }}
              />
            </div>
            <textarea
              placeholder="Il tuo messaggio (min 10 caratteri)..."
              value={fbMessaggio}
              onChange={(e) => setFbMessaggio(e.target.value)}
              rows={4}
              style={{ padding: '0.55rem 0.7rem', borderRadius: '0.4rem', border: '1.5px solid #ccc', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <button
              onClick={sendFeedback}
              disabled={fbSending || fbMessaggio.trim().length < 10}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0.7rem', borderRadius: '0.5rem', border: 'none',
                background: fbSending || fbMessaggio.trim().length < 10 ? '#b0c8b7' : '#3498db',
                color: 'white', fontWeight: 700, fontSize: '0.85rem',
                cursor: fbSending || fbMessaggio.trim().length < 10 ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={14} /> {fbSending ? 'Invio...' : 'Invia messaggio'}
            </button>
            {fbToast && (
              <div style={{
                padding: '0.6rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem', fontWeight: 600, textAlign: 'center',
                background: fbToast.type === 'success' ? '#eafaf1' : '#fdecea',
                color: fbToast.type === 'success' ? '#1e8449' : '#c0392b',
                border: `1.5px solid ${fbToast.type === 'success' ? '#27ae60' : '#e74c3c'}`,
              }}>
                {fbToast.msg}
              </div>
            )}
          </div>
        </div>

        {/* SEZIONE: INFO */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}><Info size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} /> Info app</h3>
          <hr className="card-separator" />
          <div style={{ textAlign: 'center', padding: '0.75rem 0 0.25rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e8449' }}>Rate & Pagamenti</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--theme-text-secondary, #666)', marginTop: '0.2rem' }}>Versione {__APP_VERSION__}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
