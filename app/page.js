'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Logo from '@/components/Logo';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (profile) router.replace('/discover');
    else if (profile === null) router.replace('/profile');
  }, [loading, user, profile, router]);

  return (
    <div className="hero">
      <div className="hero-inner">
        <Logo size="lg" light />
        <h1>Meet someone worth swiping for.</h1>
        <p>Create your profile, swipe through people near you, and start chatting the moment you match.</p>

        <Link className="btn btn-white btn-block" href="/login?mode=signup">
          Create account
        </Link>
        <Link className="btn btn-outline-white btn-block" href="/login">
          I already have an account
        </Link>

        <small>
          For adults 18+ only. By continuing you agree to our <Link href="/terms">Terms</Link> and{' '}
          <Link href="/privacy">Privacy Policy</Link>. Read our <Link href="/safety">safety tips</Link>.
        </small>
      </div>
    </div>
  );
}
