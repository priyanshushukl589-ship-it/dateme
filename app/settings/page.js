'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}

function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [blocked, setBlocked] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadBlocked = useCallback(async () => {
    const { data } = await supabase.rpc('get_blocked');
    setBlocked(data || []);
  }, []);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  async function togglePause() {
    setError('');
    setMessage('');
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_active: !profile.is_active })
      .eq('id', user.id);
    if (err) return setError(err.message);
    await refreshProfile();
    setMessage(profile.is_active ? 'Your profile is hidden. Nobody new will see you.' : 'Your profile is visible again.');
  }

  async function resetPasses() {
    setError('');
    setMessage('');
    const { error: err } = await supabase.rpc('reset_passes');
    if (err) return setError(err.message);
    setMessage('Done. People you passed on can show up again in Discover.');
  }

  async function unblock(id) {
    setError('');
    const { error: err } = await supabase.from('blocks').delete().eq('blocker', user.id).eq('blocked', id);
    if (err) return setError(err.message);
    loadBlocked();
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  async function deleteAccount() {
    setDeleting(true);
    setError('');
    try {
      // remove uploaded photos first
      const { data: files } = await supabase.storage.from('photos').list(user.id, { limit: 100 });
      if (files?.length) {
        await supabase.storage.from('photos').remove(files.map((f) => `${user.id}/${f.name}`));
      }
      const { error: err } = await supabase.rpc('delete_my_account');
      if (err) throw err;
      await signOut();
      router.replace('/');
    } catch (e) {
      setError(e.message || 'Could not delete your account.');
      setDeleting(false);
    }
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="block">
        <h2>Account</h2>
        <p className="muted">Signed in as {user.email}</p>
        <button className="btn btn-ghost" onClick={handleSignOut}>
          Sign out
        </button>
      </section>

      <section className="block">
        <h2>Discovery</h2>
        <div className="setting">
          <div>
            <strong>{profile.is_active ? 'Profile visible' : 'Profile hidden'}</strong>
            <p className="muted small">
              {profile.is_active
                ? 'People can discover you. Hide your profile to take a break. Your matches and chats stay.'
                : 'You are hidden from Discover. You can still chat with your matches.'}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={togglePause}>
            {profile.is_active ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="setting">
          <div>
            <strong>Passed on someone by mistake?</strong>
            <p className="muted small">Bring back everyone you swiped left on.</p>
          </div>
          <button className="btn btn-ghost" onClick={resetPasses}>
            Reset
          </button>
        </div>
        <p className="muted small">
          Change your age range, distance and who you want to see in <Link href="/profile">your profile</Link>.
        </p>
      </section>

      <section className="block">
        <h2>Blocked people</h2>
        {blocked.length === 0 && <p className="muted small">You haven&apos;t blocked anyone.</p>}
        {blocked.map((b) => (
          <div className="setting" key={b.blocked_id}>
            <div className="row-inline">
              {b.photo ? <img className="avatar sm" src={b.photo} alt={b.name} /> : <div className="avatar sm fallback">{b.name?.[0]}</div>}
              <strong>{b.name}</strong>
            </div>
            <button className="btn btn-ghost" onClick={() => unblock(b.blocked_id)}>
              Unblock
            </button>
          </div>
        ))}
      </section>

      <section className="block">
        <h2>Help &amp; legal</h2>
        <ul className="link-list">
          <li><Link href="/safety">Safety tips</Link></li>
          <li><Link href="/terms">Terms of Service</Link></li>
          <li><Link href="/privacy">Privacy Policy</Link></li>
        </ul>
      </section>

      <section className="block danger-zone">
        <h2>Delete account</h2>
        <p className="muted small">
          This permanently deletes your profile, photos, matches and messages. It cannot be undone. Type{' '}
          <strong>DELETE</strong> to confirm.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          aria-label="Type DELETE to confirm"
        />
        <button className="btn btn-danger" disabled={confirmText !== 'DELETE' || deleting} onClick={deleteAccount}>
          {deleting ? 'Deleting…' : 'Delete my account'}
        </button>
      </section>
    </div>
  );
}
