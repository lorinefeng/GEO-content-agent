'use client';

import React from 'react';
import axios from 'axios';
import { usePathname, useRouter } from 'next/navigation';

export type AuthUser = { id: string; username: string; role: 'admin' | 'user' };

export function useRequireAuth(opts: { admin?: boolean } = {}) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios
      .get('/api/auth/me')
      .then((res) => {
        if (!mounted) return;
        const u = res.data.user as AuthUser | null;
        if (!u) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        if (opts.admin && u.role !== 'admin') {
          router.replace('/');
          return;
        }
        setUser(u);
      })
      .catch(() => {
        if (!mounted) return;
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [opts.admin, pathname, router]);

  return { user, loading };
}

