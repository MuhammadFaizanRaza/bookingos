'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

// Soft auth guard: shows a brief loading state while the session resolves.
// In demo mode (API offline) the dashboard still renders with mock data so
// it can always be shown — we never hard-redirect away from the demo.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
