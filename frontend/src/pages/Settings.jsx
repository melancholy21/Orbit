import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Lock, Bell, Palette, Settings as SettingsIcon, ChevronRight, Music, Check, ArrowLeft, Loader2, Save } from 'lucide-react';
import { logout, updateUser } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeProvider';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import userService from '../features/users/userService';
import toast from 'react-hot-toast';
import axios from 'axios';

const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'appearance' | 'spotify'

  // Profile forms
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isConnectingSpotify, setIsConnectingSpotify] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
      });
    }
  }, [user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updatedData = await userService.updateProfile(profileForm, user.token);
      dispatch(updateUser(updatedData));
      toast.success('Profile details updated!');
    } catch (err) {
      toast.error('Failed to update profile details.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnectSpotify = async () => {
    setIsConnectingSpotify(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('/api/spotify/login', config);
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast.error('Failed to connect Spotify.');
    } finally {
      setIsConnectingSpotify(false);
    }
  };

  const handleDisconnectSpotify = () => {
    dispatch(updateUser({ spotifyAccessToken: null }));
    toast.success('Spotify disconnected.');
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <SettingsIcon size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Profile quickcard */}
      <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary overflow-hidden">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              (user?.firstName || user?.lastName) ? (user.firstName ? user.firstName.charAt(0).toUpperCase() : user.lastName.charAt(0).toUpperCase()) : user?.username?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{user?.username}</h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-border/50 w-full overflow-x-auto scrollbar-hide">
        {[
          { id: 'profile', label: 'Profile', icon: <User size={16} /> },
          { id: 'appearance', label: 'Theme', icon: <Palette size={16} /> },
          { id: 'spotify', label: 'Spotify', icon: <Music size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 -mb-[2px] ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="shrink-0">{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <Card className="p-6 border-border/50 bg-card/30 backdrop-blur-sm">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-base font-bold text-foreground">Edit Profile Information</h3>
            <p className="text-xs text-muted-foreground">Customize your user details for others to see.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name</label>
                <Input
                  name="firstName"
                  placeholder="First name"
                  value={profileForm.firstName}
                  onChange={handleProfileChange}
                  className="bg-white/5 border-white/10 text-sm focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name</label>
                <Input
                  name="lastName"
                  placeholder="Last name"
                  value={profileForm.lastName}
                  onChange={handleProfileChange}
                  className="bg-white/5 border-white/10 text-sm focus:border-primary"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bio</label>
              <Input
                name="bio"
                placeholder="Tell us about yourself..."
                value={profileForm.bio}
                onChange={handleProfileChange}
                className="bg-white/5 border-white/10 text-sm focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</label>
                <Input
                  name="location"
                  placeholder="e.g. San Francisco, CA"
                  value={profileForm.location}
                  onChange={handleProfileChange}
                  className="bg-white/5 border-white/10 text-sm focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Website</label>
                <Input
                  name="website"
                  placeholder="e.g. example.com"
                  value={profileForm.website}
                  onChange={handleProfileChange}
                  className="bg-white/5 border-white/10 text-sm focus:border-primary"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSavingProfile} className="w-full gap-2 mt-2">
              {isSavingProfile ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </Button>
          </form>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">Theme Settings</h3>
            <p className="text-xs text-muted-foreground">Select your color theme preference for the Orbit UI.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Light Theme */}
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                  theme === 'light'
                    ? 'border-violet-500 bg-violet-500/5'
                    : 'border-border bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-5 h-5 rounded-full bg-white border border-gray-300" />
                  {theme === 'light' && <Check size={16} className="text-violet-500 font-bold" />}
                </div>
                <div className="w-full">
                  <span className="text-sm font-bold text-foreground block">Light Mode</span>
                  <span className="text-[10px] text-muted-foreground">Clean, high contrast</span>
                </div>
              </button>

              {/* Dark Theme (True Dark) */}
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                  theme === 'dark'
                    ? 'border-violet-500 bg-violet-500/5'
                    : 'border-border bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-5 h-5 rounded-full bg-neutral-950 border border-neutral-800" />
                  {theme === 'dark' && <Check size={16} className="text-violet-500 font-bold" />}
                </div>
                <div className="w-full">
                  <span className="text-sm font-bold text-foreground block">Dark Mode</span>
                  <span className="text-[10px] text-muted-foreground">Sleek AMOLED black</span>
                </div>
              </button>

              {/* Orbit Theme */}
              <button
                onClick={() => setTheme('orbit')}
                className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                  theme === 'orbit'
                    ? 'border-violet-500 bg-violet-500/5'
                    : 'border-border bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-900 via-slate-800 to-violet-950 border border-violet-900" />
                  {theme === 'orbit' && <Check size={16} className="text-violet-500 font-bold" />}
                </div>
                <div className="w-full">
                  <span className="text-sm font-bold text-foreground block">Orbit Mode</span>
                  <span className="text-[10px] text-muted-foreground">Deep Space (Violet & Emerald)</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Spotify Tab */}
        {activeTab === 'spotify' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">Spotify Authorization</h3>
            <p className="text-xs text-muted-foreground">
              Link your Spotify account to search your Liked Songs library and load tracks into the synchronized Lobby queue.
            </p>

            <div className="flex flex-col items-center justify-center p-6 border border-white/5 bg-white/5 rounded-2xl gap-4 mt-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Music size={32} className="text-emerald-400" />
              </div>
              
              <div className="text-center">
                <h4 className="text-sm font-bold text-foreground">
                  {user?.spotifyAccessToken ? 'Spotify Connected' : 'Spotify Disconnected'}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  {user?.spotifyAccessToken 
                    ? 'You can now browse your Spotify Library directly from the Music Player.' 
                    : 'Log in to Spotify to authorize Orbit to sync with your library.'}
                </p>
              </div>

              {user?.spotifyAccessToken ? (
                <Button 
                  onClick={handleDisconnectSpotify} 
                  variant="destructive"
                  className="w-full sm:w-auto px-6 h-10 text-sm font-semibold rounded-full"
                >
                  Disconnect Account
                </Button>
              ) : (
                <Button 
                  onClick={handleConnectSpotify} 
                  disabled={isConnectingSpotify}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-6 h-10 text-sm font-bold rounded-full gap-2"
                >
                  {isConnectingSpotify ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Connecting...
                    </>
                  ) : (
                    <>
                      Connect Spotify
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Logout */}
      <Button onClick={handleLogout} variant="destructive" className="w-full gap-2 h-12 text-sm font-bold rounded-xl bg-red-600/10 border border-red-600/25 text-red-400 hover:bg-red-600 hover:text-white transition-all mt-4 shadow-sm shadow-red-600/5">
        <LogOut size={18} /> Log Out
      </Button>
    </div>
  );
};

export default Settings;
