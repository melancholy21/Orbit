import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

const LobbyChat = ({ messages, onSendMessage, currentUserId }) => {
  const [text, setText] = useState('');
  const [isIdle, setIsIdle] = useState(false);
  const chatEndRef = useRef(null);
  const idleTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-hide chat after 10s of no interaction
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 10000);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
    resetIdleTimer();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div
      className="flex flex-col h-full"
      onTouchStart={resetIdleTimer}
      onMouseMove={resetIdleTimer}
      onClick={resetIdleTimer}
    >
      {/* Messages */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto px-3 py-2 space-y-3 transition-opacity duration-500 scrollbar-hide ${
          isIdle ? 'opacity-30' : 'opacity-100'
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground/50">No messages yet — say something!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.sender?._id === currentUserId;
            return (
              <div
                key={msg._id || i}
                className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {!isOwn && (
                  <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                    <AvatarImage src={msg.sender?.profilePicture} />
                    <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                      {msg.sender?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5 px-1">
                      {msg.sender?.username}
                    </p>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted/80 text-foreground rounded-bl-md'
                  }`}>
                    {msg.text}
                  </div>
                  <p className={`text-[9px] text-muted-foreground/50 mt-0.5 px-1 ${isOwn ? 'text-right' : ''}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => { setText(e.target.value); resetIdleTimer(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="h-11 text-sm flex-1 rounded-full px-4"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim()}
            size="icon"
            className="h-11 w-11 rounded-full shrink-0"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LobbyChat;
