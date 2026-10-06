import { useCallback, useState } from 'react';

// Shared page-level primitives — follow DESIGN_SYSTEM.md.

export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="h-section text-3xl">{title}</h1>
        <p className="text-[15px] text-ink/60 mt-1.5">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    draft: 'bg-neutral text-ink/60',
    published: 'bg-lime/40 text-ink',
    archived: 'bg-sky text-ink/70',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[13px] font-medium ${tones[status] || tones.draft}`}>
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-paper border border-line rounded-card p-12 text-center">
      <h3 className="text-lg font-medium mb-1.5">{title}</h3>
      <p className="text-[15px] text-ink/60 mb-5">{body}</p>
      {action}
    </div>
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<{
    title: string;
    message: string;
    okLabel: string;
    resolve: (v: boolean) => void;
  } | null>(null);

  // Stable identity for the same reason as useToast's `show`.
  const confirm = useCallback(
    (title: string, message: string, okLabel = 'Confirm') =>
      new Promise<boolean>(resolve => setPending({ title, message, okLabel, resolve })),
    [],
  );

  const dialog = pending && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={() => { pending.resolve(false); setPending(null); }}
      />
      <div className="relative bg-paper rounded-surface shadow-lift max-w-sm w-full p-7">
        <h3 className="text-lg font-medium mb-2">{pending.title}</h3>
        <p className="text-[15px] text-ink/60 mb-6">{pending.message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-5 py-2.5 text-sm font-medium text-ink/60 hover:text-ink"
            onClick={() => { pending.resolve(false); setPending(null); }}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded-full hover:bg-red-700"
            onClick={() => { pending.resolve(true); setPending(null); }}
          >
            {pending.okLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return { confirm, dialog };
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; err: boolean } | null>(null);
  // Stable identity: pages put `show` in effect/callback deps (e.g. the quiz
  // editor's loader). A new function every render would refire those effects
  // in a loop and wipe in-progress edits.
  const show = useCallback((msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  }, []);
  const el = toast && (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium shadow-lift ${
        toast.err ? 'bg-red-600 text-white' : 'bg-ink text-white'
      }`}
    >
      {toast.msg}
    </div>
  );
  return { show, el };
}

export function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDur(sec: number | null | undefined): string {
  if (sec == null) return '—';
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}
