import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { api } from '@/lib/api/client';
import type { Quiz } from '@/types';
import { Button, Card, CopyButton, Input } from '@/components/ui';
import { PageHead, EmptyState, useConfirm, useToast } from '@/components/shared';

// Phase 7 — Share quiz. Students need no account: they join with the code on
// the homepage or open the share link directly. Mirrors the vanilla share
// view: quiz code, share link, QR code, unpublish.

function ShareBox({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 flex flex-col">
      <h4 className="text-[15px] font-semibold text-ink mb-1">{title}</h4>
      <p className="text-[13.5px] text-ink/55 mb-4">{body}</p>
      <div className="mt-auto">{children}</div>
    </Card>
  );
}

export function ShareQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const { show, el: toastEl } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const qrWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    api.getQuiz(id)
      .then(d => setQuiz(d.quiz))
      .catch(e => show(e instanceof Error ? e.message : 'Failed to load quiz.', true))
      .finally(() => setLoading(false));
  }, [id, show]);

  const unpublish = async () => {
    if (!quiz) return;
    const ok = await confirm(
      'Unpublish quiz?',
      'Students will no longer be able to open the share link. Existing results are kept.',
      'Unpublish',
    );
    if (!ok) return;
    try {
      await api.unpublishQuiz(quiz.id);
      show('Quiz unpublished.');
      navigate(`/app/quizzes/${quiz.id}`);
    } catch (e) {
      show(e instanceof Error ? e.message : 'Unpublish failed.', true);
    }
  };

  const downloadQr = () => {
    const svg = qrWrap.current?.querySelector('svg');
    if (!svg || !quiz?.share_code) {
      show('QR code is not available.', true);
      return;
    }
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qwizo-${quiz.share_code}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div>
        <PageHead title="Share quiz" subtitle="Loading…" />
        <div className="text-sm text-ink/40 py-8 text-center">Loading…</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div>
        <PageHead title="Share quiz" subtitle="The quiz could not be loaded." />
        <Link to="/app/quizzes" className="text-sm text-ink/60 hover:text-ink">← Back to quizzes</Link>
        {toastEl}
      </div>
    );
  }

  if (quiz.status !== 'published' || !quiz.share_code) {
    return (
      <div>
        <PageHead
          title="Share quiz"
          subtitle="Get students into your quiz."
          action={<Link to={`/app/quizzes/${quiz.id}`}><Button variant="secondary" size="sm">Back to editor</Button></Link>}
        />
        <EmptyState
          title="Publish first"
          body="This quiz needs to be published before you can share it."
          action={<Link to={`/app/quizzes/${quiz.id}`}><Button size="sm">Open editor</Button></Link>}
        />
        {dialog}
        {toastEl}
      </div>
    );
  }

  // Same public contract as the vanilla app: {origin}/q/{share_code}.
  const link = `${window.location.origin}/q/${quiz.share_code}`;

  return (
    <div>
      <PageHead
        title="Share quiz"
        subtitle={`"${quiz.title}" is live. Students need no account.`}
        action={
          <div className="flex gap-2">
            <Link to={`/app/quizzes/${quiz.id}`}><Button variant="secondary" size="sm">Back to editor</Button></Link>
            <Link to={`/app/quizzes/${quiz.id}/results`}><Button variant="secondary" size="sm">Results</Button></Link>
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ShareBox title="Quiz code" body="Students can enter this code on the Qwizo homepage.">
          <div className="text-[32px] font-bold tracking-[0.18em] text-ink mb-4">{quiz.share_code}</div>
          <CopyButton text={quiz.share_code} label="Copy code" />
        </ShareBox>

        <ShareBox title="Share link" body="Send this link directly — it opens the quiz.">
          <div className="flex gap-2 items-center">
            <Input value={link} readOnly aria-label="Share link" className="font-mono text-[13px]" />
            <CopyButton text={link} label="Copy" />
          </div>
        </ShareBox>

        <ShareBox title="QR code" body="Print it or show it on the board. Students scan and start.">
          <div ref={qrWrap} className="bg-white p-3 rounded-card border border-line inline-block mb-4">
            <QRCode value={link} size={180} />
          </div>
          <div>
            <Button variant="secondary" size="sm" onClick={downloadQr}>Download QR</Button>
          </div>
        </ShareBox>

        <ShareBox title="Unpublish" body="Take the quiz offline. The link and code stop working. Results are kept.">
          <Button variant="danger" size="sm" onClick={unpublish}>Unpublish quiz</Button>
        </ShareBox>
      </div>
      {dialog}
      {toastEl}
    </div>
  );
}
