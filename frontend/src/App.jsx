import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import { useTheme } from './components/ThemeProvider';
import ConstellationBackground from './components/ConstellationBackground';

function App() {
  const { isDarkMode } = useTheme();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {isDarkMode && <ConstellationBackground />}
      <Toaster position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="post" element={<Home />} />
            <Route path="profile" element={<div style={{ padding: 20, textAlign: 'center' }}>Profile Page</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
