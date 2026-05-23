import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, User, Moon, Sun, Orbit, PartyPopper, Radio, MessageSquare, Bell } from 'lucide-react';
import { Settings } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from './ThemeProvider';
import MiniPlayer from './lobby/MiniPlayer';
import { useLobby } from '../context/LobbyContext';
import axios from 'axios';

const Layout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { socket, currentTrack, isConnected, hasJoined, progressMs, durationMs, isPlaying } = useLobby();

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const fetchUnreadMessagesCount = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const res = await axios.get(`/api/messages/conversations`, config);
      const unreadConvs = res.data.filter(conv => 
        conv.lastMessage && 
        conv.lastMessage.sender !== user?._id && 
        !conv.lastMessage.readBy.includes(user?._id)
      ).length;
      setUnreadMsgCount(unreadConvs);
    } catch (err) {
      console.error('Failed to fetch unread messages count', err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!user.isOnboarded) {
      navigate('/onboarding');
      return;
    }
    const fetchNotifs = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`/api/notifications`, config);
        const unread = res.data.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (err) {}
    };
    fetchNotifs();
  }, [user, navigate]);

  useEffect(() => {
    if (user?.token) {
      fetchUnreadMessagesCount();
    }
  }, [location.pathname, user?.token, user?._id]);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = () => setUnreadCount(prev => prev + 1);
    socket.on('newNotification', handleNewNotif);
    return () => socket.off('newNotification', handleNewNotif);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      const isViewingThisChat = location.pathname === `/messages/${msg.sender._id}`;
      if (!isViewingThisChat) {
        fetchUnreadMessagesCount();
      }
    };
    socket.on('newPrivateMessage', handleNewMessage);
    return () => socket.off('newPrivateMessage', handleNewMessage);
  }, [socket, location.pathname, user?.token, user?._id]);

  // Reset count if we visit notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  // Remove old logout handler since it's now in Settings.jsx

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/hangs', icon: PartyPopper, label: 'Hangs' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const isChatView = location.pathname.startsWith('/messages/') && location.pathname !== '/messages';

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Top App Bar */}
      {!isChatView && (
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
            onClick={() => navigate('/lobby')}
            className="text-muted-foreground hover:text-[#1DB954] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          </button>
          <button 
            className="text-muted-foreground hover:text-foreground transition-colors relative"
            onClick={() => navigate('/notifications')}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-destructive rounded-full flex items-center justify-center border border-background">
                <span className="text-[9px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </button>
          <button onClick={() => navigate('/settings')} className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>
      )}

      {/* Main Content Area */}
      {(() => {
        const isFinished = progressMs > 0 && durationMs > 0 && progressMs >= durationMs - 1500;
        const isMiniPlayerVisible = !isChatView && location.pathname !== '/lobby' && isConnected && hasJoined && currentTrack && !(isFinished && !isPlaying);
        return (
          <main className={`flex-grow flex justify-center relative z-10 ${isChatView ? '' : `pt-20 ${isMiniPlayerVisible ? 'pb-36' : 'pb-20'} p-4`}`}>
            <div className={`w-full ${isChatView ? 'max-w-full' : 'max-w-[600px]'}`}>
              <Outlet />
            </div>
          </main>
        );
      })()}

      {/* Mini Player */}
      {!isChatView && location.pathname !== '/lobby' && <MiniPlayer />}

      {/* Bottom Navigation */}
      {!isChatView && (
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background z-50 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all relative ${isActive ? 'text-primary scale-110' : 'text-muted-foreground hover:text-primary'
                }`}
            >
              <div className="relative">
                <Icon size={24} />
                {item.label === 'Messages' && unreadMsgCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-destructive rounded-full flex items-center justify-center border border-background animate-pulse">
                    <span className="text-[9px] font-bold text-destructive-foreground">
                      {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      )}
    </div>
  );
};

export default Layout;
