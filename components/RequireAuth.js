'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function Spinner() {
  return (
    <div className="center-screen">
      <div className="spinner" />
    </div>
  );
}

// Wrap a page in this to make sure the person is signed in
// (and, unless needProfile is false, has finished their profile).
export default function RequireAuth({ children, needProfile = true }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (profile === null && needProfile) router.replace('/profile');
  }, [loading, user, profile, needProfile, router]);

  if (loading || !user || profile === undefined) return <Spinner />;
  if (needProfile && !profile) return <Spinner />;
  return children;
}
