import React, { useState } from 'react';
import { Plus, ListMusic, Trash2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const QueuePanel = ({ queue, currentTrackIndex, onAddToQueue, onClearQueue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (!url.trim()) return;
    onAddToQueue(url.trim(), title.trim() || url.trim());
    setUrl('');
    setTitle('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div>
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
            placeholder="Paste YouTube URL..."
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
        <Card className="mx-3 mb-2 p-3 border-border/30 bg-card/50 max-h-[200px] overflow-y-auto">
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
                      ? 'bg-primary/10 border border-primary/20'
                      : idx < currentTrackIndex
                        ? 'opacity-40'
                        : 'hover:bg-muted/30'
                  }`}
                >
                  <span className="text-muted-foreground w-5 text-center shrink-0">
                    {idx === currentTrackIndex ? '▶' : idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.addedBy?.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default QueuePanel;
