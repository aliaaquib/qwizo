import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { QwizoLogo } from '@/components/QwizoLogo';
import { api } from '@/lib/api/client';

const NAV = [
  { to: '/app', label: 'Home', end: true },
  { to: '/app/quizzes', label: 'Quizzes' },
  { to: '/app/question-bank', label: 'Question Bank' },
  { to: '/app/templates', label: 'Templates' },
  { to: '/app/settings', label: 'Settings' },
];

// Teacher app shell — follows DESIGN_SYSTEM.md.
// Same visual language as the homepage: no generic admin panel.
export function AppShell() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    navigate('/login');
  };

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
                `interact block px-4 py-2.5 rounded-control text-[15px] font-medium ${
                  isActive
                    ? 'bg-lime/50 text-ink'
                    : 'text-ink/60 hover:text-ink hover:bg-neutral'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-5 border-t border-line">
          <div className="text-[15px] font-medium truncate">{user?.name}</div>
          <div className="text-[13px] text-ink/50 truncate mb-2">{user?.email}</div>
          <button
            onClick={logout}
            className="interact text-[13px] text-ink/60 hover:text-ink font-medium"
          >
            Log out
          </button>
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
