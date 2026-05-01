import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Plus, X, HandMetal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import StatusDrawer from './StatusDrawer';
import userService from '../features/users/userService';
import toast from 'react-hot-toast';

const StatusBar = () => {
  const { user } = useSelector((state) => state.auth);
  const [friends, setFriends] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentUserStatus, setCurrentUserStatus] = useState(user?.status || null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);

  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [friends, currentUserStatus]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  const fetchFriends = async () => {
    try {
      const data = await userService.getFriendsWithStatus(user.token);
      setFriends(data);
    } catch (error) {
      console.error('Failed to fetch friends', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriends();
      // Try to fetch current user's full profile to get latest status if not in auth slice
      // But for now, we rely on the returned user object from auth
    }
  }, [user]);

  const clearMyStatus = async (e) => {
    e.stopPropagation();
    try {
      const emptyStatus = {
        isFree: false,
        emoji: '',
        text: '',
        expiresAt: null
      };
      await userService.updateStatus(emptyStatus, user.token);
      setCurrentUserStatus(emptyStatus);
      toast.success('Status cleared');
    } catch (error) {
      toast.error('Failed to clear status');
    }
  };

  const handleNudge = async (friendId) => {
    try {
      await userService.nudgeUser(friendId, user.token);
      toast.success('Nudge sent!');
      setSelectedFriend(null);
    } catch (error) {
      toast.error('Failed to send nudge');
    }
  };

  const isStatusActive = (status) => {
    if (!status || !status.expiresAt) return false;
    return new Date() < new Date(status.expiresAt);
  };

  const getTimeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return '';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `for ${hours}h ${minutes}m more`;
    return `for ${minutes}m more`;
  };

  return (
    <>
      <div className="relative w-full">
        {showLeftArrow && (
          <button 
            onClick={() => scroll('left')}
            className="absolute left-1 top-8 z-10 bg-background/90 backdrop-blur border border-border rounded-full p-1.5 shadow-md text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {showRightArrow && (
          <button 
            onClick={() => scroll('right')}
            className="absolute right-1 top-8 z-10 bg-background/90 backdrop-blur border border-border rounded-full p-1.5 shadow-md text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <div 
          ref={scrollRef} 
          onScroll={checkScroll}
          className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar"
        >
          <div className="flex gap-4 px-4 min-w-max">
          
          {/* Current User Bubble */}
          <div className="flex flex-col items-center gap-1">
            <div 
              onClick={() => setIsDrawerOpen(true)}
              className="relative cursor-pointer group"
            >
              <Avatar className={`w-16 h-16 border-2 transition-all ${isStatusActive(currentUserStatus) && currentUserStatus?.isFree ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-transparent'}`}>
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {isStatusActive(currentUserStatus) && currentUserStatus?.emoji ? (
                <div className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-sm">
                  {currentUserStatus.emoji}
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                  <Plus size={14} />
                </div>
              )}

              {/* Clear overlay on hover if status active */}
              {isStatusActive(currentUserStatus) && (
                <button 
                  onClick={clearMyStatus}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={20} className="text-white" />
                </button>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate w-16 text-center">
              You
            </span>
          </div>

          {/* Friends Bubbles */}
          {friends.map((friend) => {
            const active = isStatusActive(friend.status);
            if (active) {
              const isFree = friend.status?.isFree;
              const hasEmoji = !!friend.status?.emoji;

              return (
                <div key={friend._id} className="flex flex-col items-center gap-1 relative">
                  <div 
                    onClick={(e) => {
                      if (selectedFriend === friend._id) {
                        setSelectedFriend(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPopoverPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
                        setSelectedFriend(friend._id);
                      }
                    }}
                    className="relative cursor-pointer"
                  >
                    <Avatar className={`w-16 h-16 border-2 transition-all ${isFree ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-transparent'}`}>
                      <AvatarImage src={friend.profilePicture} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                        {friend.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {hasEmoji && (
                      <div className="absolute -top-1 -right-1 bg-background border border-border rounded-full px-1.5 py-0.5 text-xs shadow-sm flex items-center transform rotate-12 origin-bottom-left">
                        {friend.status.emoji}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground truncate w-16 text-center">
                    {friend.username}
                  </span>

                  {/* We render the popover globally outside the map later to avoid clipping */}
                </div>
              );
            }
            return null; // Don't render if expired
          })}

        </div>
        </div>
      </div>

      {/* Global Fixed Popover Overlay to catch outside clicks */}
      {selectedFriend && popoverPos && (
        <div className="fixed inset-0 z-50" onClick={() => setSelectedFriend(null)}>
          {friends.map(friend => {
            if (friend._id === selectedFriend) {
              const isFree = friend.status?.isFree;
              return (
                <div 
                  key={`popover-${friend._id}`}
                  className="fixed bg-popover text-popover-foreground border border-border p-3 rounded-xl shadow-2xl w-56 animate-in fade-in zoom-in-95 duration-200"
                  style={{ top: popoverPos.top, left: popoverPos.left, transform: 'translateX(-50%)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">{friend.username}</span>
                    <button onClick={() => setSelectedFriend(null)} className="text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-sm mb-1 font-medium">
                    {friend.status.emoji} {friend.status.text}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Active {getTimeRemaining(friend.status.expiresAt)}
                  </p>
                  
                  {isFree && (
                    <button 
                      onClick={() => handleNudge(friend._id)}
                      className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <HandMetal size={14} /> Nudge
                    </button>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      <StatusDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        currentStatus={currentUserStatus}
        onStatusUpdate={(newStatus) => {
          setCurrentUserStatus(newStatus);
          fetchFriends(); // refresh friends just in case
        }}
      />
    </>
  );
};

export default StatusBar;
