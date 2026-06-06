import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Loader2, MessageSquare } from 'lucide-react';
import { formatFullName, getInitials } from '../lib/utils';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const [convRes, friendsRes] = await Promise.all([
          axios.get(`/api/messages/conversations`, config),
          axios.get(`/api/users/friends/status`, config)
        ]);
        setConversations(convRes.data);
        setFriends(friendsRes.data);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6 text-foreground font-bold">Messages</h1>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="w-full p-4 flex items-center gap-4 bg-card/60 border-border/40 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-12" />
                </div>
                <div className="h-3.5 bg-muted rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Messages</h1>

      {/* Online Friends List */}
      {(() => {
        const onlineFriends = friends.filter(friend => friend.isOnline);
        if (onlineFriends.length === 0) return null;
        return (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Online Now</h2>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none">
              {onlineFriends.map((friend) => (
                <div 
                  key={friend._id} 
                  onClick={() => navigate(`/messages/${friend._id}`)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-violet-500/10 group-hover:ring-violet-500/30 transition-all">
                      <AvatarImage src={friend.profilePicture} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {getInitials(friend)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors max-w-[64px] truncate">
                    {formatFullName(friend)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20 text-muted-foreground">
          <MessageSquare size={48} className="mb-4 opacity-20" />
          <p>No messages yet.</p>
          <p className="text-sm mt-2 opacity-60">Follow some friends to start chatting!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((conv) => {
            // Find the other participant
            const otherUser = conv.participants.find(p => p._id !== user._id);
            if (!otherUser) return null;

            const isUserOnline = friends.some(f => f._id === otherUser._id && f.isOnline);
            const isUnread = conv.unreadCount > 0;

            return (
              <Card 
                key={conv._id}
                onClick={() => navigate(`/messages/${otherUser._id}`)}
                className={`w-full p-4 flex items-center gap-4 cursor-pointer transition-colors border-blue-500/10 ${isUnread ? 'bg-primary/5' : 'bg-card hover:bg-muted/50'}`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={otherUser.profilePicture} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(otherUser)}
                    </AvatarFallback>
                  </Avatar>
                  {isUserOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className={`font-semibold text-foreground truncate ${isUnread ? 'font-bold text-violet-300' : ''}`}>
                        {formatFullName(otherUser)}
                      </h3>
                      {isUserOnline && (
                        <span className="text-[9px] font-extrabold text-green-500 uppercase tracking-wider bg-green-500/10 px-1.5 py-0.5 rounded shrink-0">
                          Online
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-sm truncate ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conv.lastMessage?.text || 'No messages yet'}
                    </p>
                    {isUnread && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 ml-2 shadow-sm animate-pulse">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Messages;
