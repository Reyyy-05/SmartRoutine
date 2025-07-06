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
        // If not authenticated, redirect to login
        router.push('/login');
      } else if (roles && userProfile && !roles.includes(userProfile.role)) {
        // If authenticated but role is not allowed, redirect to dashboard or unauthorized page
        // Adding this check here ensures that even if the user is logged in, they are redirected
        // if their role doesn't match the required roles for the protected route.
        router.push('/dashboard'); // Or to an unauthorized page
      }
    }
  }, [user, userProfile, loading, router, roles]);

  if (loading || !user || (roles && (!userProfile || !roles.includes(userProfile.role)))) {
    return (
      // Display a loading spinner or unauthorized message while checking auth status and roles
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* Use your theme's text-primary for the spinner color */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
