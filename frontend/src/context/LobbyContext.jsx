import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import useSocket from '../hooks/useSocket';
import axios from 'axios';

const LobbyContext = createContext(null);

export const LobbyProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const token = user?.spotifyAccessToken;

  const [hasJoined, setHasJoined] = useState(false);
  const [mode, setMode] = useState('active'); // 'active' | 'lurker'

  // 1. Socket Connection
  const socketState = useSocket(user?.token, false);
  const { isConnected, queue, currentTrackIndex, isPlaying, trackEnded, joinLobby, isAudioSyncEnabled } = socketState;

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
    if (!isReady || !deviceId || !token) return;

    if (!isAudioSyncEnabled) {
      // Pause local Spotify playback when sync is disabled
      const pausePlayback = async () => {
        try {
          await axios.put(
            `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`,
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
                if (isDifferentTrack) {
                  await axios.put(
                    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
                    { uris: [currentTrack.url] },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                } else {
                  await axios.put(
                    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
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
            await axios.put(
              `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            lastIsPlaying.current = false;
          }
        }
      } catch (err) {
        console.error('Spotify Playback Error:', err);
      }
    };

    syncPlayback();
  }, [currentTrack?.url, isPlaying, isReady, deviceId, token]);

  // Handle Volume Synchronization
  useEffect(() => {
    if (player) {
      player.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted, player]);

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
