'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { ChatIcon, CompassIcon, SlidersIcon, UserIcon } from './icons';

const TABS = [
  { href: '/discover', label: 'Discover', Icon: CompassIcon },
  { href: '/matches', label: 'Matches', Icon: ChatIcon },
  { href: '/profile', label: 'Profile', Icon: UserIcon },
  { href: '/settings', label: 'Settings', Icon: SlidersIcon },
];

export default function NavBar() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const ready = Boolean(user && profile);

  const loadUnread = useCallback(async () => {
    const { data } = await supabase.rpc('get_matches');
    if (data) setUnread(data.reduce((n, m) => n + (m.unread || 0), 0));
  }, []);

  // refresh whenever you move between pages
  useEffect(() => {
    if (ready) loadUnread();
  }, [ready, pathname, loadUnread]);

  // and instantly when a new message arrives
  useEffect(() => {
    if (!ready) return undefined;
    const channel = supabase
      .channel('nav-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, loadUnread)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, loadUnread]);

  if (!ready) return null;
  if (pathname.startsWith('/chat/')) return null;

  return (
    <nav className="nav">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
            <span className="nav-icon">
              <Icon size="1.45em" />
              {href === '/matches' && unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
