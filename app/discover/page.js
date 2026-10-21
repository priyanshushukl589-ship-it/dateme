'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/components/AuthProvider';
import SwipeCard from '@/components/SwipeCard';
import SafetyMenu from '@/components/SafetyMenu';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { HeartIcon, StarIcon, XIcon } from '@/components/icons';

export default function DiscoverPage() {
  return (
    <RequireAuth>
      <Discover />
    </RequireAuth>
  );
}

function Discover() {
  const { profile } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [notice, setNotice] = useState('');
  const [match, setMatch] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const seen = useRef(new Set());
  const fetching = useRef(false);
  const topCard = useRef(null);

  const fetchMore = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    const { data, error } = await supabase.rpc('get_discover', { max_results: 10 });
    fetching.current = false;
    setLoading(false);
    if (error) {
      setNotice(error.message);
      setExhausted(true);
      return;
    }
    const fresh = (data || []).filter((p) => !seen.current.has(p.id));
    fresh.forEach((p) => seen.current.add(p.id));
    if (fresh.length === 0) setExhausted(true);
    else setQueue((q) => [...q, ...fresh]);
  }, []);

  useEffect(() => {
    fetchMore();
  }, [fetchMore]);

  // top up the stack before it runs out
  useEffect(() => {
    if (!exhausted && !loading && queue.length > 0 && queue.length <= 3) fetchMore();
  }, [queue.length, exhausted, loading, fetchMore]);

  // hide notices after a few seconds
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  async function handleSwipe(person, dir) {
    setQueue((q) => q.filter((p) => p.id !== person.id));
    const { data, error } = await supabase.rpc('swipe_user', { target: person.id, dir });
    if (error) {
      setNotice(error.message);
      return;
    }
    if (data?.super_downgraded) {
      setNotice('You already used today’s Super Like, so we sent a regular Like instead.');
    }
    if (data?.match_id) setMatch({ matchId: data.match_id, person });
  }

  function refresh() {
    setLoading(true);
    setExhausted(false);
    fetchMore();
  }

  // keyboard shortcuts on desktop: ← pass, → like, ↑ super like
  useEffect(() => {
    function onKey(e) {
      if (match || menuFor) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') topCard.current?.swipe('pass');
      if (e.key === 'ArrowRight') topCard.current?.swipe('like');
      if (e.key === 'ArrowUp') topCard.current?.swipe('super');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [match, menuFor]);

  const top = queue[0];
  const next = queue[1];

  return (
    <div className="page discover">
      <header className="top-bar">
        <Logo size="md" />
      </header>

      {notice && <div className="toast">{notice}</div>}

      <div className="deck">
        {next && (
          <div className="swipe-card behind">
            {next.photos?.[0] && <img className="card-photo" src={next.photos[0]} alt="" draggable={false} />}
          </div>
        )}

        {top && (
          <SwipeCard
            key={top.id}
            ref={topCard}
            person={top}
            onSwipe={(dir) => handleSwipe(top, dir)}
            onMenu={() => setMenuFor(top)}
          />
        )}

        {!top && loading && (
          <div className="deck-empty">
            <div className="spinner" />
          </div>
        )}

        {!top && !loading && (
          <div className="deck-empty">
            <h2>You&apos;re all caught up</h2>
            <p className="muted">
              No more people to show right now. Try widening your age range or distance in{' '}
              <Link href="/profile">your profile</Link>, or check back later.
            </p>
            <button className="btn btn-primary" onClick={refresh}>
              Look again
            </button>
          </div>
        )}
      </div>

      {top && (
        <div className="actions">
          <button className="act act-pass" onClick={() => topCard.current?.swipe('pass')} aria-label="Pass">
            <XIcon size="1.6em" />
          </button>
          <button className="act act-super" onClick={() => topCard.current?.swipe('super')} aria-label="Super like">
            <StarIcon size="1.4em" />
          </button>
          <button className="act act-like" onClick={() => topCard.current?.swipe('like')} aria-label="Like">
            <HeartIcon size="1.6em" />
          </button>
        </div>
      )}

      {match && (
        <div className="modal-backdrop">
          <div className="match-modal">
            <h1>It&apos;s a match!</h1>
            <p>You and {match.person.name} liked each other.</p>
            <div className="match-photos">
              <img src={profile.photos?.[0]} alt="You" />
              <img src={match.person.photos?.[0]} alt={match.person.name} />
            </div>
            <Link className="btn btn-white btn-block" href={`/chat/${match.matchId}`}>
              Send a message
            </Link>
            <button className="btn btn-outline-white btn-block" onClick={() => setMatch(null)}>
              Keep swiping
            </button>
          </div>
        </div>
      )}

      {menuFor && (
        <SafetyMenu
          targetId={menuFor.id}
          targetName={menuFor.name}
          onClose={() => setMenuFor(null)}
          onDone={(action) => {
            setQueue((q) => q.filter((p) => p.id !== menuFor.id));
            setMenuFor(null);
            setNotice(action === 'reported' ? 'Thanks — we received your report.' : 'Done.');
          }}
        />
      )}
    </div>
  );
}
