import React from 'react';
import { Volume2, VolumeX, SkipForward, SkipBack, Play, Pause, Music, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useLobby } from '../../context/LobbyContext';

const formatTime = (ms) => {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const MediaPlayer = () => {
  const {
    queue,
    currentTrackIndex,
    currentTrack,
    nextTrack,
    isPlaying,
    isReady,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    currentSpotifyTrack,
    playbackError,
    progressMs,
    durationMs,
    togglePlay,
    previousTrack,
    skipTrack
  } = useLobby();

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (!currentTrack && queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1DB954]/10 flex items-center justify-center mb-3">
          <Music size={28} className="text-[#1DB954]/70" />
        </div>
        <p className="text-sm text-muted-foreground">No music playing</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Paste a Spotify Track link to start the party</p>
        {playbackError && <p className="text-xs text-destructive mt-2">{playbackError}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Player Visualizer */}
      {currentTrack && (
        <div className="aspect-video bg-gradient-to-br from-[#1DB954]/20 to-black rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 border border-border/20 relative">
          {isMobile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('spotify://', '_blank')}
              className="absolute top-2 right-2 h-7 text-[10px] px-2.5 rounded-full bg-black/40 border-[#1DB954]/30 hover:bg-[#1DB954]/25 hover:text-[#1DB954] text-[#1DB954] font-medium"
            >
              Open Spotify App
            </Button>
          )}

          {!isReady ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-[#1DB954]" size={32} />
              <p className="text-sm text-muted-foreground font-medium">Connecting to Spotify Connect...</p>
            </div>
          ) : currentSpotifyTrack ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <img 
                src={currentSpotifyTrack.album.images[0]?.url} 
                alt="Album Art" 
                className={`w-32 h-32 shadow-2xl ${isPlaying ? 'animate-[spin_10s_linear_infinite] rounded-full' : 'rounded-lg'}`}
              />
              <div>
                <h3 className="text-lg font-bold text-foreground line-clamp-1">{currentSpotifyTrack.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {currentSpotifyTrack.artists.map(a => a.name).join(', ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <Music className="text-[#1DB954] animate-pulse" size={32} />
              <div className="mt-2">
                <h3 className="text-sm font-semibold text-foreground line-clamp-2">{currentTrack.title}</h3>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Playing via Spotify Connect</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Now Playing Bar */}
      <div className="mt-3 px-1 flex flex-col gap-2">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
            {formatTime(progressMs)}
          </span>
          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1DB954] transition-all duration-1000 ease-linear"
              style={{ width: `${durationMs ? (progressMs / durationMs) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-8 shrink-0">
            {formatTime(durationMs)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {currentTrack?.title || 'Unknown Track'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Added by {currentTrack?.addedBy?.username || '—'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-center">
            <Button variant="ghost" size="icon" onClick={previousTrack} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <SkipBack size={16} />
            </Button>
            <Button variant="outline" size="icon" onClick={togglePlay} className="h-10 w-10 rounded-full border-primary/20 hover:bg-primary/10">
              {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={skipTrack} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <SkipForward size={16} />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-1 justify-end">
            <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 text-muted-foreground hover:text-foreground">
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
              className="w-16 h-1 accent-[#1DB954]"
            />
          </div>
        </div>

        {/* Up Next */}
        {nextTrack && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/20 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Up Next</p>
              <p className="text-xs text-foreground truncate mt-0.5">{nextTrack.title}</p>
            </div>
            <p className="text-[10px] text-muted-foreground shrink-0 pl-2">by {nextTrack.addedBy?.username}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;
