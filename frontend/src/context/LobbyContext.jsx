import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateSpotifyToken } from '../features/auth/authSlice';
import useSocket from '../hooks/useSocket';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const spotifyClient = axios.create();

// Add response interceptor to handle HTTP 429 rate limits
spotifyClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // If the error is a 429 (Rate Limit) and we haven't reached the max retry limit (3)
    if (error.response?.status === 429 && (!config._retryCount || config._retryCount < 3)) {
      config._retryCount = (config._retryCount || 0) + 1;
      
      // Respect the Retry-After header if present, otherwise default to exponential backoff
      const retryAfterHeader = error.response.headers?.['retry-after'];
      let delayMs = 1000; // Default fallback to 1 second
      
      if (retryAfterHeader) {
        const parsed = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsed)) {
          // Retry-After header is in seconds, convert to milliseconds
          delayMs = parsed * 1000;
        }
      } else {
        // Exponential backoff fallback: 1s, 2s, 4s...
        delayMs = 1000 * Math.pow(2, config._retryCount);
      }
      
      console.warn(`[Spotify API] Rate Limit (429) hit. Retrying request in ${delayMs}ms (Attempt ${config._retryCount}/3)...`);
      
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Retry the request with the same config
      return spotifyClient(config);
    }
    return Promise.reject(error);
  }
);

const LobbyContext = createContext(null);

