'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// profile: undefined = still loading, null = signed in but no profile yet,
// object = the person's profile.
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const uidRef = useRef(null);

  const loadProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return undefined;
    }
    let active = true;

    function applySession(s) {
      if (!active) return;
      const uid = s?.user?.id ?? null;
      setSession(s);
      if (uid === uidRef.current) return; // same person (e.g. token refresh)
      uidRef.current = uid;
      if (!uid) {
        setProfile(null);
        return;
      }
      setProfile(undefined);
      // run outside the auth callback to avoid a Supabase deadlock
      setTimeout(() => active && loadProfile(uid), 0);
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      if (active) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => applySession(s));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(
    () => loadProfile(uidRef.current),
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (!isConfigured) return <SetupNeeded />;

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function SetupNeeded() {
  return (
    <div className="page">
      <h1>Almost there</h1>
      <p className="muted">
        DateMe can&apos;t find its Supabase settings yet. Add these two environment variables
        (on Vercel: Project &rarr; Settings &rarr; Environment Variables), then redeploy:
      </p>
      <pre className="code">
        NEXT_PUBLIC_SUPABASE_URL{'\n'}NEXT_PUBLIC_SUPABASE_ANON_KEY
      </pre>
      <p className="muted">Step-by-step instructions are in the README.md file.</p>
    </div>
  );
}
