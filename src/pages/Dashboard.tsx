import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button, Card } from '../components/ui';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const logoutAll = useAuthStore((s) => s.logoutAll);
  const [busy, setBusy] = useState<'logout' | 'logout-all' | null>(null);

  async function handleLogout(kind: 'logout' | 'logout-all') {
    setBusy(kind);
    try {
      await (kind === 'logout' ? logout() : logoutAll());
    } finally {
      setBusy(null);
    }
  }

  const initials = (user?.name ?? user?.email ?? '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              loading={busy === 'logout'}
              onClick={() => handleLogout('logout')}
            >
              Log out
            </Button>
            <Button
              variant="danger"
              loading={busy === 'logout-all'}
              onClick={() => handleLogout('logout-all')}
            >
              Log out everywhere
            </Button>
          </div>
        </header>

        <Card>
          <div className="mb-6 flex items-center gap-4">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="size-14 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                {initials}
              </div>
            )}
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {user?.name ?? 'Unnamed user'}
              </p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <dl className="space-y-3 border-t border-slate-100 pt-4 text-sm">
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-500">User ID</dt>
              <dd className="min-w-0 break-all font-mono text-slate-700">{user?.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-500">Avatar</dt>
              <dd className="min-w-0 break-all font-mono text-slate-700">
                {user?.avatarUrl ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Access token (in memory)</dt>
              <dd className="mt-1 max-h-24 overflow-hidden rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-300">
                {accessToken
                  ? `${accessToken.slice(0, 64)}${accessToken.length > 64 ? '…' : ''}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Refresh the page — the session is silently restored via the httpOnly refresh cookie.
        </p>
      </div>
    </div>
  );
}
