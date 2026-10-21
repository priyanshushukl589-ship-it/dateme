'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

export default function MatchesPage() {
  return (
    <RequireAuth>
      <Matches />
    </RequireAuth>
  );
}

function Avatar({ src, name }) {
  return src ? <img className="avatar" src={src} alt={name} /> : <div className="avatar fallback">{name?.[0]}</div>;
}

function Matches() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('get_matches');
    if (err) setError(err.message);
    else setRows(data || []);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('matches-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
      </div>
    );
  }
  if (!rows) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  const fresh = rows.filter((r) => !r.last_message);
  const chats = rows.filter((r) => r.last_message);

  return (
    <div className="page">
      <h1>Matches</h1>

      {rows.length === 0 && (
        <div className="empty">
          <h2>No matches yet</h2>
          <p className="muted">When you and someone else both swipe right, they show up here.</p>
          <Link className="btn btn-primary" href="/discover">
            Start swiping
          </Link>
        </div>
      )}

      {fresh.length > 0 && (
        <section className="block">
          <h2>New matches</h2>
          <div className="new-matches">
            {fresh.map((m) => (
              <Link key={m.match_id} href={`/chat/${m.match_id}`} className="new-match">
                <Avatar src={m.photo} name={m.name} />
                <span>{m.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {chats.length > 0 && (
        <section className="block">
          <h2>Messages</h2>
          <ul className="chat-list">
            {chats.map((m) => {
              const mine = m.last_sender === user.id;
              return (
                <li key={m.match_id}>
                  <Link href={`/chat/${m.match_id}`} className="chat-row">
                    <Avatar src={m.photo} name={m.name} />
                    <div className="chat-meta">
                      <div className="chat-top">
                        <strong>{m.name}</strong>
                        <span className="muted small">{timeAgo(m.last_at)}</span>
                      </div>
                      <div className={`chat-preview${m.unread > 0 ? ' unread' : ''}`}>
                        {mine ? 'You: ' : ''}
                        {m.last_message}
                      </div>
                    </div>
                    {m.unread > 0 && <span className="badge static">{m.unread}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
