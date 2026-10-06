import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button, Card, Input } from '@/components/ui';
import { useToast } from '@/components/shared';

// Phase 9 — Join a quiz by code. Students need no account: they type the
// code from their teacher and land on the quiz intro (/q/:code).

export function JoinQuiz() {
  const { code: paramCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { show, el: toastEl } = useToast();
  const [code, setCode] = useState((paramCode || '').toUpperCase());

  const join = () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      show('Enter the code from your teacher.', true);
      return;
    }
    navigate(`/q/${encodeURIComponent(c)}`);
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="py-5">
        <div className="max-w-[1200px] mx-auto px-6">
          <Link to="/" aria-label="Qwizo home"><Logo markSize={30} /></Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="display text-2xl mb-2">Join a quiz</h1>
          <p className="text-[14px] text-ink/55 mb-6">Enter the code from your teacher. No account needed.</p>
          <label htmlFor="join-code" className="block text-left text-[13px] font-medium mb-1.5">
            Quiz code
          </label>
          <Input
            id="join-code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') join(); }}
            placeholder="e.g. FNHC-2474"
            autoComplete="off"
            maxLength={12}
            className="text-center font-mono tracking-[0.2em] text-lg mb-4"
            aria-label="Quiz code"
          />
          <Button onClick={join} className="w-full">Join quiz</Button>
          <p className="text-[13px] text-ink/45 mt-5">
            A teacher? <Link to="/signup" className="text-ink underline underline-offset-2">Create your own quizzes</Link>
          </p>
        </Card>
      </main>
      {toastEl}
    </div>
  );
}
