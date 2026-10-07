import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { QwizoLogo } from '@/components/QwizoLogo';
import { api } from '@/lib/api/client';

const NAV = [
  {
    to: '/app', label: 'Home', end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    to: '/app/quizzes', label: 'My library',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
      </svg>
    ),
  },
  {
    to: '/app/reports', label: 'Reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 3v18h18" /><path d="M7 15l4-6 4 3 4-7" />
      </svg>
    ),
  },
  {
    to: '/app/students', label: 'Students',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17.5" cy="9.5" r="2.5" />
        <path d="M16 14.6c2.9.4 5.5 2.3 5.5 5.4" />
      </svg>
    ),
  },
  {
    to: '/app/playground', label: 'Playground',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z" />
      </svg>
    ),
  },
];

// Teacher app shell — follows DESIGN_SYSTEM.md.
// Same visual language as the homepage: no generic admin panel.
export function AppShell() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    navigate('/login');
  };

  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-neutral flex">
      <aside className="w-60 shrink-0 bg-paper border-r border-line flex flex-col
        sticky top-0 h-screen overflow-y-auto">
        <div className="px-6 py-5">
          <QwizoLogo markSize={28} />
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `interact flex items-center gap-3 px-4 py-2.5 rounded-control text-[15px] font-medium ${
                  isActive
                    ? 'bg-lime/50 text-ink'
                    : 'text-ink/60 hover:text-ink hover:bg-neutral'
                }`
              }
            >
              <span className="shrink-0">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        {/* profile card */}
        <div className="p-4 border-t border-line">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-full flex items-center gap-3 rounded-2xl px-2 py-2 text-left
                hover:bg-neutral transition-colors focus-visible:outline-2 focus-visible:outline-lime"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="w-10 h-10 rounded-full bg-sky flex items-center justify-center
                text-[16px] font-bold text-ink shrink-0">
                {initial}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium truncate">{user?.name}</span>
                <span className="block text-[13px] text-ink/50 truncate">{user?.email}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className={`w-4 h-4 text-ink/40 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <span
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  role="menu"
                  className="absolute bottom-full left-0 right-0 mb-2 z-20 bg-white border border-line
                    rounded-2xl shadow-lift py-1.5 overflow-hidden"
                >
                  <Link
                    to="/app/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-ink/70
                      hover:bg-neutral hover:text-ink transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 w-[18px] h-[18px]">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h.09a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
                    </svg>
                    Settings
                  </Link>
                  <button
                    role="menuitem"
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-ink/70
                      hover:bg-neutral hover:text-ink transition-colors text-left"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
                    </svg>
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div key={location.pathname} className="page-enter max-w-6xl mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
