'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function HomePage() {
  const router = useRouter();
  const { user, initialized, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!initialized) return;
    if (user) {
      router.replace('/chat');
    } else {
      router.replace('/login');
    }
  }, [user, initialized, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="typing-indicator">
        <span /><span /><span />
      </div>
    </div>
  );
}
