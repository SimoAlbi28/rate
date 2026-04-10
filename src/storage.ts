import * as XLSX from 'xlsx';
import type { Financing } from './types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'rate-financings';
const LAST_SYNC_KEY = 'rate-last-sync';
const LAST_SYNC_ERROR_KEY = 'rate-last-sync-error';

// Local storage
export function loadFinancings(): Financing[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export function saveFinancings(financings: Financing[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(financings));
}

// Supabase sync
export async function loadFinancingsFromCloud(userId: string): Promise<Financing[]> {
  const { data, error } = await supabase
    .from('financings')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error || !data) return [];
  return (data.data as Financing[]) || [];
}

export async function saveFinancingsToCloud(userId: string, financings: Financing[]): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('financings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('financings')
        .update({ data: financings, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('financings')
        .insert({ user_id: userId, data: financings });
      if (error) throw error;
    }
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    localStorage.removeItem(LAST_SYNC_ERROR_KEY);
  } catch (err) {
    localStorage.setItem(LAST_SYNC_ERROR_KEY, (err as Error).message || 'Errore sconosciuto');
    throw err;
  }
}

// Merge local data into cloud (first login)
export async function mergeLocalToCloud(userId: string): Promise<Financing[]> {
  const local = loadFinancings();
  const cloud = await loadFinancingsFromCloud(userId);

  if (cloud.length === 0 && local.length > 0) {
    // First time: push local data to cloud
    await saveFinancingsToCloud(userId, local);
    return local;
  }

  if (cloud.length > 0) {
    // Cloud has data, use cloud (merge by adding local items not in cloud)
    const cloudIds = new Set(cloud.map(f => f.id));
    const newLocal = local.filter(f => !cloudIds.has(f.id));
    if (newLocal.length > 0) {
      const merged = [...cloud, ...newLocal];
      await saveFinancingsToCloud(userId, merged);
      return merged;
    }
    return cloud;
  }

  return local;
}

// Last sync helpers
export function getLastSyncISO(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function getLastSyncError(): string | null {
  return localStorage.getItem(LAST_SYNC_ERROR_KEY);
}

// --- EXCEL EXPORT (all financings) ---
export function exportAllFinancings(financings: Financing[]): void {
  if (financings.length === 0) {
    alert('Nessun finanziamento da esportare.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // --- Foglio 1: Riepilogo globale ---
  const riepilogo: (string | number)[][] = [];
  riepilogo.push(['RIEPILOGO FINANZIAMENTI', '', '', '', '', '', '', '', '', '']);
  riepilogo.push([
    'Nome', 'Tipo rata', 'Totale da pagare', 'Totale pagato', 'Restante',
    'Rate totali', 'Rate pagate', 'Data inizio', 'Data fine', 'Situazione',
  ]);

  for (const f of financings) {
    const rateMode = f.rateMode || 'variabile';
    const isFixed = rateMode === 'fissa';
    const interestPerRate = f.interestPerRate ?? 0;
    const paid = f.payments.reduce((s, p) => s + p.amount, 0) + (f.initialPaid || 0);
    const totalWithInterest = f.totalAmount + interestPerRate * f.totalMonths;
    const totalToPay = isFixed && interestPerRate > 0 ? totalWithInterest : f.totalAmount;
    const restante = Math.max(totalToPay - paid, 0);
    const ratePagate = f.payments.length + (f.initialPaidRates || 0);
    const situazione = ratePagate >= f.totalMonths
      ? 'Concluso'
      : restante <= 0
        ? 'Pareggio'
        : 'In corso';

    riepilogo.push([
      f.name,
      rateMode.charAt(0).toUpperCase() + rateMode.slice(1),
      totalToPay.toFixed(2) + ' €',
      paid.toFixed(2) + ' €',
      restante.toFixed(2) + ' €',
      f.totalMonths,
      ratePagate,
      f.startDate ? new Date(f.startDate).toLocaleDateString('it-IT') : '-',
      f.endDate ? new Date(f.endDate).toLocaleDateString('it-IT') : '-',
      situazione,
    ]);
  }

  const wsRiepilogo = XLSX.utils.aoa_to_sheet(riepilogo);
  wsRiepilogo['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRiepilogo, 'Riepilogo');

  // --- Un foglio per cartella ---
  const usedNames = new Set<string>();
  for (const f of financings) {
    // Sheet name must be unique and <= 31 chars, no special chars
    let base = f.name.replace(/[\[\]\/\\\?\*:]/g, '').slice(0, 31) || 'Cartella';
    let name = base;
    let n = 1;
    while (usedNames.has(name)) {
      const suffix = ` (${n})`;
      name = base.slice(0, 31 - suffix.length) + suffix;
      n++;
    }
    usedNames.add(name);

    const rateMode = f.rateMode || 'variabile';
    const isFixed = rateMode === 'fissa';
    const interestPerRate = f.interestPerRate ?? 0;
    const paid = f.payments.reduce((s, p) => s + p.amount, 0) + (f.initialPaid || 0);
    const rateAmount = f.fixedRateAmount || (f.totalMonths > 0 ? f.totalAmount / f.totalMonths : 0);

    const sheet: (string | number)[][] = [];
    sheet.push(['DATI CARTELLA', '']);
    sheet.push(['Nome', f.name]);
    sheet.push(['Tipo rata', rateMode.charAt(0).toUpperCase() + rateMode.slice(1)]);
    sheet.push(['Totale da pagare (senza interessi)', f.totalAmount.toFixed(2) + ' €']);
    if (interestPerRate > 0) {
      sheet.push(['Totale da pagare (con interessi)', (f.totalAmount + interestPerRate * f.totalMonths).toFixed(2) + ' €']);
      sheet.push(['Interessi per rata', interestPerRate.toFixed(2) + ' €']);
    }
    if (isFixed) sheet.push(['Rata fissa', rateAmount.toFixed(2) + ' €']);
    sheet.push(['Rate totali', f.totalMonths]);
    sheet.push(['Rate pagate', f.payments.length + (f.initialPaidRates || 0)]);
    sheet.push(['Pagato totale', paid.toFixed(2) + ' €']);
    sheet.push(['Data inizio', f.startDate ? new Date(f.startDate).toLocaleDateString('it-IT') : '-']);
    sheet.push(['Data fine', f.endDate ? new Date(f.endDate).toLocaleDateString('it-IT') : '-']);
    sheet.push(['', '']);
    sheet.push(['STORICO PAGAMENTI', '']);
    sheet.push(['N.', 'Data', 'Importo', 'Nota']);

    const sortedPayments = [...f.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedPayments.forEach((p, i) => {
      sheet.push([
        i + 1,
        new Date(p.date).toLocaleDateString('it-IT'),
        p.amount.toFixed(2) + ' €',
        p.note || '',
      ]);
    });
    if (sortedPayments.length > 0) {
      sheet.push([]);
      sheet.push(['', 'TOTALE', sortedPayments.reduce((s, p) => s + p.amount, 0).toFixed(2) + ' €', '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheet);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 18 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  try {
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Rate_backup_${stamp}.xlsx`, { bookType: 'xlsx' });
  } catch (err) {
    console.error('Errore export Excel:', err);
    alert("Errore durante l'esportazione: " + (err as Error).message);
  }
}
