import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

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
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
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
      className="w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input outline-none focus:border-ink/40 transition placeholder:text-ink/30"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full px-4 py-3 text-[15px] bg-paper border border-line rounded-input outline-none focus:border-ink/40 transition placeholder:text-ink/30 min-h-[120px]"
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
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-paper border border-line rounded-card shadow-soft ${className}`}>
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
        <div className="text-center mb-8">
          <div className="text-xl font-semibold tracking-tight mb-1">Qwizo</div>
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
