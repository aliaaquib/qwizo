import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { QwizoLogo } from '@/components/QwizoLogo';

// Qwizo UI primitives — follow DESIGN_SYSTEM.md.
// Primary: charcoal bg + white text. Secondary: white + border.
// Lime accent: selective only, never every CTA.

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'md' | 'sm' | 'lg';
}) {
  const base =
    'btn-interactive group inline-flex items-center justify-center font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none';
  const sizes = {
    sm: 'px-4 py-2 text-[13px]',
    md: 'px-6 py-3 text-[15px]',
    lg: 'px-8 py-4 text-base',
  };
  const variants = {
    primary: 'bg-ink text-white hover:bg-[#55555a]',
    secondary: 'bg-paper text-ink border border-line hover:border-ink/30',
    accent: 'bg-lime text-ink hover:brightness-95',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input placeholder:text-ink/30"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="input-qwizo w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input placeholder:text-ink/30 min-h-[120px]"
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-ink mb-2">{label}</label>
      {children}
      {hint && <div className="text-[13px] text-ink/50 mt-1.5">{hint}</div>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-5 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-card">
      {message}
    </div>
  );
}

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  /** Only for genuinely interactive cards — static info cards stay static. */
  interactive?: boolean;
}) {
  return (
    <div className={`bg-paper border border-line rounded-card shadow-soft ${interactive ? 'card-interactive' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'lime' | 'sky';
}) {
  const tones = {
    neutral: 'bg-neutral text-ink/70',
    lime: 'bg-lime text-ink',
    sky: 'bg-sky text-ink',
  };
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-[13px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  alt,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  alt: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sky/40 flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-8">
          <QwizoLogo />
        </div>
        <Card className="p-8">
          <h1 className="text-2xl font-medium tracking-tight mb-1.5">{title}</h1>
          <p className="text-[15px] text-ink/60 mb-6">{subtitle}</p>
          {children}
          <div className="mt-6 pt-5 border-t border-line text-center text-sm text-ink/60">
            {alt}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Interaction components (§21) ---------------- */

function TinyCheck({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function CopyGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Small icon-only button with a delayed tooltip. Use for non-obvious icons. */
export function IconButton({
  label,
  children,
  onClick,
  danger = false,
  className = '',
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <span className="has-tooltip">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`icon-btn ${danger ? 'icon-btn-danger' : ''} ${className}`}
      >
        {children}
      </button>
      <span className="tooltip-bubble" role="tooltip">{label}</span>
    </span>
  );
}

/** Wrap any element to give it a delayed tooltip. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="has-tooltip">
      {children}
      <span className="tooltip-bubble" role="tooltip">{label}</span>
    </span>
  );
}

/** Copy button with a smooth Copy → Copied transition and no layout shift. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable — still show feedback */
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="interact inline-flex items-center text-[13px] font-medium text-ink/60 hover:text-ink px-3 py-1.5 rounded-control hover:bg-neutral"
    >
      <span className="swap-stack" aria-live="polite">
        <span className={`swap-face ${copied ? 'opacity-0' : 'opacity-100'}`}>
          <CopyGlyph /> {label}
        </span>
        <span className={`swap-face ${copied ? 'opacity-100' : 'opacity-0'}`}>
          <TinyCheck /> Copied
        </span>
      </span>
    </button>
  );
}

/**
 * Button with honest async states: idle → busy → done.
 * Labels crossfade in place — the button never changes size mid-transition.
 */
export function AsyncButton({
  state,
  idle,
  busy,
  done,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'md' | 'sm' | 'lg';
  state: 'idle' | 'busy' | 'done';
  idle: ReactNode;
  busy: ReactNode;
  done: ReactNode;
}) {
  const { variant, size, className, ...rest } = props as {
    variant?: 'primary' | 'secondary' | 'accent' | 'danger';
    size?: 'md' | 'sm' | 'lg';
    className?: string;
  } & ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <Button variant={variant} size={size} className={className} disabled={state !== 'idle'} {...rest}>
      <span className="swap-stack" aria-live="polite">
        {(['idle', 'busy', 'done'] as const).map(s => (
          <span key={s} className={`swap-face ${state === s ? 'opacity-100' : 'opacity-0'}`}>
            {s === 'idle' ? idle : s === 'busy' ? busy : done}
          </span>
        ))}
      </span>
    </Button>
  );
}

/** Progress indicator whose fill animates instead of jumping. */
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const ratio = Math.min(1, Math.max(0, max > 0 ? value / max : 0));
  return (
    <div
      className="h-2 bg-neutral rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="progress-fill h-full bg-lime rounded-full" style={{ transform: `scaleX(${ratio})` }} />
    </div>
  );
}

/** Simple dropdown with the Qwizo open animation (opacity + scale + rise). */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  label,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="icon-btn"
      >
        {trigger}
      </button>
      {open && (
        <div role="menu" className={`dropdown-panel ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Menu item for use inside Dropdown. */
export function DropdownItem({
  children,
  onSelect,
  danger = false,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`dropdown-item ${danger ? 'text-red-600' : 'text-ink'}`}
    >
      {children}
    </button>
  );
}
