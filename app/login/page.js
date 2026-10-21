'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') setMode('signup');
  }, []);

  // already signed in? go to the app
  useEffect(() => {
    if (!loading && user) router.replace('/discover');
  }, [loading, user, router]);

  function switchMode(next) {
    setMode(next);
    setError('');
    setInfo('');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'signup') {
      if (!adult) return setError('You must confirm that you are 18 or older.');
      if (password.length < 8) return setError('Please choose a password with at least 8 characters.');
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        router.replace('/discover');
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/profile` },
        });
        if (err) throw err;
        if (data.session) {
          router.replace('/profile');
        } else {
          setInfo('Account created! Check your email and click the confirmation link, then come back and sign in.');
          setMode('signin');
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset`,
        });
        if (err) throw err;
        setInfo('If that email has an account, a reset link is on its way.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back';

  return (
    <div className="page auth">
      <Link href="/" className="auth-logo">
        <Logo size="md" />
      </Link>
      <h1>{title}</h1>

      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        {mode !== 'forgot' && (
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            />
          </label>
        )}

        {mode === 'signup' && (
          <label className="check">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <span>
              I am 18 or older and agree to the <Link href="/terms">Terms</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </label>
        )}

        {error && <p className="error">{error}</p>}
        {info && <p className="success">{info}</p>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
        </button>
      </form>

      <div className="auth-links">
        {mode === 'signin' && (
          <>
            <button className="link" onClick={() => switchMode('forgot')}>
              Forgot password?
            </button>
            <button className="link" onClick={() => switchMode('signup')}>
              New here? Create an account
            </button>
          </>
        )}
        {mode === 'signup' && (
          <button className="link" onClick={() => switchMode('signin')}>
            Already have an account? Sign in
          </button>
        )}
        {mode === 'forgot' && (
          <button className="link" onClick={() => switchMode('signin')}>
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
