import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { GoogleButton } from '../components/GoogleButton';
import { Alert, Button, Card, Input } from '../components/ui';

export function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const error = useAuthStore((s) => s.error);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLoading(true);
    setFormError(null);
    try {
      await register({
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
        name: String(data.get('name') ?? '') || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Create account</h1>
        <p className="mb-6 text-sm text-slate-500">Sign up to get started</p>

        <Alert>{formError ?? error}</Alert>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <Input
            label="Name"
            name="name"
            type="text"
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <GoogleButton />

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
