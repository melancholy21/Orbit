import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Users } from 'lucide-react';

const PresenceBar = ({ users }) => {
  if (!users || users.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Users size={18} className="mr-2 opacity-50" />
        <span className="text-sm">No one's here yet — be the first!</span>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs font-medium text-muted-foreground">{users.length} in lobby</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-1 px-1 scrollbar-hide">
        {users.map((user) => (
          <div key={user.userId} className="flex flex-col items-center gap-1 shrink-0">
            <div className="relative">
              <Avatar className={`w-12 h-12 border-2 ${
                user.mode === 'active' 
                  ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' 
                  : 'border-border/50 opacity-60'
              }`}>
                <AvatarImage src={user.profilePicture} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                  {user.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Mode indicator dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                user.mode === 'active' ? 'bg-green-500' : 'bg-muted-foreground/40'
              }`} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium max-w-[60px] truncate flex items-center gap-0.5 justify-center">
              {user.isOwner && <span>👑</span>} {user.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PresenceBar;
