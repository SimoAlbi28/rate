import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Financing } from '../types';
import ProfileMenu from './ProfileMenu';

interface Props {
  financings: Financing[];
}

export default function RiepilogoPage({ financings }: Props) {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const fmtEuro = (v: number) => v <= 0.004 ? '- €' : `${v.toFixed(2)} €`;

  // Helper: conta rate pagate per un finanziamento
  const getRatePagate = (f: Financing) => {
    const isFixed = (f.rateMode || 'variabile') === 'fissa';
    const rateAmount = f.fixedRateAmount || (f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0);
    if (isFixed && rateAmount > 0) {
      const maxRates = f.totalMonths - (f.initialPaidRates || 0);
      let cum = 0;
      for (const p of f.payments) {
        const ratio = p.amount / rateAmount;
        const rounded = Math.round(ratio);
        const isMult = rounded >= 1 && Math.abs(p.amount - rounded * rateAmount) < 0.01;
        if (isMult) { cum += Math.min(rounded, Math.max(maxRates - cum, 0)); } else { cum += 1; }
      }
      return cum + (f.initialPaidRates || 0);
    }
    return f.payments.length + (f.initialPaidRates || 0);
  };

  const isCompleted = (f: Financing) => f.totalMonths > 0 && getRatePagate(f) >= f.totalMonths;
  const getPaid = (f: Financing) => f.payments.reduce((s, p) => s + p.amount, 0) + (f.initialPaid || 0);

  // Statistiche generali
  const totaleFinanziamenti = financings.length;
  const completati = financings.filter(isCompleted).length;
  const inCorso = totaleFinanziamenti - completati;
  const fissi = financings.filter(f => (f.rateMode || 'variabile') === 'fissa').length;
  const variabili = totaleFinanziamenti - fissi;

  // Rate
  const totalRateTotali = financings.reduce((s, f) => s + f.totalMonths, 0);
  const totalRatePagate = financings.reduce((s, f) => s + getRatePagate(f), 0);
  const totalRateManc = Math.max(totalRateTotali - totalRatePagate, 0);

  // Importi
  const totaleDaPagare = financings.reduce((s, f) => s + f.totalAmount, 0);
  const totalePagato = financings.reduce((s, f) => s + getPaid(f), 0);
  const totaleRestante = Math.max(totaleDaPagare - totalePagato, 0);

  // Interessi (solo rata fissa con interessi definiti)
  const totaleInteressiPagati = financings.reduce((s, f) => {
    if ((f.rateMode || 'variabile') === 'fissa' && f.interestPerRate && f.interestPerRate > 0) {
      return s + f.interestPerRate * getRatePagate(f);
    }
    return s;
  }, 0);
  const totaleInteressiTotali = financings.reduce((s, f) => {
    if ((f.rateMode || 'variabile') === 'fissa' && f.interestPerRate && f.interestPerRate > 0) {
      return s + f.interestPerRate * f.totalMonths;
    }
    return s;
  }, 0);
  const totaleInteressiRestanti = Math.max(totaleInteressiTotali - totaleInteressiPagati, 0);

  // Pagato totale con interessi (solo fisse)
  const totaleDaPagareConInteressi = totaleDaPagare + totaleInteressiTotali;

  // Media
  const rataMedieGlobale = totalRatePagate > 0 ? totalePagato / totalRatePagate : 0;
  const totalePagamenti = financings.reduce((s, f) => s + f.payments.length, 0);

  // Prossima scadenza
  const prossimaScadenza = financings
    .filter(f => f.endDate && !isCompleted(f))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0];

  // Finanziamento piu grande e piu piccolo
  const piuGrande = financings.length > 0 ? financings.reduce((max, f) => f.totalAmount > max.totalAmount ? f : max) : null;
  const piuPiccolo = financings.length > 0 ? financings.reduce((min, f) => f.totalAmount < min.totalAmount ? f : min) : null;

  // Avanzamento
  const progressTotale = totaleDaPagare > 0 ? Math.min((totalePagato / totaleDaPagare) * 100, 100) : 0;

  const getProgressColor = (pct: number) => {
    if (pct <= 20) return '#e74c3c';
    if (pct <= 40) return '#e67e22';
    if (pct <= 60) return '#f1c40f';
    if (pct <= 80) return '#a8d641';
    return '#2ecc71';
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
          <button className="navbar-profile" style={{ background: localStorage.getItem('profileColor') || '#3498db' }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <span>{localStorage.getItem('profileIcon') || '👤'}</span>
          </button>
        </nav>
        {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} />}
        <div className="sticky-bar">
          <h2 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#333', letterSpacing: '2px', textTransform: 'uppercase' }}>Panoramica Generale</h2>
        </div>
      </div>

      <div className="content" style={{ paddingTop: '0.5rem' }}>
        {/* STATO FINANZIAMENTI */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Stato Finanziamenti</h3>
          <hr className="card-separator" />
          <div className="summary-grid">
            <div className="summary-column">
              <div className="summary-box" style={{ borderColor: '#333', color: '#333' }}>
                <span className="summary-label">TOTALE CARTELLE</span>
                <span className="summary-value" style={{ color: '#333' }}>{totaleFinanziamenti}</span>
              </div>
              <div className="summary-box" style={{ borderColor: '#27ae60', color: '#27ae60' }}>
                <span className="summary-label">COMPLETATI</span>
                <span className="summary-value" style={{ color: '#27ae60' }}>{completati}</span>
              </div>
              <div className="summary-box" style={{ borderColor: '#e67e22', color: '#e67e22' }}>
                <span className="summary-label">IN CORSO</span>
                <span className="summary-value" style={{ color: '#e67e22' }}>{inCorso}</span>
              </div>
            </div>
            <div className="summary-column">
              <div className="summary-box" style={{ borderColor: '#8e44ad', color: '#8e44ad' }}>
                <span className="summary-label">RATA FISSA</span>
                <span className="summary-value" style={{ color: '#8e44ad' }}>{fissi}</span>
              </div>
              <div className="summary-box" style={{ borderColor: '#e84393', color: '#e84393' }}>
                <span className="summary-label">RATA VARIABILE</span>
                <span className="summary-value" style={{ color: '#e84393' }}>{variabili}</span>
              </div>
              <div className="summary-box" style={{ borderColor: '#3498db', color: '#3498db' }}>
                <span className="summary-label">PAGAMENTI TOTALI</span>
                <span className="summary-value" style={{ color: '#3498db' }}>{totalePagamenti}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RATE */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Rate</h3>
          <hr className="card-separator" />
          <div className="summary-grid">
            <div className="summary-column">
              <div className="summary-box" style={{ borderColor: '#666', color: '#666' }}>
                <span className="summary-label">RATE TOTALI</span>
                <span className="summary-value" style={{ color: '#666' }}>{totalRateTotali}</span>
              </div>
              <div className="summary-box" style={{ borderColor: '#27ae60', color: '#27ae60' }}>
                <span className="summary-label">RATE PAGATE</span>
                <span className="summary-value" style={{ color: '#27ae60' }}>{totalRatePagate}</span>
              </div>
            </div>
            <div className="summary-column">
              <div className="summary-box" style={{ borderColor: '#e74c3c', color: '#e74c3c' }}>
                <span className="summary-label">RATE MANCANTI</span>
                <span className="summary-value" style={{ color: '#e74c3c' }}>{totalRateManc}</span>
              </div>
              <div className="summary-box" style={{ borderColor: '#8e44ad', color: '#8e44ad' }}>
                <span className="summary-label">RATA MEDIA</span>
                <span className="summary-value" style={{ color: '#8e44ad' }}>{fmtEuro(rataMedieGlobale)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* IMPORTI SENZA INTERESSI */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Importi (senza interessi)</h3>
          <hr className="card-separator" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <div className="summary-box" style={{ borderColor: '#c0392b', color: '#c0392b' }}>
              <span className="summary-label">TOTALE DA PAGARE</span>
              <span className="summary-value" style={{ color: '#c0392b' }}>{fmtEuro(totaleDaPagare)}</span>
            </div>
            <div className="summary-box" style={{ borderColor: '#27ae60', color: '#27ae60' }}>
              <span className="summary-label">TOTALE PAGATO</span>
              <span className="summary-value" style={{ color: '#27ae60' }}>{fmtEuro(totalePagato)}</span>
            </div>
            <div className="summary-box" style={{ borderColor: '#d4a017', color: '#d4a017' }}>
              <span className="summary-label">TOTALE RESTANTE</span>
              <span className="summary-value" style={{ color: '#d4a017' }}>{fmtEuro(totaleRestante)}</span>
            </div>
          </div>
        </div>

        {/* INTERESSI */}
        {totaleInteressiTotali > 0 && (
          <div className="card section-card">
            <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Interessi (rate fisse)</h3>
            <hr className="card-separator" />
            <div className="summary-grid">
              <div className="summary-column">
                <div className="summary-box" style={{ borderColor: '#1a5276', color: '#1a5276' }}>
                  <span className="summary-label">INTERESSI TOTALI</span>
                  <span className="summary-value" style={{ color: '#1a5276' }}>{fmtEuro(totaleInteressiTotali)}</span>
                </div>
                <div className="summary-box" style={{ borderColor: '#3498db', color: '#3498db' }}>
                  <span className="summary-label">INTERESSI PAGATI</span>
                  <span className="summary-value" style={{ color: '#3498db' }}>{fmtEuro(totaleInteressiPagati)}</span>
                </div>
              </div>
              <div className="summary-column">
                <div className="summary-box" style={{ borderColor: '#e74c3c', color: '#e74c3c' }}>
                  <span className="summary-label">INTERESSI RESTANTI</span>
                  <span className="summary-value" style={{ color: '#e74c3c' }}>{fmtEuro(totaleInteressiRestanti)}</span>
                </div>
                <div className="summary-box" style={{ borderColor: '#c0392b', color: '#c0392b' }}>
                  <span className="summary-label">TOTALE CON INTERESSI</span>
                  <span className="summary-value" style={{ color: '#c0392b', fontSize: '0.85rem' }}>{fmtEuro(totaleDaPagareConInteressi)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AVANZAMENTO GLOBALE */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Avanzamento Globale</h3>
          <hr className="card-separator" />
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#333', letterSpacing: '1px' }}>PROGRESSO</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#333' }}>{progressTotale.toFixed(1)}%</span>
            </div>
            <div className="progress-bar big progress-bar-ticks">
              <div
                className="progress-fill"
                style={{ width: `${progressTotale}%`, background: getProgressColor(progressTotale) }}
              />
            </div>
          </div>
          <div className="summary-grid" style={{ marginTop: '0.75rem' }}>
            <div className="summary-column">
              <div className="summary-box" style={{ borderColor: '#27ae60', color: '#27ae60' }}>
                <span className="summary-label">RATE COMPLETATE</span>
                <span className="summary-value" style={{ color: '#27ae60' }}>{totalRateTotali > 0 ? ((totalRatePagate / totalRateTotali) * 100).toFixed(1) + '%' : '- %'}</span>
              </div>
            </div>
            <div className="summary-column">
              <div className="summary-box" style={{ borderColor: '#e74c3c', color: '#e74c3c' }}>
                <span className="summary-label">RATE RIMANENTI</span>
                <span className="summary-value" style={{ color: '#e74c3c' }}>{totalRateTotali > 0 ? ((totalRateManc / totalRateTotali) * 100).toFixed(1) + '%' : '- %'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* INFO EXTRA */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Info</h3>
          <hr className="card-separator" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {piuGrande && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>Finanziamento più grande</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#333' }}>{piuGrande.emoji} {piuGrande.name} ({piuGrande.totalAmount.toFixed(2)} €)</span>
              </div>
            )}
            {piuPiccolo && piuPiccolo.id !== piuGrande?.id && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>Finanziamento più piccolo</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#333' }}>{piuPiccolo.emoji} {piuPiccolo.name} ({piuPiccolo.totalAmount.toFixed(2)} €)</span>
              </div>
            )}
            {prossimaScadenza && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>Prossima scadenza</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#e67e22' }}>{prossimaScadenza.emoji} {prossimaScadenza.name} ({new Date(prossimaScadenza.endDate).toLocaleDateString('it-IT')})</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Importo medio per cartella</span>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#333' }}>{totaleFinanziamenti > 0 ? fmtEuro(totaleDaPagare / totaleFinanziamenti) : '- €'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Rate medie per cartella</span>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#333' }}>{totaleFinanziamenti > 0 ? (totalRateTotali / totaleFinanziamenti).toFixed(1) : '-'}</span>
            </div>
          </div>
        </div>

        {/* DETTAGLIO PER CARTELLA */}
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Dettaglio per Cartella</h3>
          <hr className="card-separator" />
          {financings.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', padding: '1rem 0' }}>Nessun finanziamento</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              {financings.map(f => {
                const paid = getPaid(f);
                const rest = Math.max(f.totalAmount - paid, 0);
                const ratePagate = getRatePagate(f);
                const prog = f.totalAmount > 0 ? Math.min((paid / f.totalAmount) * 100, 100) : 0;
                const done = isCompleted(f);
                return (
                  <div
                    key={f.id}
                    onClick={() => navigate(`/detail/${f.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', borderRadius: '0.5rem', border: `1px solid ${done ? '#27ae60' : '#ddd'}`, cursor: 'pointer', background: done ? '#f0faf0' : '#fafafa' }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{f.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#333' }}>{f.name}</span>
                        {done && <span style={{ fontSize: '0.6rem', background: '#27ae60', color: 'white', padding: '1px 5px', borderRadius: '3px' }}>Completato</span>}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '2px' }}>
                        {(f.rateMode || 'variabile') === 'fissa' ? 'Fissa' : 'Variabile'} · {f.rateType} · {ratePagate}/{f.totalMonths} rate
                      </div>
                      <div className="progress-bar" style={{ marginTop: '4px', height: '4px' }}>
                        <div className="progress-fill" style={{ width: `${prog}%`, background: getProgressColor(prog) }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: done ? '#27ae60' : '#c0392b' }}>{done ? 'Fatto' : (rest > 0.004 ? rest.toFixed(2) + ' €' : '- €')}</div>
                      <div style={{ fontSize: '0.6rem', color: '#999' }}>{done ? prog.toFixed(0) + '%' : 'restante'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
