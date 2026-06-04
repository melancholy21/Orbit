import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

/**
 * Glassmorphic dropdown displaying list of friends to mention.
 */
export default function MentionDropdown({ friends, onSelect, className = '' }) {
  if (!friends || friends.length === 0) return null;

  return (
    <div 
      className={`absolute bg-card/95 backdrop-blur-lg border border-border/60 shadow-xl rounded-xl p-1 max-h-48 overflow-y-auto z-50 w-64 min-w-[200px] flex flex-col gap-0.5 ${className}`}
    >
      <div className="px-2 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/30 mb-1">
        Mention Friends
      </div>
      {friends.map((friend) => (
        <button
          key={friend._id}
          type="button"
          onMouseDown={(e) => {
            // Prevent input blur before selection occurs
            e.preventDefault();
            onSelect(friend);
          }}
          className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-150 cursor-pointer text-left w-full font-medium"
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src={friend.profilePicture} />
            <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
              {friend.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-foreground text-xs leading-none font-semibold truncate">
              {friend.firstName || friend.lastName
                ? `${friend.firstName || ''} ${friend.lastName || ''}`.trim()
                : friend.username}
            </span>
            <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
              @{friend.username}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
