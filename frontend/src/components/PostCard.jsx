import React, { useState } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { toggleLike, addComment, deletePost, addReply } from '../features/posts/postSlice';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

const PostCard = ({ post }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // Track which comment we are replying to
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const isLiked = user && post.likes.includes(user._id);
  const isAuthor = user && post.author?._id === user._id;

  const handleLike = () => {
    dispatch(toggleLike(post._id));
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (commentText.trim() !== '') {
      dispatch(addComment({ postId: post._id, content: commentText }));
      setCommentText('');
    }
  };

  const handleDeletePost = () => {
    dispatch(deletePost(post._id));
  };

  const handleReplySubmit = (e, commentId) => {
    e.preventDefault();
    if (replyText.trim() !== '') {
      dispatch(addReply({ commentId, content: replyText }));
      setReplyText('');
      setReplyingTo(null);
    }
  };

  return (
    <Card className="w-full mb-6 overflow-hidden border-blue-500/30 shadow-[0_4px_20px_-5px_rgba(59,130,246,0.15)] bg-card/30 backdrop-blur-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-row items-center gap-4">
          <Avatar>
            <AvatarImage src={post.author?.profilePicture} alt={post.author?.username} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {post.author?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-base leading-none">{post.author?.username}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDeletePost} className="text-destructive focus:text-destructive cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Post</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent>
        <p className="text-sm">{post.content}</p>
        
        {post.image && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border">
            <img src={post.image} alt="Post content" className="w-full h-auto object-cover" />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col px-0 py-0">
        <Separator />
        <div className="flex items-center gap-6 px-6 py-3 w-full">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleLike} 
              className={`hover:text-primary transition-colors ${isLiked ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Heart size={20} className={isLiked ? "fill-current" : ""} />
            </button>
            <span className="text-sm font-medium text-muted-foreground">{post.likes.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageCircle size={20} />
            </button>
            <span className="text-sm font-medium text-muted-foreground">{post.comments.length}</span>
          </div>
        </div>

        {expanded && (
          <div className="w-full bg-muted/30 px-6 py-4">
            <div className="space-y-4 mb-4">
              {post.comments.map((comment) => (
                <div key={comment._id} className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarImage src={comment.author?.profilePicture} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {comment.author?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-background/40 backdrop-blur-sm border border-blue-500/10 rounded-lg px-3 py-2">
                        <p className="text-xs font-bold mb-0.5">{comment.author?.username}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex items-center mt-1 ml-1">
                        <button 
                          onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Render nested replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="pl-9 space-y-3 mt-1">
                      {comment.replies.map((reply) => (
                        <div key={reply._id} className="flex gap-3">
                          <Avatar className="w-5 h-5 mt-1">
                            <AvatarImage src={reply.author?.profilePicture} />
                            <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                              {reply.author?.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-background/40 backdrop-blur-sm border border-blue-500/10 rounded-lg px-3 py-2">
                              <p className="text-xs font-bold mb-0.5">{reply.author?.username}</p>
                              <p className="text-xs">{reply.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input Form */}
                  {replyingTo === comment._id && (
                    <form onSubmit={(e) => handleReplySubmit(e, comment._id)} className="flex items-center gap-2 pl-9 mt-1">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {user?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Input
                        placeholder={`Reply to ${comment.author?.username}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 bg-background/40 backdrop-blur-sm h-8 text-xs border-blue-500/20 focus:border-blue-500/50"
                        autoFocus
                      />
                      <Button type="submit" size="icon" disabled={!replyText.trim()} className="h-8 w-8 shrink-0">
                        <Reply size={14} />
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
            
            <Separator className="mb-4" />

            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-background/40 backdrop-blur-sm h-9 text-sm border-blue-500/20 focus:border-blue-500/50"
              />
              <Button type="submit" size="icon" disabled={!commentText.trim()} className="h-9 w-9 shrink-0">
                <Send size={16} />
              </Button>
            </form>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PostCard;
