import type { Financing } from './types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'rate-financings';

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
  const { data: existing } = await supabase
    .from('financings')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabase
      .from('financings')
      .update({ data: financings, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  } else {
    await supabase
      .from('financings')
      .insert({ user_id: userId, data: financings });
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
