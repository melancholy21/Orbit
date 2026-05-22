import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Loader2, MessageSquare } from 'lucide-react';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`/api/messages/conversations`, config);
        setConversations(res.data);
      } catch (err) {
        console.error('Failed to fetch conversations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Messages</h1>

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

            const isUnread = conv.lastMessage && 
                             conv.lastMessage.sender !== user._id && 
                             !conv.lastMessage.readBy.includes(user._id);

            return (
              <Card 
                key={conv._id}
                onClick={() => navigate(`/messages/${otherUser._id}`)}
                className={`w-full p-4 flex items-center gap-4 cursor-pointer transition-colors border-blue-500/10 ${isUnread ? 'bg-primary/5' : 'bg-card hover:bg-muted/50'}`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={otherUser.profilePicture} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {(otherUser.firstName || otherUser.lastName) ? (otherUser.firstName ? otherUser.firstName.charAt(0).toUpperCase() : otherUser.lastName.charAt(0).toUpperCase()) : otherUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-foreground truncate ${isUnread ? 'font-bold' : ''}`}>
                      {otherUser.firstName || otherUser.lastName 
                        ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() 
                        : otherUser.username}
                    </h3>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-sm truncate ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conv.lastMessage?.text || 'No messages yet'}
                    </p>
                    {isUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 ml-2" />
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
