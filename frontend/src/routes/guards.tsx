import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

// Teacher-only routes. Unauthenticated users go to /login.
// Teachers who haven't finished onboarding go to /app/onboarding.
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// AppShell routes (sidebar layout). Redirects to onboarding until it's done.
// The onboarding page itself is always allowed through.
export function OnboardingGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }
  if (user && !user.onboarding_done && location.pathname !== '/app/onboarding') {
    return <Navigate to="/app/onboarding" replace />;
  }
  return <Outlet />;
}

// Auth pages. Already-signed-in teachers go to /app.
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
