import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Button, Card, Input } from '@/components/ui';
import { PageHead, useToast } from '@/components/shared';

// Phase 12 — Settings. Teacher profile (name editable, email fixed) and a
// short About Qwizo card. Mirrors the vanilla settings view.

export function Settings() {
  const { user, setUser } = useAuth();
  const { show, el: toastEl } = useToast();
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const save = async () => {
    setErr(null);
    const n = name.trim();
    if (!n) {
      setErr('Enter your name.');
      return;
    }
    setSaving(true);
    try {
      const d = await api.updateMe(n);
      setUser(d.user);
      show('Saved.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHead title="Settings" subtitle="Your Qwizo teacher account." />
      <Card className="p-6 md:p-8 max-w-[560px] mb-4">
        {err && (
          <div className="mb-5 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-card">
            {err}
          </div>
        )}
        <div className="mb-5">
          <label htmlFor="set-name" className="block text-sm font-medium text-ink mb-2">Full name</label>
          <Input
            id="set-name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
            disabled={saving}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="set-email" className="block text-sm font-medium text-ink mb-2">Email</label>
          <Input id="set-email" value={user?.email || ''} disabled />
          <p className="text-[13px] text-ink/45 mt-1.5">Email cannot be changed.</p>
        </div>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Card>
      <Card className="p-6 md:p-8 max-w-[560px]">
        <h3 className="text-[15px] font-bold mb-2">About Qwizo</h3>
        <p className="text-sm text-ink/55">
          Create quizzes with AI or by hand, share them with a link, code or QR, and see results
          as students submit. Your data stays in your own private store.
        </p>
      </Card>
      {toastEl}
    </div>
  );
}
