import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';
import { Button, Input, Field, FormError, AuthShell } from '@/components/ui';

export function Signup() {
  const [name, setName] = useState('');
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
      const d = await api.signup(name.trim(), email.trim(), password);
      setUser(d.user);
      navigate('/app/onboarding', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed.');
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free for teachers. Your quizzes stay yours."
      alt={<>Already have an account? <Link to="/login" className="text-accent font-medium hover:underline">Log in</Link></>}
    >
      <FormError message={error} />
      <Field label="Full name">
        <Input
          autoComplete="name"
          placeholder="Aiza Toktogulova"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          autoFocus
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@school.edu"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
        />
      </Field>
      <Field label="Password" hint="Use 8 or more characters.">
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
        />
      </Field>
      <Button onClick={go} disabled={busy} className="w-full">
        {busy ? 'Creating…' : 'Create account'}
      </Button>
    </AuthShell>
  );
}
