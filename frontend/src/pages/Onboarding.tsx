import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api/client';
import { useAuth } from '@/features/auth/AuthContext';
import { QwizoLogo } from '@/components/QwizoLogo';
import { useToast } from '@/components/shared';

// Onboarding — role selection. Shown once right after signup.
// Qwizo's own take on the role screen: clean cards, brand accents,
// minimal geometric icons.

const ROLES = [
  {
    id: 'k12',
    title: 'K-12 School',
    sub: 'Teachers and school staff',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <path d="M8 20 L24 10 L40 20" />
        <path d="M12 18 V38" />
        <path d="M36 18 V38" />
        <path d="M8 38 H40" />
        <path d="M24 26 V34" />
      </svg>
    ),
  },
  {
    id: 'higher-ed',
    title: 'College / University',
    sub: 'Professors and lecturers',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <path d="M24 8 L42 16 L24 24 L6 16 Z" />
        <path d="M12 20 V32" />
        <path d="M36 20 V32" />
        <path d="M8 36 H40" />
      </svg>
    ),
  },
  {
    id: 'tutor',
    title: 'Private Tutor',
    sub: 'Tutors and coaching centers',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <circle cx="24" cy="16" r="7" />
        <path d="M10 40 C10 31 16 27 24 27 C32 27 38 31 38 40" />
      </svg>
    ),
  },
  {
    id: 'homeschool',
    title: 'Homeschool',
    sub: 'Parents and guardians',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
        <path d="M8 22 L24 10 L40 22" />
        <path d="M13 20 V38 H35 V20" />
        <path d="M21 38 V28 H27 V38" />
      </svg>
    ),
  },
];

export function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { show, el: toastEl } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  // Already onboarded (e.g. direct navigation) — skip to the app.
  useEffect(() => {
    if (user && user.onboarding_done) navigate('/app', { replace: true });
  }, [user, navigate]);

  const choose = async (roleId: string, label: string) => {
    setSaving(roleId);
    try {
      const d = await api.saveOnboarding(label);
      setUser(d.user);
      navigate('/app', { replace: true });
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not save. Try again.', true);
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center px-6 py-10">
      <QwizoLogo badge badgeSize={44} />
      <h1 className="mt-8 text-[28px] md:text-[32px] font-bold text-ink tracking-tight text-center">
        How will you use Qwizo?
      </h1>
      <p className="mt-2 text-ink/60 text-[15px] text-center max-w-md">
        Tell us who you teach — we'll tailor your experience.
      </p>

      <div className="w-full max-w-xl mt-8 flex flex-col gap-3">
        {ROLES.map(r => (
          <button
            key={r.id}
            onClick={() => choose(r.id, r.title)}
            disabled={saving !== null}
            className="group flex items-center gap-5 rounded-2xl border border-line bg-white px-6 py-5 text-left
              transition-all duration-180 hover:border-lime hover:shadow-soft hover:-translate-y-0.5
              focus-visible:outline-2 focus-visible:outline-lime disabled:opacity-60 disabled:cursor-wait"
          >
            <span className="text-ink/70 group-hover:text-ink transition-colors shrink-0">
              {r.icon}
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-ink text-[17px]">{r.title}</span>
              <span className="block text-ink/55 text-[14px] mt-0.5">{r.sub}</span>
            </span>
            {saving === r.id && (
              <span className="text-[14px] text-ink/50">Saving…</span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => choose('other', 'Other')}
        disabled={saving !== null}
        className="mt-6 text-[15px] font-medium text-ink/55 hover:text-ink transition-colors
          focus-visible:outline-2 focus-visible:outline-lime rounded"
      >
        Other
      </button>
      {toastEl}
    </div>
  );
}
