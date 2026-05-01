import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const useSocket = (token, autoJoin = false) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [currentStartedAt, setCurrentStartedAt] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sleepWarning, setSleepWarning] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (autoJoin) {
        socket.emit('joinLobby', { mode: 'active' });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('lobbyState', (state) => {
      setLobbyUsers(state.users || []);
      setQueue(state.queue || []);
      setCurrentTrackIndex(state.currentTrackIndex ?? -1);
      setCurrentStartedAt(state.currentStartedAt);
      setIsPlaying(state.isPlaying ?? false);
    });

    socket.on('presenceUpdate', (users) => {
      setLobbyUsers(users || []);
    });

    socket.on('chatHistory', (history) => {
      setMessages(history || []);
    });

    socket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('queueUpdate', (data) => {
      setQueue(data.queue || []);
      setCurrentTrackIndex(data.currentTrackIndex ?? -1);
      setCurrentStartedAt(data.currentStartedAt);
      setIsPlaying(data.isPlaying ?? false);
    });

    socket.on('syncResponse', (data) => {
      setQueue(data.queue || []);
      setCurrentTrackIndex(data.currentTrackIndex ?? -1);
      setCurrentStartedAt(data.currentStartedAt);
      setIsPlaying(data.isPlaying ?? false);
    });

    socket.on('sleepTimeout', () => {
      setSleepWarning(true);
    });

    return () => {
      socket.emit('leaveLobby');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, autoJoin]);

  const joinLobby = useCallback((mode = 'active') => {
    socketRef.current?.emit('joinLobby', { mode });
  }, []);

  const leaveLobby = useCallback(() => {
    socketRef.current?.emit('leaveLobby');
  }, []);

  const updateMode = useCallback((mode) => {
    socketRef.current?.emit('updateMode', { mode });
  }, []);

  const sendMessage = useCallback((text) => {
    socketRef.current?.emit('sendMessage', { text });
  }, []);

  const addToQueue = useCallback((url, title) => {
    socketRef.current?.emit('addToQueue', { url, title });
  }, []);

  const skipTrack = useCallback(() => {
    socketRef.current?.emit('skipTrack');
  }, []);

  const trackEnded = useCallback(() => {
    socketRef.current?.emit('trackEnded');
  }, []);

  const requestSync = useCallback(() => {
    socketRef.current?.emit('requestSync');
  }, []);

  const clearQueue = useCallback(() => {
    socketRef.current?.emit('clearQueue');
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    lobbyUsers,
    messages,
    queue,
    currentTrackIndex,
    currentStartedAt,
    isPlaying,
    sleepWarning,
    setSleepWarning,
    joinLobby,
    leaveLobby,
    updateMode,
    sendMessage,
    addToQueue,
    skipTrack,
    trackEnded,
    requestSync,
    clearQueue
  };
};

export default useSocket;
