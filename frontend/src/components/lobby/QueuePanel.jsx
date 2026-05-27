import React, { useState } from 'react';
import { Plus, ListMusic, Trash2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const getSpotifyUrl = (url) => {
  if (!url) return null;
  if (url.includes('open.spotify.com/track/')) {
    return url;
  }
  if (url.startsWith('spotify:track:')) {
    return `https://open.spotify.com/track/${url.split('spotify:track:')[1]}`;
  }
  return null;
};

const QueuePanel = ({ queue, currentTrackIndex, onAddToQueue, onClearQueue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (!url.trim()) return;
    
    let finalUrl = url.trim();
    if (finalUrl.includes('open.spotify.com/track/')) {
      const trackId = finalUrl.split('track/')[1].split('?')[0];
      finalUrl = `spotify:track:${trackId}`;
    }

    onAddToQueue(finalUrl, title.trim() || 'Spotify Track');
    setUrl('');
    setTitle('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="relative">
      {/* Toggle + Add Input */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-1.5 text-sm h-10 shrink-0"
        >
          <ListMusic size={16} />
          Queue {queue.length > 0 && `(${queue.length})`}
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Input
            placeholder="Paste Spotify Track URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-10 text-sm flex-1 rounded-full px-4"
          />
          <Button
            onClick={handleAdd}
            disabled={!url.trim()}
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
          >
            <Plus size={18} />
          </Button>
        </div>
      </div>

      {/* Title input (optional) */}
      {url.trim() && (
        <div className="px-3 pb-2">
          <Input
            placeholder="Track name (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 text-xs rounded-full px-4"
          />
        </div>
      )}

      {/* Queue List */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full z-50 px-3 pb-4">
          <Card className="p-3 border-border/30 bg-background/95 backdrop-blur-md max-h-[250px] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Queue</h4>
              <div className="flex items-center gap-1">
                {queue.length > 0 && (
                  <button
                    onClick={onClearQueue}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground p-0.5">
                  <X size={14} />
                </button>
              </div>
            </div>
            {queue.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Queue is empty</p>
            ) : (
              <div className="space-y-1.5">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                      idx === currentTrackIndex
                        ? 'bg-[#1DB954]/10 border border-[#1DB954]/20'
                        : idx < currentTrackIndex
                          ? 'opacity-40'
                          : 'hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-muted-foreground w-5 text-center shrink-0">
                      {idx === currentTrackIndex ? '▶' : idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      {getSpotifyUrl(item.url) ? (
                        <a
                          href={getSpotifyUrl(item.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-foreground hover:underline hover:text-[#1DB954] flex items-center gap-1.5"
                        >
                          {item.title}
                          <svg className="w-3 h-3 fill-current text-[#1DB954] inline-block shrink-0" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                        </a>
                      ) : (
                        <p className="truncate text-foreground">{item.title}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{item.addedBy?.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default QueuePanel;
