import { useState } from 'react';

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
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
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

  const confirm = (title: string, message: string, okLabel = 'Confirm') =>
    new Promise<boolean>(resolve => setPending({ title, message, okLabel, resolve }));

  const dialog = pending && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={() => { pending.resolve(false); setPending(null); }}
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-base font-bold mb-2">{pending.title}</h3>
        <p className="text-sm text-gray-500 mb-6">{pending.message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-ink"
            onClick={() => { pending.resolve(false); setPending(null); }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
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
  const show = (msg: string, err = false) => {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  };
  const el = toast && (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
        toast.err ? 'bg-red-600 text-white' : 'bg-ink text-white'
      }`}
    >
      {toast.msg}
    </div>
  );
  return { show, el };
}
