import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Search, PlusSquare, User, Moon, Sun, Orbit } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';
import { useTheme } from './ThemeProvider';

const Layout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { isDarkMode, toggleDarkMode } = useTheme();

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/post', icon: PlusSquare, label: 'Post' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-border bg-background z-50 flex items-center justify-between px-4">
        {/* Logo Section */}
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md shadow-[0_2px_8px_rgba(66,133,244,0.4)]">
            <Orbit size={18} />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-wide" style={{ fontFamily: '"Dancing Script", cursive' }}>Orbit</h1>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleDarkMode}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onLogout} className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow pt-16 pb-20 flex justify-center relative z-10">
        <div className="w-full max-w-[600px] p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background z-50 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${isActive ? 'text-primary scale-110' : 'text-muted-foreground hover:text-primary'
                }`}
            >
              <Icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
