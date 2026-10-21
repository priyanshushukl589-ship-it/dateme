'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

const REASONS = [
  'Fake profile or spam',
  'Inappropriate photos or messages',
  'Harassment or hate',
  'Seems under 18',
  'Scam or asking for money',
  'Other',
];

// Bottom sheet with Report / Block / Unmatch.
// onDone(action) is called with 'reported' | 'blocked' | 'unmatched'.
export default function SafetyMenu({ targetId, targetName, matchId, onClose, onDone }) {
  const { user } = useAuth();
  const [view, setView] = useState('menu'); // menu | report | block | unmatch
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function doBlock() {
    const { error: err } = await supabase
      .from('blocks')
      .insert({ blocker: user.id, blocked: targetId });
    if (err && err.code !== '23505') throw err; // 23505 = already blocked
    if (matchId) {
      const { error: delErr } = await supabase.from('matches').delete().eq('id', matchId);
      if (delErr) throw delErr;
    }
  }

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      if (action === 'block') {
        await doBlock();
        onDone('blocked');
      } else if (action === 'unmatch') {
        const { error: err } = await supabase.from('matches').delete().eq('id', matchId);
        if (err) throw err;
        onDone('unmatched');
      } else if (action === 'report') {
        const { error: err } = await supabase.from('reports').insert({
          reporter: user.id,
          reported: targetId,
          reason,
          details: details.trim(),
        });
        if (err) throw err;
        if (alsoBlock) await doBlock();
        onDone('reported');
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        {view === 'menu' && (
          <>
            <h3>{targetName}</h3>
            <button className="sheet-item" onClick={() => setView('report')}>
              Report
            </button>
            <button className="sheet-item danger" onClick={() => setView('block')}>
              Block
            </button>
            {matchId && (
              <button className="sheet-item danger" onClick={() => setView('unmatch')}>
                Unmatch
              </button>
            )}
            <button className="sheet-item muted" onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {view === 'report' && (
          <>
            <h3>Report {targetName}</h3>
            <p className="muted small">Your report is private. The person won&apos;t be told.</p>
            <label className="field">
              <span>What&apos;s the problem?</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Details (optional)</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
            <label className="check">
              <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
              <span>Also block this person</span>
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy} onClick={() => run('report')}>
              {busy ? 'Sending…' : 'Send report'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setView('menu')}>
              Back
            </button>
          </>
        )}

        {view === 'block' && (
          <>
            <h3>Block {targetName}?</h3>
            <p className="muted">
              You won&apos;t see each other any more and any chat between you will be deleted. You can
              unblock later in Settings.
            </p>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-danger btn-block" disabled={busy} onClick={() => run('block')}>
              {busy ? 'Blocking…' : 'Block'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setView('menu')}>
              Back
            </button>
          </>
        )}

        {view === 'unmatch' && (
          <>
            <h3>Unmatch with {targetName}?</h3>
            <p className="muted">The conversation will be deleted for both of you. This can&apos;t be undone.</p>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-danger btn-block" disabled={busy} onClick={() => run('unmatch')}>
              {busy ? 'Working…' : 'Unmatch'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setView('menu')}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
