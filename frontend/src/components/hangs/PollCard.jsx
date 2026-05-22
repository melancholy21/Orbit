import React, { useState, useEffect } from 'react';
import { Trophy, Trash2, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';

const PollCard = ({ poll, currentUserId, onVote, onDelete }) => {
  const isAuthor = poll.author?._id === currentUserId;
  const isExpired = poll.isExpired || new Date() >= new Date(poll.expiresAt);
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  const [timeLeft, setTimeLeft] = useState('');

  // Find which option the current user voted for
  const userVoteIndex = poll.options.findIndex(opt =>
    opt.votes?.some(v => (v._id || v) === currentUserId)
  );

  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(poll.expiresAt) - new Date();
      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }
      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hrs > 0) setTimeLeft(`${hrs}h ${mins}m left`);
      else setTimeLeft(`${mins}m left`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [poll.expiresAt]);

  return (
    <Card className={`p-4 border-border/50 bg-card/50 backdrop-blur-sm transition-all ${isExpired ? 'opacity-80' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground">{poll.question}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              by {poll.author?.firstName || poll.author?.lastName 
                ? `${poll.author.firstName || ''} ${poll.author.lastName || ''}`.trim() 
                : poll.author?.username}
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock size={12} />
              {timeLeft}
            </span>
          </div>
        </div>
        {isAuthor && (
          <button onClick={() => onDelete(poll._id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const voteCount = option.votes?.length || 0;
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isUserVote = idx === userVoteIndex;
          const isWinner = poll.winner === idx;

          return (
            <button
              key={option._id || idx}
              onClick={() => !isExpired && onVote(poll._id, idx)}
              disabled={isExpired}
              className={`w-full text-left rounded-xl border p-3 relative overflow-hidden transition-all ${
                isUserVote
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border/50 hover:border-primary/30'
              } ${isExpired ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {/* Progress bar background */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-xl ${
                  isWinner ? 'bg-green-500/15' : 'bg-primary/8'
                }`}
                style={{ width: `${pct}%` }}
              />

              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {option.image && (
                    <img src={option.image} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${isWinner ? 'text-green-500' : 'text-foreground'}`}>
                    {option.text}
                  </span>
                  {isWinner && (
                    <span className="flex items-center gap-0.5 text-xs font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                      <Trophy size={12} /> Winner
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-muted-foreground shrink-0">{pct}%</span>
              </div>

              {/* Voter avatars */}
              {voteCount > 0 && (
                <div className="relative flex items-center gap-1 mt-2">
                  {option.votes.slice(0, 5).map((voter) => (
                    <Avatar key={voter._id || voter} className="w-6 h-6 border border-background">
                      <AvatarImage src={voter.profilePicture} />
                      <AvatarFallback className="bg-primary/20 text-primary text-[9px]">
                        {(voter.firstName || voter.lastName) ? (voter.firstName ? voter.firstName.charAt(0).toUpperCase() : voter.lastName.charAt(0).toUpperCase()) : voter.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {voteCount > 5 && (
                    <span className="text-xs text-muted-foreground ml-1">+{voteCount - 5}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
    </Card>
  );
};

export default PollCard;
