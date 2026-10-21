'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Logo from '@/components/Logo';

export default function ResetPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Please choose a password with at least 8 characters.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
    setTimeout(() => router.replace('/discover'), 1200);
  }

  return (
    <div className="page auth">
      <Link href="/" className="auth-logo">
        <Logo size="md" />
      </Link>
      <h1>Choose a new password</h1>

      {loading ? (
        <p className="muted">Checking your link…</p>
      ) : !user ? (
        <>
          <p className="muted">
            This page only works from the link in your reset email. Please request a new link.
          </p>
          <Link className="btn btn-primary btn-block" href="/login">
            Back to sign in
          </Link>
        </>
      ) : done ? (
        <p className="success">Password updated! Taking you to the app…</p>
      ) : (
        <form onSubmit={submit} className="stack">
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      )}
    </div>
  );
}
