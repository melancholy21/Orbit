import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import useSocket from '../hooks/useSocket';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const LobbyContext = createContext(null);

export const LobbyProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const token = user?.spotifyAccessToken;

  const [hasJoined, setHasJoined] = useState(false);
  const [mode, setMode] = useState('active'); // 'active' | 'lurker'

  // 1. Socket Connection
  const socketState = useSocket(user?.token, false);
  const { isConnected, queue, currentTrackIndex, isPlaying, trackEnded, joinLobby, isAudioSyncEnabled, currentStartedAt } = socketState;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Auto-join lobby when Spotify token and Socket connection are present
  useEffect(() => {
    if (token && isConnected) {
      joinLobby('active');
      setHasJoined(true);
    }
  }, [token, isConnected, joinLobby]);

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
        getOAuthToken: cb => { cb(token); },
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
        const isNearEnd = state.duration > 0 && state.position >= state.duration - 2000;
        const isEndedState = state.paused && (state.position === 0 || isNearEnd);
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
  }, [token]);

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
        const { data } = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
          await axios.put(
            url,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
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
                  await axios.put(
                    url,
                    { uris: [currentTrack.url] },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                } else {
                  await axios.put(
                    url,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
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

            await playWithRetry();

            lastPlayedUrl.current = currentTrack.url;
            lastIsPlaying.current = true;
          }
        } else if (!isPlaying) {
          if (lastIsPlaying.current !== false) {
            const url = deviceId 
              ? `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`
              : `https://api.spotify.com/v1/me/player/pause`;
            await axios.put(
              url,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            lastIsPlaying.current = false;
          }
        }
      } catch (err) {
        console.error('Spotify Playback Error:', err);
        const reason = err.response?.data?.error?.reason;
        const msg = err.response?.data?.error?.message;
        if (err.response?.status === 404 && reason === 'NO_ACTIVE_DEVICE') {
          toast.error('No active Spotify device found. Please open your Spotify App and play any song first!');
        } else if (msg) {
          toast.error(`Spotify Playback Error: ${msg}`);
        } else {
          toast.error(`Playback Error: ${err.message}`);
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
        
        await axios.put(url, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
    setMode
  };

  return (
    <LobbyContext.Provider value={value}>
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => useContext(LobbyContext);
