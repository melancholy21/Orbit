import React, { useState } from 'react';
import { HandMetal, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

const BucketCard = ({ item, currentUserId, onToggleImIn, onDelete }) => {
  const isImIn = item.imIn?.some(u => u._id === currentUserId);
  const isAuthor = item.author?._id === currentUserId;
  const [animating, setAnimating] = useState(false);

  const handleImIn = () => {
    setAnimating(true);
    onToggleImIn(item._id);
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground leading-snug">{item.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            by <span className="font-medium text-foreground/70">
              {item.author?.firstName || item.author?.lastName 
                ? `${item.author.firstName || ''} ${item.author.lastName || ''}`.trim() 
                : item.author?.username}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAuthor && (
            <button
              onClick={() => onDelete(item._id)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 size={16} />
            </button>
          )}
          <Button
            variant={isImIn ? 'default' : 'outline'}
            size="sm"
            onClick={handleImIn}
            className={`gap-1.5 text-sm h-9 transition-all ${animating ? 'scale-95' : ''} ${isImIn ? 'shadow-[0_0_12px_rgba(66,133,244,0.3)]' : ''}`}
          >
            <HandMetal size={16} className={isImIn ? 'animate-bounce' : ''} />
            I'm In
            <span className="bg-background/20 px-1.5 py-0.5 rounded-full text-xs font-bold">
              {item.imIn?.length || 0}
            </span>
          </Button>
        </div>
      </div>

      {/* Avatar row of people who are "in" */}
      {item.imIn && item.imIn.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {item.imIn.slice(0, 8).map((user) => (
            <Avatar key={user._id} className="w-7 h-7 border-2 border-background shadow-sm">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                {(user.firstName || user.lastName) ? (user.firstName ? user.firstName.charAt(0).toUpperCase() : user.lastName.charAt(0).toUpperCase()) : user.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {item.imIn.length > 8 && (
            <span className="text-xs text-muted-foreground font-medium ml-1">
              +{item.imIn.length - 8} more
            </span>
          )}
        </div>
      )}
    </Card>
  );
};

export default BucketCard;
