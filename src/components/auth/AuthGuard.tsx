"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  roles?: Array<'user' | 'admin'>;
}

export function AuthGuard({ children, roles }: AuthGuardProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (roles && userProfile && !roles.includes(userProfile.role)) {
        router.push('/dashboard'); // Or an unauthorized page
      }
    }
  }, [user, userProfile, loading, router, roles]);

  if (loading || !user || (roles && (!userProfile || !roles.includes(userProfile.role)))) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
