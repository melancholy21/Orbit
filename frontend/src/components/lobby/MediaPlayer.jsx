import React, { useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Volume2, VolumeX, SkipForward, Music2 } from 'lucide-react';
import { Button } from '../ui/button';

const MediaPlayer = ({ queue, currentTrackIndex, isPlaying, onTrackEnded, onSkip }) => {
  const playerRef = useRef(null);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  const currentTrack = currentTrackIndex >= 0 && currentTrackIndex < queue.length
    ? queue[currentTrackIndex]
    : null;

  const nextTrack = currentTrackIndex + 1 < queue.length
    ? queue[currentTrackIndex + 1]
    : null;

  if (!currentTrack && queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Music2 size={28} className="text-primary/40" />
        </div>
        <p className="text-sm text-muted-foreground">No music playing</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Add a YouTube link to start the party</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Video Player */}
      {currentTrack && (
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <ReactPlayer
            ref={playerRef}
            url={currentTrack.url}
            playing={isPlaying}
            volume={isMuted ? 0 : volume}
            width="100%"
            height="100%"
            onEnded={onTrackEnded}
            config={{
              youtube: {
                playerVars: { modestbranding: 1, rel: 0 }
              }
            }}
          />
        </div>
      )}

      {/* Now Playing Bar */}
      <div className="mt-2 px-1">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {currentTrack?.title || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground">
              Added by {currentTrack?.addedBy?.username || '—'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Volume */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
              className="w-16 h-1 accent-primary"
            />
            {/* Skip */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              className="h-9 w-9"
            >
              <SkipForward size={18} />
            </Button>
          </div>
        </div>

        {/* Up Next */}
        {nextTrack && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/20">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Up Next</p>
            <p className="text-xs text-foreground truncate mt-0.5">{nextTrack.title}</p>
            <p className="text-[10px] text-muted-foreground">by {nextTrack.addedBy?.username}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPlayer;
