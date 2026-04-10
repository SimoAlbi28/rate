import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, nome: string, cognome: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PROFILE_KEY_MAP: Record<string, string> = {
  nome: 'profile-nome',
  cognome: 'profile-cognome',
  profileIcon: 'profileIcon',
  profileColor: 'profileColor',
};
const ACCOUNT_KEYS = [
  'profile-nome',
  'profile-cognome',
  'profile-pwd-hint',
  'profileIcon',
  'profileColor',
  'rate-financings',
  'rate-first-login',
];

// Populate localStorage cache from the user's Supabase user_metadata.
// This is the source of truth for authenticated users.
function applyMetadataToCache(user: User | null) {
  if (!user) return;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  for (const [metaKey, lsKey] of Object.entries(PROFILE_KEY_MAP)) {
    const v = meta[metaKey];
    if (typeof v === 'string') localStorage.setItem(lsKey, v);
    else localStorage.removeItem(lsKey);
  }
}

function clearAccountData() {
  for (const key of ACCOUNT_KEYS) localStorage.removeItem(key);
}

// Clears only the profile cache (not financings) so a guest -> user
// transition can still merge the guest's financings into cloud.
function clearProfileCache() {
  localStorage.removeItem('profile-nome');
  localStorage.removeItem('profile-cognome');
  localStorage.removeItem('profile-pwd-hint');
  localStorage.removeItem('profileIcon');
  localStorage.removeItem('profileColor');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if user chose guest mode before
    const guestMode = localStorage.getItem('rate-guest-mode');
    if (guestMode === 'true') {
      setIsGuest(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) applyMetadataToCache(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) applyMetadataToCache(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, nome: string, cognome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: undefined, data: { nome, cognome } },
    });
    if (error) return { error: error.message };
    // If signUp signed the user in, persist initial profile metadata before signing out
    if (data.session) {
      await supabase.auth.updateUser({ data: { nome, cognome, profileIcon: '👤', profileColor: '#3498db' } });
    }
    // Sign out after registration so user goes through login.
    // We do NOT clear local data: guest financings (if any) should still be
    // available to merge into the new account's cloud at first login.
    await supabase.auth.signOut();
    clearProfileCache();
    setUser(null);
    setSession(null);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    // Wipe stale profile cache (preserve any guest financings for merge)
    clearProfileCache();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) applyMetadataToCache(data.user);
    localStorage.removeItem('rate-guest-mode');
    setIsGuest(false);
    return { error: null };
  };

  const signOut = async () => {
    const wasUser = !!user;
    await supabase.auth.signOut();
    if (wasUser) clearAccountData();
    setUser(null);
    setSession(null);
    setIsGuest(false);
    localStorage.removeItem('rate-guest-mode');
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('rate-guest-mode', 'true');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest, signUp, signIn, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
