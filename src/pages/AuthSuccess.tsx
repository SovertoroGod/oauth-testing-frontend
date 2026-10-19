import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Landing spot for the backend's Google OAuth callback redirect:
 *   {WEB_URL}/auth/success?accessToken=…
 * Reads the token, hydrates the session, then goes to the dashboard.
 */
export function AuthSuccessPage() {
  const [params, setParams] = useSearchParams();
  const completeGoogleLogin = useAuthStore((s) => s.completeGoogleLogin);
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    // Strip the token from the address bar before doing anything else.
    setParams({}, { replace: true });
    completeGoogleLogin(accessToken ?? '').finally(() => navigate('/', { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50">
      <span className="size-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      <p className="text-sm text-slate-500">Completing sign-in…</p>
    </div>
  );
}
