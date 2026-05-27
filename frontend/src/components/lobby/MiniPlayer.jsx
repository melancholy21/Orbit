import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Music, SkipForward } from 'lucide-react';
import { useLobby } from '../../context/LobbyContext';

const getSpotifyTrackUrl = (spotifyTrack, queueTrack) => {
  if (spotifyTrack?.id) {
    return `https://open.spotify.com/track/${spotifyTrack.id}`;
  }
  if (spotifyTrack?.uri) {
    const parts = spotifyTrack.uri.split(':');
    if (parts[1] === 'track' && parts[2]) {
      return `https://open.spotify.com/track/${parts[2]}`;
    }
  }
  if (queueTrack?.url) {
    if (queueTrack.url.includes('open.spotify.com/track/')) {
      return queueTrack.url;
    }
    if (queueTrack.url.startsWith('spotify:track:')) {
      return `https://open.spotify.com/track/${queueTrack.url.split('spotify:track:')[1]}`;
    }
  }
  return null;
};

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
            {getSpotifyTrackUrl(currentSpotifyTrack, currentTrack) ? (
              <a
                href={getSpotifyTrackUrl(currentSpotifyTrack, currentTrack)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:underline hover:text-[#1DB954] transition-colors flex items-center gap-1 text-sm font-semibold text-foreground truncate"
              >
                {currentSpotifyTrack?.name || currentTrack.title}
                <svg className="w-3.5 h-3.5 fill-current text-[#1DB954] inline-block shrink-0" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
              </a>
            ) : (
              <p className="text-sm font-semibold text-foreground truncate">
                {currentSpotifyTrack?.name || currentTrack.title}
              </p>
            )}
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
