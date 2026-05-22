import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Hangs from './pages/Hangs';
import Lobby from './pages/Lobby';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import SinglePost from './pages/SinglePost';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import { useTheme } from './components/ThemeProvider';
import ConstellationBackground from './components/ConstellationBackground';

import { LobbyProvider } from './context/LobbyContext';

function App() {
  const { isDarkMode } = useTheme();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {isDarkMode && <ConstellationBackground />}
      <Toaster position="top-center" />
      <BrowserRouter>
        <LobbyProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </LobbyProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