export const LobbyProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const token = user?.spotifyAccessToken;
  const dispatch = useDispatch();

  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const lastToastTime = useRef(0);
  const lastToastMessage = useRef('');

  const showThrottledToast = (message, type = 'error') => {
    const now = Date.now();
    if (now - lastToastTime.current < 4000 && lastToastMessage.current === message) {
      return;
    }
    lastToastTime.current = now;
    lastToastMessage.current = message;
    if (type === 'error') {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

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

  const spotifyRequest = async (method, url, data = null, headers = {}) => {
    try {
      const activeToken = user?.spotifyAccessToken;
      if (!activeToken) throw new Error('No Spotify token available');
      
      const config = {
        method,
        url,
        data,
        headers: {
          ...headers,
          Authorization: `Bearer ${activeToken}`
        }
      };
      return await spotifyClient(config);
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('Spotify token expired in LobbyContext. Refreshing...');
        const newToken = await handleRefreshSpotifyToken();
        if (newToken) {
          const config = {
            method,
            url,
            data,
            headers: {
              ...headers,
              Authorization: `Bearer ${newToken}`
            }
          };
          return await spotifyClient(config);
        }
      }
      throw err;
    }
  };

  const [hasJoined, setHasJoined] = useState(false);
  const [mode, setMode] = useState('active'); // 'active' | 'lurker'
  const [activeRoom, setActiveRoom] = useState(null);

  // 1. Socket Connection
  const socketState = useSocket(user?.token, false);
  const { isConnected, queue, currentTrackIndex, isPlaying, trackEnded, joinRoom, leaveRoom, isAudioSyncEnabled, currentStartedAt, socket } = socketState;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Fetch active room from database on load
  useEffect(() => {
    const fetchActiveRoom = async () => {
      if (!user?.token) return;
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get('/api/rooms/active', config);
        if (data) {
          setActiveRoom(data);
        }
      } catch (err) {
        console.error('Failed to fetch active room', err);
      }
    };
    fetchActiveRoom();
  }, [user?.token]);

  // Connect socket when active room is known and socket connected
  useEffect(() => {
    if (activeRoom && isConnected && !hasJoined) {
      joinRoom(activeRoom._id);
      setHasJoined(true);
    }
  }, [activeRoom, isConnected, hasJoined, joinRoom]);

  const createCustomRoom = async (name, isPrivate, password) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post('/api/rooms', { name, isPrivate, password }, config);
      setActiveRoom(data);
      if (socket) {
        joinRoom(data._id);
        setHasJoined(true);
      }
      toast.success(`Room "${name}" created!`);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
      throw err;
    }
  };

  const joinCustomRoom = async (roomId, password) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.post(`/api/rooms/${roomId}/join`, { password }, config);
      setActiveRoom(data);
      if (socket) {
        joinRoom(data._id);
        setHasJoined(true);
      }
      toast.success(`Joined room "${data.name}"!`);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join room');
      throw err;
    }
  };

  const leaveCustomRoom = async () => {
    if (!activeRoom) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`/api/rooms/${activeRoom._id}/leave`, {}, config);
    } catch (err) {
      console.warn('Backend room cleanup warning:', err.response?.data?.message || err.message);
    } finally {
      if (socket) {
        leaveRoom();
      }
      setActiveRoom(null);
      setHasJoined(false);
      toast.success('Left room');
    }
  };

  // Listen for lobby invitations in real time
  useEffect(() => {
    if (!socket) return;

    const handleLobbyInvite = ({ sender, roomId, roomName }) => {
      toast((t) => (
        <div className="flex flex-col gap-2 p-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{sender.username}</span>
            <span className="text-xs text-muted-foreground">invited you to join their lobby</span>
          </div>
          <p className="text-xs font-semibold text-primary">"{roomName}"</p>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 text-xs font-semibold rounded hover:bg-muted transition-colors text-muted-foreground border border-border"
            >
              Decline
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  if (activeRoom) {
                    await leaveCustomRoom();
                  }
                  await joinCustomRoom(roomId);
                  window.location.href = `/lobby?roomId=${roomId}`;
                } catch (err) {
                  window.location.href = `/lobby?roomId=${roomId}`;
                }
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Accept
            </button>
          </div>
        </div>
      ), {
        duration: 10000,
        position: 'top-right',
      });
    };

    socket.on('lobbyInvite', handleLobbyInvite);
    return () => socket.off('lobbyInvite', handleLobbyInvite);
  }, [socket, activeRoom]);

  // 2. Spotify Player State
  const [player, setPlayer] = useState(null);
  const playerRef = useRef(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSpotifyTrack, setCurrentSpotifyTrack] = useState(null);
  const [playbackError, setPlaybackError] = useState(null);
  const [progressMs, setProgressMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const currentTrack = currentTrackIndex >= 0 && currentTrackIndex < queue.length
    ? queue[currentTrackIndex]
    : null;

  const nextTrack = currentTrackIndex + 1 < queue.length
    ? queue[currentTrackIndex + 1]
    : null;

  const hasTriggeredEnd = useRef(false);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!token) {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayer(null);
      }
      return;
    }

    if (isMobile) {
      setIsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'Orbit Lobby',
        getOAuthToken: async cb => {
          let currentToken = tokenRef.current;
          if (!currentToken) {
            cb('');
            return;
          }
          try {
            // Check if token is valid by making a quick request to Spotify
            await axios.get('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${currentToken}` }
            });
            cb(currentToken);
          } catch (err) {
            if (err.response?.status === 401) {
              console.log('Spotify token expired in getOAuthToken. Refreshing...');
              const newToken = await handleRefreshSpotifyToken();
              if (newToken) {
                cb(newToken);
                return;
              }
            }
            cb(currentToken);
          }
        },
        volume: volume
      });

      playerRef.current = spotifyPlayer;
      setPlayer(spotifyPlayer);

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsReady(true);
        setPlaybackError(null);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      spotifyPlayer.addListener('initialization_error', ({ message }) => { setPlaybackError(message); });
      spotifyPlayer.addListener('authentication_error', ({ message }) => { setPlaybackError(message); });
      spotifyPlayer.addListener('account_error', ({ message }) => { setPlaybackError('Spotify Premium is required.'); });

      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;
        setCurrentSpotifyTrack(state.track_window.current_track);
        setProgressMs(state.position);
        setDurationMs(state.duration);

        // Robust track end detection:
        // Trigger automatically when the track is paused at the end (within 2 seconds of duration)
        // We exclude position === 0 to avoid infinite skip loops on playback failures
        const isNearEnd = state.duration > 0 && state.position >= state.duration - 2000;
        const isEndedState = state.paused && isNearEnd && state.position > 0;
        if (isEndedState) {
          if (!hasTriggeredEnd.current) {
            hasTriggeredEnd.current = true;
            console.log('Automatic end detected via state change. Advancing...');
            trackEnded();
          }
        }
      });

      spotifyPlayer.connect();
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayer(null);
      }
      try {
        document.body.removeChild(script);
      } catch (e) {
        // script might already be removed
      }
    };
  }, [!!token]);

  // Fetch track metadata on mobile
  useEffect(() => {
    if (!isMobile || !token || !currentTrack?.url) return;

    let trackId = '';
    if (currentTrack.url.includes('spotify:track:')) {
      trackId = currentTrack.url.split('spotify:track:')[1];
    } else if (currentTrack.url.includes('open.spotify.com/track/')) {
      trackId = currentTrack.url.split('track/')[1].split('?')[0];
    }

    if (!trackId) return;

    const fetchTrackDetails = async () => {
      try {
        const { data } = await spotifyRequest('get', `https://api.spotify.com/v1/tracks/${trackId}`);
        setCurrentSpotifyTrack({
          name: data.name,
          artists: data.artists,
          album: {
            images: data.album.images
          }
        });
        setDurationMs(data.duration_ms);
        
        // Align progress with current started time
        if (currentStartedAt) {
          const elapsed = Date.now() - new Date(currentStartedAt).getTime();
          setProgressMs(Math.max(0, Math.min(data.duration_ms, elapsed)));
        }
      } catch (err) {
        console.error('Failed to fetch track details on mobile:', err);
        setDurationMs(180000); // 3 mins default
        setCurrentSpotifyTrack(null);
      }
    };

    fetchTrackDetails();
  }, [isMobile, token, currentTrack?.url, currentStartedAt]);

  // Handle Progress Bar Interval and Track End Fallback
  useEffect(() => {
    // Reset end trigger and progress states when track changes
    hasTriggeredEnd.current = false;
    setProgressMs(0);
    setDurationMs(0);
    if (!currentTrack) {
      setCurrentSpotifyTrack(null);
    }
  }, [currentTrack?.url]);

  useEffect(() => {
    let interval;
    if (isPlaying && isReady && durationMs > 0) {
      interval = setInterval(() => {
        setProgressMs(prev => {
          const next = prev + 1000;
          if (next >= durationMs - 1500) {
            if (!hasTriggeredEnd.current) {
              hasTriggeredEnd.current = true;
              console.log('Automatic end detected via progress interval. Advancing...');
              trackEnded();
            }
            clearInterval(interval);
            return durationMs;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isReady, durationMs, currentTrack?.url]);

  // Handle Playback Synchronization with Backend
  const lastPlayedUrl = useRef(null);
  const lastIsPlaying = useRef(false);

  useEffect(() => {
    if (!isReady || (!isMobile && !deviceId) || !token) return;

    if (!isAudioSyncEnabled) {
      // Pause local Spotify playback when sync is disabled
      const pausePlayback = async () => {
        try {
          const url = deviceId 
            ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
            : `https://api.spotify.com/v1/me/player/pause`;
          await spotifyRequest('put', url, {});
        } catch (err) {
          // Squelch background pause errors
        }
      };
      pausePlayback();
      lastIsPlaying.current = false;
      return;
    }

    const syncPlayback = async () => {
      try {
        if (currentTrack && isPlaying) {
          // If the track changed OR we are transitioning from pause to play
          if (lastPlayedUrl.current !== currentTrack.url || lastIsPlaying.current !== isPlaying) {
            const isDifferentTrack = lastPlayedUrl.current !== currentTrack.url;

            // If it's a different track, wait 800ms before requesting play to allow SDK to settle
            if (isDifferentTrack && lastPlayedUrl.current) {
              await new Promise(resolve => setTimeout(resolve, 800));
            }

            const playWithRetry = async (retries = 2) => {
              try {
                const url = deviceId 
                  ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
                  : `https://api.spotify.com/v1/me/player/play`;

                if (isDifferentTrack) {
                  await spotifyRequest('put', url, { uris: [currentTrack.url] });
                } else {
                  await spotifyRequest('put', url, {});
                }
              } catch (err) {
                if (retries > 0) {
                  console.warn('Spotify play request failed, retrying in 1s...', err.message);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  await playWithRetry(retries - 1);
                } else {
                  throw err;
                }
              }
            };

            try {
              await playWithRetry();
            } catch (playErr) {
              lastPlayedUrl.current = currentTrack.url;
              throw playErr;
            }

            lastPlayedUrl.current = currentTrack.url;
            lastIsPlaying.current = true;
          }
        } else if (!isPlaying) {
          if (lastIsPlaying.current !== false) {
            const url = deviceId 
              ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
              : `https://api.spotify.com/v1/me/player/pause`;
            await spotifyRequest('put', url, {});
            lastIsPlaying.current = false;
          }
        }
      } catch (err) {
        console.error('Spotify Playback Error:', err);
        const reason = err.response?.data?.error?.reason;
        const msg = err.response?.data?.error?.message;
        if (err.response?.status === 404 && reason === 'NO_ACTIVE_DEVICE') {
          showThrottledToast('No active Spotify device found. Please open your Spotify App and play any song first!');
        } else if (msg) {
          showThrottledToast(`Spotify Playback Error: ${msg}`);
        } else {
          showThrottledToast(`Playback Error: ${err.message}`);
        }
      }
    };

    syncPlayback();
  }, [currentTrack?.url, isPlaying, isReady, deviceId, token, isMobile]);

  // Handle Volume Synchronization
  useEffect(() => {
    // 1. Update local browser SDK player immediately if active
    if (player) {
      player.setVolume(isMuted ? 0 : volume);
    }

    // 2. Sync to Spotify's servers to adjust whatever Connect device is playing (mobile/desktop app)
    if (!token) return;

    const targetVolume = Math.round((isMuted ? 0 : volume) * 100);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const url = `https://api.spotify.com/v1/me/player/volume?volume_percent=${targetVolume}`;
        await spotifyRequest('put', url, {});
      } catch (err) {
        console.warn('Failed to sync Spotify volume:', err.message);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [volume, isMuted, player, token, deviceId]);

  const value = {
    ...socketState,
    currentTrack,
    nextTrack,
    player,
    isReady,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    currentSpotifyTrack,
    playbackError,
    progressMs,
    durationMs,
    hasJoined,
    setHasJoined,
    mode,
    setMode,
    activeRoom,
    createCustomRoom,
    joinCustomRoom,
    leaveCustomRoom
  };

  return (
    <LobbyContext.Provider value={value}>
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => useContext(LobbyContext);
