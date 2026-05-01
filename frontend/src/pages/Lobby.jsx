import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Radio, Eye, Zap, Moon, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import useSocket from '../hooks/useSocket';
import PresenceBar from '../components/lobby/PresenceBar';
import LobbyChat from '../components/lobby/LobbyChat';
import MediaPlayer from '../components/lobby/MediaPlayer';
import QueuePanel from '../components/lobby/QueuePanel';

const Lobby = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [hasJoined, setHasJoined] = useState(false);
  const [mode, setMode] = useState('active'); // 'active' | 'lurker'

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
    skipTrack,
    trackEnded,
    clearQueue
  } = useSocket(user?.token, false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const handleJoin = () => {
    joinLobby(mode);
    setHasJoined(true);
  };

  const handleLeave = () => {
    leaveLobby();
    setHasJoined(false);
  };

  const handleModeToggle = () => {
    const newMode = mode === 'active' ? 'lurker' : 'active';
    setMode(newMode);
    if (hasJoined) updateMode(newMode);
  };

  const handleRejoin = () => {
    setSleepWarning(false);
    joinLobby(mode);
    setHasJoined(true);
  };

  // Sleep timeout screen
  if (sleepWarning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Moon size={32} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">You fell asleep! 😴</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[280px]">
          You were disconnected after 30 minutes of inactivity to save battery.
        </p>
        <Button onClick={handleRejoin} className="gap-2 h-12 px-6 text-base">
          <Radio size={18} /> Rejoin Lobby
        </Button>
      </div>
    );
  }

  // Pre-join screen
  if (!hasJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
            <Radio size={40} className="text-primary" />
          </div>
          {lobbyUsers.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
              {lobbyUsers.length} live
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">The Lobby</h1>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            A chill room to hang with friends. Listen to music, chat, and vibe together.
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-3 w-full max-w-[280px]">
          <button
            onClick={() => setMode('active')}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              mode === 'active'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border/50 hover:border-primary/30'
            }`}
          >
            <Zap size={22} className={mode === 'active' ? 'text-primary' : 'text-muted-foreground'} />
            <span className={`text-sm font-semibold ${mode === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>Active</span>
            <span className="text-[10px] text-muted-foreground">Visible to all</span>
          </button>
          <button
            onClick={() => setMode('lurker')}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              mode === 'lurker'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border/50 hover:border-primary/30'
            }`}
          >
            <Eye size={22} className={mode === 'lurker' ? 'text-primary' : 'text-muted-foreground'} />
            <span className={`text-sm font-semibold ${mode === 'lurker' ? 'text-primary' : 'text-muted-foreground'}`}>Lurker</span>
            <span className="text-[10px] text-muted-foreground">Text only</span>
          </button>
        </div>

        <Button onClick={handleJoin} disabled={!isConnected} className="gap-2 h-12 px-8 text-base w-full max-w-[280px]">
          <Radio size={18} />
          {isConnected ? 'Join Lobby' : 'Connecting...'}
        </Button>

        {!isConnected && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle size={12} /> Connecting to server...
          </p>
        )}
      </div>
    );
  }

  // In-lobby view — Mobile-first layout
  return (
    <div className="flex flex-col w-full -mt-2" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <h1 className="text-lg font-bold text-foreground">Lobby</h1>
          <span className="text-xs text-muted-foreground">{lobbyUsers.length} online</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleModeToggle}
            className="gap-1.5 text-xs h-8"
          >
            {mode === 'active' ? <Zap size={14} className="text-green-500" /> : <Eye size={14} />}
            {mode === 'active' ? 'Active' : 'Lurker'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            Leave
          </Button>
        </div>
      </div>

      {/* Top ~30%: Media Player */}
      <div className="shrink-0 px-1">
        <MediaPlayer
          queue={queue}
          currentTrackIndex={currentTrackIndex}
          isPlaying={isPlaying}
          onTrackEnded={trackEnded}
          onSkip={skipTrack}
        />
      </div>

      {/* Queue controls */}
      <div className="shrink-0">
        <QueuePanel
          queue={queue}
          currentTrackIndex={currentTrackIndex}
          onAddToQueue={addToQueue}
          onClearQueue={clearQueue}
        />
      </div>

      <Separator />

      {/* Middle ~20%: Presence */}
      <div className="shrink-0 px-3">
        <PresenceBar users={lobbyUsers} />
      </div>

      <Separator />

      {/* Bottom ~50%: Chat */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <LobbyChat
          messages={messages}
          onSendMessage={sendMessage}
          currentUserId={user?._id}
        />
      </div>
    </div>
  );
};

export default Lobby;
