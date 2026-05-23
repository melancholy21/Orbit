import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Radio, Eye, Zap, Moon, Music, Loader2, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, ListMusic, Plus, Search, Trash2, X, ChevronDown, Users,
  Shuffle, Repeat, Heart, Share2, Headphones
} from 'lucide-react';
import { updateSpotifyToken, getMe } from '../features/auth/authSlice';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLobby } from '../context/LobbyContext';
import toast from 'react-hot-toast';

const formatTime = (ms) => {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const Lobby = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const progressBarRef = useRef(null);

  const {
    isConnected,
    lobbyUsers,
    messages,
    queue,
    currentTrackIndex,
    isPlaying,
    sleepWarning,
    setSleepWarning,
    joinLobby,
    leaveLobby,
    updateMode,
    sendMessage,
    addToQueue,
    clearQueue,
    hasJoined,
    setHasJoined,
    mode,
    setMode,
    currentTrack,
    nextTrack,
    currentSpotifyTrack,
    isReady,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    playbackError,
    progressMs,
    durationMs,
    togglePlay,
    previousTrack,
    skipTrack,
    repeatMode,
    shuffleQueue,
    toggleRepeat,
    isAudioSyncEnabled,
    activateAudioSync,
    requestSync,
  } = useLobby();

  const [activeTab, setActiveTab] = useState('player'); // 'player' | 'queue' | 'listeners'
  const [trackUrl, setTrackUrl] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [isConnectingSpotify, setIsConnectingSpotify] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [queueSubTab, setQueueSubTab] = useState('library'); // 'library' | 'queue' | 'paste'
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const volumeRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleShuffle = () => {
    if (queue.length <= 1) {
      toast.error('Add more tracks to shuffle the queue!');
      return;
    }
    shuffleQueue();
    toast.success('Queue shuffled!');
  };

  useEffect(() => {
    const token = searchParams.get('access_token');
    if (token) {
      dispatch(updateSpotifyToken(token));
      setSearchParams({});
      
      // Auto-popup setup guide for mobile users upon redirecting back
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        setShowHelpModal(true);
      }
    }
    const err = searchParams.get('error');
    if (err) {
      if (err === 'spotify_auth_failed') {
        toast.error('Spotify Connection Failed. Please ensure your Spotify API credentials and Premium account are set up correctly.');
      } else {
        toast.error(`Authentication Error: ${err}`);
      }
      setSearchParams({});
    }
  }, [searchParams, dispatch, setSearchParams]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      dispatch(getMe());
    }
  }, [dispatch, navigate]);

  const handleRefreshSpotifyToken = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.get('/api/spotify/refresh_token', config);
      dispatch(updateSpotifyToken(data.access_token));
      return data.access_token;
    } catch (err) {
      console.error('Failed to refresh Spotify token', err);
      return null;
    }
  };

  // Fetch Spotify Liked Songs on token update or join
  useEffect(() => {
    if (!user?.spotifyAccessToken) return;
    const fetchLikedSongs = async (tokenToUse = user.spotifyAccessToken) => {
      setLibraryLoading(true);
      try {
        const { data } = await axios.get('https://api.spotify.com/v1/me/tracks?limit=50', {
          headers: { Authorization: `Bearer ${tokenToUse}` }
        });
        setLikedSongs(data.items?.filter(i => i && i.track).map(i => i.track) || []);
      } catch (err) {
        // If token is expired or unauthorized, try refreshing it once
        if (err.response?.status === 401 || err.response?.status === 403) {
          console.log('Spotify token expired or invalid. Attempting to refresh...');
          const newToken = await handleRefreshSpotifyToken();
          if (newToken) {
            try {
              const { data } = await axios.get('https://api.spotify.com/v1/me/tracks?limit=50', {
                headers: { Authorization: `Bearer ${newToken}` }
              });
              setLikedSongs(data.items?.filter(i => i && i.track).map(i => i.track) || []);
              return;
            } catch (retryErr) {
              console.error('Failed to fetch liked songs after token refresh', retryErr);
            }
          }
        }
        console.error('Failed to fetch liked songs', err);
        const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
        toast.error(`Failed to fetch liked songs from Spotify: ${errMsg}`);
      } finally {
        setLibraryLoading(false);
      }
    };
    fetchLikedSongs();
  }, [user?.spotifyAccessToken]);

  const addTrackFromLibrary = (track) => {
    addToQueue(`spotify:track:${track.id}`, `${track.name} – ${track.artists.map(a => a.name).join(', ')}`);
    toast.success(`Added ${track.name} to queue`);
  };

  const handleRejoin = () => {
    setSleepWarning(false);
    joinLobby('active');
    setHasJoined(true);
  };

  const handleLeave = () => {
    leaveLobby();
    setHasJoined(false);
    navigate('/');
  };

  const handleConnectSpotify = async () => {
    setIsConnectingSpotify(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('/api/spotify/login', config);
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      setIsConnectingSpotify(false);
    }
  };

  const handleAddToQueue = () => {
    if (!trackUrl.trim()) return;
    let finalUrl = trackUrl.trim();
    if (finalUrl.includes('open.spotify.com/track/')) {
      const trackId = finalUrl.split('track/')[1].split('?')[0];
      finalUrl = `spotify:track:${trackId}`;
    }
    addToQueue(finalUrl, trackTitle.trim() || 'Spotify Track');
    setTrackUrl('');
    setTrackTitle('');
  };

  const progressPercent = durationMs ? (progressMs / durationMs) * 100 : 0;

  // Extract dominant colors from album art for dynamic background
  const albumArt = currentSpotifyTrack?.album?.images?.[0]?.url;

  // Sleep timeout screen
  if (sleepWarning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Moon size={36} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">You fell asleep! 😴</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
          You were disconnected after 30 minutes of inactivity to save battery.
        </p>
        <Button onClick={handleRejoin} className="gap-2 h-12 px-6 text-base">
          <Radio size={18} /> Rejoin Session
        </Button>
      </div>
    );
  }

  // If not connected to Spotify yet, show Connect Spotify setup screen
  if (!user?.spotifyAccessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-600/30 via-primary/20 to-emerald-500/30 flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.2)]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center shadow-lg">
              <Music size={32} className="text-white" />
            </div>
          </div>
          {lobbyUsers.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
              {lobbyUsers.length} Live
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-black text-foreground mb-2 tracking-tight">Orbit Music</h1>
          <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed">
            Listen together with friends. Add tracks and share your vibe in real-time.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
          <p className="text-xs text-muted-foreground text-center">
            A Spotify Premium account is required to stream music.
          </p>
          <Button
            onClick={handleConnectSpotify}
            disabled={isConnectingSpotify}
            className="w-full gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold h-13 rounded-full text-base"
          >
            {isConnectingSpotify ? <Loader2 className="animate-spin" size={18} /> : <Music size={18} />}
            Connect Spotify
          </Button>
        </div>
      </div>
    );
  }

  // If connected to Spotify but not socket lobby yet, show loading spinner
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <Loader2 className="animate-spin text-violet-500" size={36} />
        <p className="text-sm text-muted-foreground font-medium">Connecting to Lobby...</p>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //   MAIN MUSIC PLAYER VIEW
  // ═══════════════════════════════════════
  return (
    <div className="flex flex-col w-full -mt-2 relative" style={{ height: 'calc(100vh - 9rem)' }}>

      {/* ─── Dynamic Background ─── */}
      {albumArt && (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
          <img src={albumArt} alt="" className="w-full h-full object-cover scale-150 blur-[80px] opacity-30" />
          <div className="absolute inset-0 bg-background/70" />
        </div>
      )}

      {/* ─── Top Bar ─── */}
      <div className="flex items-center justify-between px-2 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold">{lobbyUsers.length} listening</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLeave}
          className="text-xs h-8 rounded-full text-red-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
        >
          Leave Lobby
        </Button>
      </div>

      {/* ─── PLAYER TAB VIEW ─── */}
      {activeTab === 'player' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-hidden min-h-0">
          {/* Album Art */}
          <div className="relative mb-6 flex-shrink-0">
            {albumArt ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 rounded-2xl" />
                <img
                  src={albumArt}
                  alt="Album"
                  className={`w-56 h-56 sm:w-64 sm:h-64 object-cover shadow-2xl shadow-black/40 transition-all duration-700 ${isPlaying ? 'rounded-full animate-[spin_20s_linear_infinite]' : 'rounded-2xl'
                    }`}
                />
              </div>
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl bg-gradient-to-br from-violet-900/50 to-emerald-900/50 flex items-center justify-center border border-white/5">
                <Music size={64} className="text-white/20" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="text-center w-full max-w-[320px] mb-4 flex-shrink-0">
            <h2 className="text-xl font-black text-foreground truncate">
              {currentSpotifyTrack?.name || currentTrack?.title || 'No Track'}
            </h2>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {currentSpotifyTrack?.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
            </p>
            {currentTrack?.addedBy?.username && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Added by {currentTrack.addedBy.username}
              </p>
            )}
          </div>

          {/* Active Audio Sync Switcher */}
          {!isAudioSyncEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                activateAudioSync();
                requestSync();
              }}
              className="mb-4 text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 rounded-full px-4 py-1 h-8 animate-pulse shrink-0 cursor-pointer"
            >
              Listen on this device
            </Button>
          )}

          {/* Progress Bar */}
          <div className="w-full max-w-[320px] mb-3 flex-shrink-0">
            <div
              ref={progressBarRef}
              className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden cursor-pointer group"
            >
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-1000 ease-linear relative group-hover:h-2"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{formatTime(progressMs)}</span>
              <span className="text-[10px] text-muted-foreground">{formatTime(durationMs)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center justify-center gap-4 mb-4 flex-shrink-0 w-full max-w-[320px]">
            {/* First line: Previous, Play/Pause, Next */}
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={previousTrack}
                className="text-muted-foreground active:text-foreground active:scale-90 transition-all p-3 cursor-pointer"
                title="Previous Track"
              >
                <SkipBack size={26} className="fill-current" />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-600 to-emerald-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
              </button>
              <button
                onClick={skipTrack}
                className="text-muted-foreground active:text-foreground active:scale-90 transition-all p-3 cursor-pointer"
                title="Next Track"
              >
                <SkipForward size={26} className="fill-current" />
              </button>
            </div>

            {/* Second line: 4 Circles with icons */}
            <div className="flex items-center justify-center gap-5">
              {/* Volume Circle */}
              <div ref={volumeRef} className="relative">
                <button
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-90 cursor-pointer ${showVolumeSlider
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-400 font-bold shadow-md shadow-violet-500/10'
                    : isMuted || volume === 0
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-white/5 border-white/10 text-muted-foreground active:text-foreground hover:bg-white/10 hover:border-white/20'
                    }`}
                  title="Volume"
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                {/* Horizontal slider popover on click/tap */}
                {showVolumeSlider && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-3 bg-card/95 border border-white/10 rounded-xl shadow-xl flex items-center w-36 gap-2 backdrop-blur-md z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        if (val === 0) {
                          setIsMuted(true);
                        } else {
                          setIsMuted(false);
                        }
                      }}
                      className="w-full h-1 accent-violet-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-muted-foreground min-w-[20px] font-bold">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Randomize (Shuffle) Circle */}
              <button
                onClick={handleShuffle}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-muted-foreground active:text-foreground active:scale-90 transition-all cursor-pointer hover:bg-white/10 hover:border-white/20"
                title="Shuffle Queue"
              >
                <Shuffle size={20} />
              </button>

              {/* Loop Circle */}
              <button
                onClick={toggleRepeat}
                className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all relative active:scale-90 cursor-pointer ${repeatMode !== 'off'
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-400 font-bold'
                  : 'bg-white/5 border-white/10 text-muted-foreground active:text-foreground hover:bg-white/10 hover:border-white/20'
                  }`}
                title={repeatMode === 'track' ? 'Loop 1 Time' : repeatMode === 'queue' ? 'Loop Entire Queue' : 'Loop Off'}
              >
                <Repeat size={20} />
                {repeatMode === 'track' && (
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-violet-600 text-white rounded-full w-4 h-4 flex items-center justify-center scale-90 border border-background font-semibold">1</span>
                )}
                {repeatMode === 'queue' && (
                  <span className="absolute -bottom-1 -right-1 text-[8px] bg-green-600 text-white rounded-full w-4 h-4 flex items-center justify-center scale-90 border border-background font-semibold">∞</span>
                )}
              </button>

              {/* Liked Songs Circle */}
              <button
                onClick={() => { setActiveTab('queue'); setQueueSubTab('library'); }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-muted-foreground active:text-foreground active:scale-90 transition-all cursor-pointer hover:bg-white/10 hover:border-white/20"
                title="Liked Songs"
              >
                <Heart size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUEUE TAB VIEW ─── */}
      {activeTab === 'queue' && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 px-3 py-2 shrink-0 w-full">
            {[{ id: 'library', label: 'Library' }, { id: 'queue', label: `Queue (${queue.length})` }, { id: 'paste', label: 'Paste URL' }].map(t => (
              <button
                key={t.id}
                onClick={() => setQueueSubTab(t.id)}
                className={`flex-1 text-center py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all border ${queueSubTab === t.id
                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-600/30'
                  : 'bg-white/5 border-transparent text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Library sub-tab */}
          {queueSubTab === 'library' && (
            <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-2">
              {libraryLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-violet-400" size={24} />
                </div>
              ) : likedSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Music size={40} className="text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No liked songs found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Like some tracks on Spotify to see them here!</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Your Liked Songs</h4>
                  {likedSongs.map((track, i) => (
                    <button
                      key={track.id + '-' + i}
                      onClick={() => addTrackFromLibrary(track)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-violet-500/10 transition-colors text-left"
                    >
                      {track.album?.images?.[2]?.url ? (
                        <img src={track.album.images[2].url} alt="" className="w-9 h-9 rounded object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-white/5 flex items-center justify-center">
                          <Music size={14} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate text-foreground font-medium">{track.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{track.artists?.map(a => a.name).join(', ')}</p>
                      </div>
                      <Plus size={16} className="text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Queue sub-tab */}
          {queueSubTab === 'queue' && (
            <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-2">
              <div className="flex items-center justify-between py-2 shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Now Playing</h3>
                {queue.length > 0 && <button onClick={clearQueue} className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1"><Trash2 size={12} /> Clear</button>}
              </div>
              {queue.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center"><ListMusic size={40} className="text-muted-foreground/20 mb-3" /><p className="text-sm text-muted-foreground">Queue is empty</p></div>
              ) : queue.map((item, idx) => (
                <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${idx === currentTrackIndex ? 'bg-violet-500/15 border border-violet-500/20' : idx < currentTrackIndex ? 'opacity-40' : 'hover:bg-white/5'}`}>
                  <span className={`w-6 text-center text-xs font-bold shrink-0 ${idx === currentTrackIndex ? 'text-violet-400' : 'text-muted-foreground'}`}>{idx === currentTrackIndex ? '▶' : idx + 1}</span>
                  <div className="flex-1 min-w-0"><p className={`text-sm truncate ${idx === currentTrackIndex ? 'text-violet-300 font-semibold' : 'text-foreground'}`}>{item.title}</p><p className="text-[10px] text-muted-foreground">{item.addedBy?.username}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Paste URL sub-tab */}
          {queueSubTab === 'paste' && (
            <div className="px-3 py-3">
              <div className="flex items-center gap-2">
                <Input placeholder="Paste Spotify URL..." value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()} className="h-10 text-sm rounded-full px-4 bg-white/5 border-white/10" />
                <Button onClick={handleAddToQueue} disabled={!trackUrl.trim()} size="icon" className="h-10 w-10 rounded-full shrink-0 bg-violet-600 hover:bg-violet-500"><Plus size={18} /></Button>
              </div>
              {trackUrl.trim() && <Input placeholder="Track name (optional)" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()} className="h-9 text-xs rounded-full px-4 mt-2 bg-white/5 border-white/10" />}
            </div>
          )}
        </div>
      )}


      {/* ─── LISTENERS TAB VIEW ─── */}
      {activeTab === 'listeners' && (
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {lobbyUsers.length} Listening Now
          </h3>
          <div className="space-y-2">
            {lobbyUsers.map((u) => (
              <button
                key={u.userId}
                onClick={() => navigate(`/profile/${u.userId}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {u.profilePicture ? (
                    <img src={u.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    u.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.username}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{u.mode || 'active'}</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bottom Tab Bar ─── */}
      <div className="shrink-0 flex items-center border-t border-white/5 bg-background/80 backdrop-blur-sm">
        {[
          { id: 'player', icon: Music, label: 'Player' },
          { id: 'queue', icon: ListMusic, label: 'Queue' },
          { id: 'listeners', icon: Users, label: 'Listeners' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${activeTab === tab.id
              ? 'text-violet-400'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <tab.icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Playback Guide Modal ─── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900/95 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
                <Headphones size={20} />
              </div>
              <h3 className="text-base font-bold text-foreground">Spotify Setup Guide</h3>
            </div>
            
            <div className="space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div>
                <h4 className="font-bold text-foreground flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wider text-violet-400">
                  💻 Desktop (Mac / Windows)
                </h4>
                <p>
                  Orbit plays audio directly in your browser. Just make sure your Spotify Premium account is connected and you're ready!
                </p>
              </div>

              <div className="border-t border-white/5 pt-3">
                <h4 className="font-bold text-foreground flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wider text-emerald-400">
                  📱 Mobile (iOS / Android)
                </h4>
                <p className="mb-2">
                  Spotify restricts web browser player streaming on phones. To hear the music:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
                  <li>Open the native <strong>Spotify App</strong> on your phone.</li>
                  <li>Play <strong>any song</strong> for 1 second (then pause it) to register your device as active on Spotify's servers.</li>
                  <li>Return to Orbit! The music will stream automatically in the background through your Spotify App!</li>
                </ol>
              </div>
            </div>

            <Button 
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-6 h-10 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Got it, let's play!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
