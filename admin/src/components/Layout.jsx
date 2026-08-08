import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, Users, MapPin,
  Wallet, Flag, Settings, LogOut,
  Menu, X, ChevronRight, BarChart2, Megaphone
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/drivers', label: 'Drivers', icon: Car },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/trips', label: 'Trips', icon: MapPin },
  { path: '/wallet', label: 'Wallet', icon: Wallet },
  { path: '/reports', label: 'Reports', icon: Flag },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/config', label: 'Config', icon: Settings },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar — fixed at all screen sizes so it never scrolls with page content */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800
        transform transition-transform duration-200 ease-in-out
        flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800 shrink-0">
          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center">
            <span className="text-lg">🚗</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">Campus Chauffeur</p>
            <p className="text-gray-500 text-xs">Admin Panel</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav — scrolls independently if it ever grows past viewport height */}
        <nav className="p-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition
                  ${active
                    ? 'bg-yellow-400/10 text-yellow-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <Icon size={18} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User — pinned to bottom */}
        <div className="p-4 border-t border-gray-800 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-gray-900">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-gray-500 text-xs">Administrator</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-red-400 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content — offset by sidebar width on large screens, independent scroll */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center gap-4 lg:px-6 shrink-0">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-white font-semibold">
            {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-gray-400 text-sm">Live</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}