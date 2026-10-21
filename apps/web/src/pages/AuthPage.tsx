import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { credentialsSchema, PASSWORD_MIN_LENGTH } from '@ideas-map/shared';
import { ApiRequestError } from '../api';
import { useAuth } from '../auth/AuthContext';

interface Props {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: Props) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const isLogin = mode === 'login';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setSubmitting(true);
    try {
      await (isLogin ? login : register)(parsed.data);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const otherLink = `${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>{isLogin ? 'Welcome back' : 'Create an account'}</h1>
        <p className="muted">
          {isLogin
            ? 'Sign in to tell the city what you want nearby.'
            : 'One account per person keeps the demand map honest.'}
        </p>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={PASSWORD_MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Please wait...' : isLogin ? 'Sign in' : 'Sign up'}
        </button>
        <p className="muted small">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link to={otherLink}>{isLogin ? 'Sign up' : 'Sign in'}</Link>
        </p>
      </form>
    </div>
  );
}
