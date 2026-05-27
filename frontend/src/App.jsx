import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import { useTheme } from './components/ThemeProvider';
import ConstellationBackground from './components/ConstellationBackground';

import { LobbyProvider } from './context/LobbyContext';

// Lazy load pages for code-splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Hangs = lazy(() => import('./pages/Hangs'));
const Lobby = lazy(() => import('./pages/Lobby'));
const Messages = lazy(() => import('./pages/Messages'));
const Chat = lazy(() => import('./pages/Chat'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SinglePost = lazy(() => import('./pages/SinglePost'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

function App() {
  const { isDarkMode } = useTheme();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {isDarkMode && <ConstellationBackground />}
      <Toaster position="top-center" />
      <BrowserRouter>
        <LobbyProvider>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh] w-full">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/onboarding" element={<Onboarding />} />
              
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="search" element={<Search />} />
                <Route path="hangs" element={<Hangs />} />
                <Route path="lobby" element={<Lobby />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:id" element={<Profile />} />
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:userId" element={<Chat />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="post/:id" element={<SinglePost />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </LobbyProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
