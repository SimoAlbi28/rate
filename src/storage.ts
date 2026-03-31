import type { Financing } from './types';

const STORAGE_KEY = 'rate-financings';

export function loadFinancings(): Financing[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export function saveFinancings(financings: Financing[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(financings));
}
