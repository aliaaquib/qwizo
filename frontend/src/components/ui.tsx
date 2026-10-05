import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

// Shared UI primitives matching Qwizo's minimal professional design.

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'md' | 'sm';
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { md: 'px-5 py-2.5 text-sm', sm: 'px-3 py-1.5 text-xs' };
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-gray-100 text-ink hover:bg-gray-200',
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
      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition placeholder:text-gray-300"
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
    <div className="mb-4">
      <label className="block text-[13px] font-medium text-ink mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-xs text-gray-400 mt-1.5">{hint}</div>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 px-3.5 py-2.5 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-lg">
      {message}
    </div>
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
    <div className="min-h-screen bg-bg-soft flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="text-xl font-bold tracking-tight mb-1">Qwizo</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h1 className="text-xl font-bold mb-1">{title}</h1>
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
          {children}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-[13px] text-gray-500">
            {alt}
          </div>
        </div>
      </div>
    </div>
  );
}
