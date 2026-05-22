import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Music, SkipForward } from 'lucide-react';
import { useLobby } from '../../context/LobbyContext';

const MiniPlayer = () => {
  const navigate = useNavigate();
  const { 
    currentTrack, 
    currentSpotifyTrack, 
    isPlaying, 
    togglePlay, 
    skipTrack,
    progressMs, 
    durationMs,
    isConnected,
    hasJoined
  } = useLobby();

  // Show mini player if joined, has a track, and the track has not ended and stopped
  const isFinished = progressMs > 0 && durationMs > 0 && progressMs >= durationMs - 1500;
  const shouldHide = !isConnected || !hasJoined || !currentTrack || (isFinished && !isPlaying);

  if (shouldHide) return null;

  const handleTogglePlay = (e) => {
    e.stopPropagation();
    togglePlay();
  };

  const handleSkip = (e) => {
    e.stopPropagation();
    skipTrack();
  };

  const progressPercent = durationMs ? (progressMs / durationMs) * 100 : 0;
  const albumArt = currentSpotifyTrack?.album?.images?.[0]?.url;

  return (
    <div 
      onClick={() => navigate('/lobby')}
      className="fixed bottom-[4rem] left-0 right-0 h-16 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_30px_rgba(0,0,0,0.15)] z-40 flex flex-col overflow-hidden cursor-pointer group"
    >
      {/* Progress bar */}
      <div className="h-[3px] w-full bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-between px-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {albumArt ? (
            <img 
              src={albumArt} 
              alt="Album Art" 
              className={`w-10 h-10 object-cover shadow-md ${isPlaying ? 'animate-[spin_8s_linear_infinite] rounded-full' : 'rounded-lg'}`}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-emerald-500/20 flex items-center justify-center">
              <Music size={18} className="text-violet-400" />
            </div>
          )}
          <div className="min-w-0 pr-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {currentSpotifyTrack?.name || currentTrack.title}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {currentSpotifyTrack?.artists?.map(a => a.name).join(', ') || `Added by ${currentTrack.addedBy?.username}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={handleTogglePlay}
            className="w-9 h-9 flex items-center justify-center shrink-0 text-foreground hover:bg-white/10 rounded-full transition-colors"
          >
            {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
          </button>
          <button
            onClick={handleSkip}
            className="w-9 h-9 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full transition-colors"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
