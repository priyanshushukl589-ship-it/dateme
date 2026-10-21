'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import SafetyMenu from '@/components/SafetyMenu';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { clockTime } from '@/lib/utils';
import { BackIcon, MoreIcon, SendIcon } from '@/components/icons';

export default function ChatPage() {
  return (
    <RequireAuth>
      <Chat />
    </RequireAuth>
  );
}

function Chat() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [other, setOther] = useState(null);
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | missing
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const bottomRef = useRef(null);

  // load the conversation + listen for new messages
  useEffect(() => {
    let active = true;
    let channel;

    async function init() {
      const { data: matches } = await supabase.rpc('get_matches');
      const m = (matches || []).find((x) => x.match_id === id);
      if (!active) return;
      if (!m) {
        setState('missing');
        return;
      }
      setOther({ id: m.other_id, name: m.name, photo: m.photo });

      const { data: msgs, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', id)
        .order('created_at', { ascending: true })
        .limit(500);
      if (!active) return;
      if (err) setError(err.message);
      setMessages(msgs || []);
      setState('ready');
      supabase.rpc('mark_read', { p_match: id });

      channel = supabase
        .channel(`chat-${id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` },
          (payload) => {
            const msg = payload.new;
            setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
            if (msg.sender_id !== user.id) supabase.rpc('mark_read', { p_match: id });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` },
          (payload) => {
            setMessages((prev) => prev.map((x) => (x.id === payload.new.id ? payload.new : x)));
          }
        )
        .subscribe();
    }

    init();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [id, user.id]);

  // keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, state]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    setText('');
    const { data, error: err } = await supabase
      .from('messages')
      .insert({ match_id: id, sender_id: user.id, body })
      .select()
      .single();
    setSending(false);
    if (err) {
      setText(body);
      setError('Message not sent. ' + err.message);
      return;
    }
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  }

  if (state === 'loading') {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div className="page">
        <h1>Conversation not found</h1>
        <p className="muted">This match may have ended.</p>
        <Link className="btn btn-primary" href="/matches">
          Back to matches
        </Link>
      </div>
    );
  }

  const lastMineIndex = messages.reduce((acc, m, i) => (m.sender_id === user.id ? i : acc), -1);

  return (
    <div className="chat">
      <header className="chat-header">
        <Link href="/matches" className="icon-btn" aria-label="Back">
          <BackIcon size="1.4em" />
        </Link>
        {other.photo ? (
          <img className="avatar sm" src={other.photo} alt={other.name} />
        ) : (
          <div className="avatar sm fallback">{other.name?.[0]}</div>
        )}
        <strong className="chat-title">{other.name}</strong>
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="More options">
          <MoreIcon size="1.4em" />
        </button>
      </header>

      <div className="messages">
        {messages.length === 0 && (
          <p className="muted center">You matched with {other.name}. Say hi 👋</p>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`msg-row ${mine ? 'mine' : 'theirs'}`}>
              <div className="bubble">{m.body}</div>
              <div className="msg-time">
                {clockTime(m.created_at)}
                {mine && i === lastMineIndex && m.read_at ? ' · Seen' : ''}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error chat-error">{error}</p>}

      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${other.name}…`}
          maxLength={2000}
          autoComplete="off"
        />
        <button className="send" disabled={!text.trim() || sending} aria-label="Send">
          <SendIcon size="1.2em" />
        </button>
      </form>

      {menu && (
        <SafetyMenu
          targetId={other.id}
          targetName={other.name}
          matchId={id}
          onClose={() => setMenu(false)}
          onDone={() => router.replace('/matches')}
        />
      )}
    </div>
  );
}
