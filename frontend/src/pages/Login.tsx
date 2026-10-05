import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';
import { Button, Input, Field, FormError, AuthShell } from '@/components/ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const go = async () => {
    setError(null);
    setBusy(true);
    try {
      const d = await api.login(email.trim(), password);
      setUser(d.user);
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your Qwizo teacher account."
      alt={<>New to Qwizo? <Link to="/signup" className="text-accent font-medium hover:underline">Create an account</Link></>}
    >
      <FormError message={error} />
      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@school.edu"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          autoFocus
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
        />
      </Field>
      <Button onClick={go} disabled={busy} className="w-full">
        {busy ? 'Logging in…' : 'Log in'}
      </Button>
    </AuthShell>
  );
}
