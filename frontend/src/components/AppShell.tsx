import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api/client';

const NAV = [
  { to: '/app', label: 'Home', end: true },
  { to: '/app/quizzes', label: 'Quizzes' },
  { to: '/app/question-bank', label: 'Question Bank' },
  { to: '/app/settings', label: 'Settings' },
];

// Teacher app shell: sidebar + main content.
// Matches the vanilla app's minimal professional layout.
export function AppShell() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white flex">
      <aside className="w-60 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-6 py-5">
          <span className="text-lg font-bold tracking-tight">Qwizo</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-bg-soft text-ink'
                    : 'text-gray-500 hover:text-ink hover:bg-gray-50'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-sm font-medium truncate">{user?.name}</div>
          <div className="text-xs text-gray-400 truncate mb-2">{user?.email}</div>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-ink font-medium"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 bg-bg-soft/50">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
