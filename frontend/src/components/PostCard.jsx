import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Reply, Pencil, X, Check, Repeat2, Globe, Users, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleLike, addComment, deletePost, addReply, editPost, sharePost, editComment, deleteComment, editReply, deleteReply } from '../features/posts/postSlice';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import ConfirmDialog from './ConfirmDialog';
import { getImageUrl, formatFullName, getInitials } from '../lib/utils';
import useAsyncAction from '../hooks/useAsyncAction';
import toast from 'react-hot-toast';
import { formatText } from '../lib/textParser';
import useMentionAutocomplete from '../hooks/useMentionAutocomplete';
import MentionDropdown from './MentionDropdown';
import axios from 'axios';




const PostCard = ({ post: initialPost }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [post, setPost] = useState(initialPost);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  // Track which comment we are replying to
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  const lastLikeClickRef = React.useRef(0);
  const lastShareClickRef = React.useRef(0);

  const [friends, setFriends] = useState([]);
  const commentInputRef = useRef(null);
  const replyInputRef = useRef(null);
  const editPostInputRef = useRef(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editVisibility, setEditVisibility] = useState('friends');
  const [editRemoveImage, setEditRemoveImage] = useState(false);

  const commentMention = useMentionAutocomplete(
    commentText,
    setCommentText,
    commentInputRef,
    friends
  );

  const replyMention = useMentionAutocomplete(
    replyText,
    setReplyText,
    replyInputRef,
    friends
  );

  const editPostMention = useMentionAutocomplete(
    editText,
    setEditText,
    editPostInputRef,
    friends
  );

  useEffect(() => {
    if ((expanded || isEditing) && user?.token && friends.length === 0) {
      const fetchFriends = async () => {
        try {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          const { data } = await axios.get('/api/users/friends/status', config);
          setFriends(data || []);
        } catch (err) {
          console.error('Failed to fetch friends for mentions', err);
        }
      };
      fetchFriends();
    }
  }, [expanded, isEditing, user?.token, friends.length]);


  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Comment editing states
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Reply editing states
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState('');

  // Handlers for comment actions
  const handleStartEditComment = (comment) => {
    setEditingCommentId(comment._id);
    setEditingCommentText(comment.content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveEditComment = async (commentId) => {
    if (editingCommentText.trim()) {
      try {
        await dispatch(editComment({ commentId, content: editingCommentText.trim() })).unwrap();
        setPost(prev => ({
          ...prev,
          comments: prev.comments.map(c => c._id === commentId ? { ...c, content: editingCommentText.trim() } : c)
        }));
        handleCancelEditComment();
      } catch (err) {
        toast.error('Failed to update comment');
      }
    }
  };

  const handleDeleteCommentClick = async (commentId) => {
    try {
      await dispatch(deleteComment(commentId)).unwrap();
      setPost(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c._id !== commentId)
      }));
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  // Handlers for reply actions
  const handleStartEditReply = (commentId, reply) => {
    setEditingReplyId(reply._id);
    setEditingReplyText(reply.content);
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const handleSaveEditReply = async (commentId, replyId) => {
    if (editingReplyText.trim()) {
      try {
        const res = await dispatch(editReply({ commentId, replyId, content: editingReplyText.trim() })).unwrap();
        setPost(prev => ({
          ...prev,
          comments: prev.comments.map(c => c._id === commentId ? res : c)
        }));
        handleCancelEditReply();
      } catch (err) {
        toast.error('Failed to update reply');
      }
    }
  };

  const handleDeleteReplyClick = async (commentId, replyId) => {
    try {
      const res = await dispatch(deleteReply({ commentId, replyId })).unwrap();
      setPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => c._id === commentId ? res : c)
      }));
      toast.success('Reply deleted');
    } catch (err) {
      toast.error('Failed to delete reply');
    }
  };

  const sharingFriend = post.shares?.find(s => {
    const sId = typeof s === 'object' ? s._id : s;
    return sId === user?._id || user?.friends?.includes(sId);
  });
  
  const sharingFriendId = sharingFriend ? (typeof sharingFriend === 'object' ? sharingFriend._id : sharingFriend) : null;
  const isRepost = sharingFriendId && post.author?._id !== sharingFriendId;

  const isLiked = user && post.likes?.includes(user._id);
  const hasReposted = user && post.shares?.some(s => {
    const sId = typeof s === 'object' ? s._id : s;
    return sId === user._id;
  });
  const isAuthor = user && post.author?._id === user._id;

  const handleLike = async () => {
    if (!user) return;

    const now = Date.now();
    if (now - lastLikeClickRef.current < 400) {
      return; // Ignore rapid spam clicks
    }
    lastLikeClickRef.current = now;

    const originalLikes = [...(post.likes || [])];
    const isAlreadyLiked = originalLikes.includes(user._id);

    // Optimistic Update
    const newLikes = isAlreadyLiked
      ? originalLikes.filter(id => id !== user._id)
      : [...originalLikes, user._id];

    setPost(prev => ({ ...prev, likes: newLikes }));

    try {
      const res = await dispatch(toggleLike(post._id)).unwrap();
      // Update with server confirmation
      setPost(prev => ({ ...prev, likes: res.likes }));
    } catch (err) {
      console.error('Failed to toggle like', err);
      // Rollback
      setPost(prev => ({ ...prev, likes: originalLikes }));
      toast.error('Failed to update like status');
    }
  };



  const [handleCommentSubmit, isSubmittingComment] = useAsyncAction(async (e) => {
    e.preventDefault();
    if (commentText.trim() !== '') {
      try {
        const res = await dispatch(addComment({ postId: post._id, content: commentText })).unwrap();
        setPost(prev => {
          const exists = prev.comments.some(c => c._id === res.comment._id);
          if (exists) return prev;
          return { ...prev, comments: [...prev.comments, res.comment] };
        });
        setCommentText('');
      } catch (err) {
        console.error('Failed to add comment', err);
      }
    }
  });

  const handleDeletePost = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeletePost = () => {
    dispatch(deletePost(post._id));
    setShowDeleteConfirm(false);
  };

  const handleStartEdit = () => {
    setEditText(post.content);
    setEditVisibility(post.visibility || 'friends');
    setEditRemoveImage(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
    setEditRemoveImage(false);
  };

  const [handleSaveEdit, isSavingEdit] = useAsyncAction(async () => {
    const contentChanged = editText.trim() !== post.content;
    const imageChanged = editRemoveImage && post.image;
    const visibilityChanged = editVisibility !== (post.visibility || 'friends');

    if (editText.trim() && (contentChanged || imageChanged || visibilityChanged)) {
      try {
        const updatedPost = await dispatch(editPost({
          postId: post._id,
          content: editText.trim(),
          visibility: editVisibility,
          ...(imageChanged ? { image: '' } : {})
        })).unwrap();
        setPost(updatedPost);
      } catch (err) {
        console.error('Failed to save edit', err);
      }
    }
    setIsEditing(false);
    setEditText('');
    setEditRemoveImage(false);
  });

  const [handleReplySubmit, isSubmittingReply] = useAsyncAction(async (e, commentId) => {
    e.preventDefault();
    if (replyText.trim() !== '') {
      try {
        const res = await dispatch(addReply({ commentId, content: replyText })).unwrap();
        setPost(prev => ({
          ...prev,
          comments: prev.comments.map(c => c._id === commentId ? res : c)
        }));
        setReplyText('');
        setReplyingTo(null);
      } catch (err) {
        console.error('Failed to reply', err);
      }
    }
  });

  const handleShare = async () => {
    if (!user) return;

    const now = Date.now();
    if (now - lastShareClickRef.current < 400) {
      return; // Ignore rapid spam clicks
    }
    lastShareClickRef.current = now;

    const originalShares = [...(post.shares || [])];
    const hasAlreadyShared = originalShares.includes(user._id);

    // Optimistic Update
    const newShares = hasAlreadyShared
      ? originalShares.filter(id => id !== user._id)
      : [...originalShares, user._id];

    setPost(prev => ({ ...prev, shares: newShares }));

    try {
      const res = await dispatch(sharePost(post._id)).unwrap();
      setPost(prev => ({ ...prev, shares: res.shares }));
    } catch (err) {
      console.error('Failed to share post', err);
      // Rollback
      setPost(prev => ({ ...prev, shares: originalShares }));
      toast.error('Failed to share post');
    }
  };




  return (
    <Card className={`w-full mb-6 border-blue-500/30 shadow-[0_4px_20px_-5px_rgba(59,130,246,0.15)] bg-card/30 backdrop-blur-md ${expanded || isEditing ? 'relative z-20 overflow-visible' : 'overflow-hidden'}`}>
      {isRepost && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-6 pt-3">
          <Repeat2 size={12} className="text-green-500" />
          <span className="font-semibold text-green-400 hover:underline cursor-pointer" onClick={() => navigate(`/profile/${sharingFriendId}`)}>
            {sharingFriendId === user?._id ? 'You' : (typeof sharingFriend === 'object' ? formatFullName(sharingFriend) : 'A friend')}
          </span>{' '}
          reposted
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div 
          className="flex flex-row items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/profile/${post.author?._id}`)}
        >
          <Avatar>
            <AvatarImage src={post.author?.profilePicture} alt={post.author?.username} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(post.author)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-baseline gap-1.5 leading-none">
              <span className="font-bold text-base hover:underline">
                {formatFullName(post.author)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1 font-medium">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span>•</span>
              {post.visibility === 'public' ? (
                <span className="flex items-center gap-0.5" title="Public">
                  <Globe size={11} />
                  <span>Public</span>
                </span>
              ) : (
                <span className="flex items-center gap-0.5" title="Friends Only">
                  <Users size={11} />
                  <span>Friends</span>
                </span>
              )}
            </div>
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
              <DropdownMenuItem onClick={handleStartEdit} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit Post</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeletePost} className="cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Post</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className={`relative ${editPostMention.showSuggestions ? 'z-30' : ''}`}>
              <textarea
                ref={editPostInputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyUp={editPostMention.checkMention}
                onSelect={editPostMention.checkMention}
                className="w-full min-h-[80px] bg-background/60 text-foreground text-sm p-3 rounded-xl border border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none outline-none"
                autoFocus
              />
              {editPostMention.showSuggestions && (
                <MentionDropdown
                  friends={editPostMention.filteredFriends}
                  onSelect={editPostMention.handleSelect}
                  className="left-0 mt-1"
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs gap-1.5 h-8 border border-border/40 rounded-lg px-2.5 cursor-pointer">
                    {editVisibility === 'public' ? <Globe size={14} /> : <Users size={14} />}
                    <span className="capitalize">{editVisibility}</span>
                    <ChevronDown size={12} className="opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditVisibility('friends')} className="gap-2 cursor-pointer">
                    <Users size={14} />
                    <span>Friends</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditVisibility('public')} className="gap-2 cursor-pointer">
                    <Globe size={14} />
                    <span>Public</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  isLoading={isSavingEdit}
                  disabled={!editText.trim() || (editText.trim() === post.content && !editRemoveImage && editVisibility === (post.visibility || 'friends'))}
                  className="gap-1.5"
                >
                  <Check size={14} />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const CHAR_LIMIT = 300;
            const LINE_LIMIT = 6;
            const lines = post.content.split('\n');
            const isTooLong = post.content.length > CHAR_LIMIT || lines.length > LINE_LIMIT;

            let displayText = post.content;
            if (isTooLong && !showFullContent) {
              if (lines.length > LINE_LIMIT) {
                displayText = lines.slice(0, LINE_LIMIT).join('\n');
              }
              if (displayText.length > CHAR_LIMIT) {
                displayText = displayText.slice(0, CHAR_LIMIT);
              }
              displayText = displayText.trimEnd() + '...';
            }

            return (
              <div>
                <p className="text-sm whitespace-pre-wrap break-words">{formatText(displayText)}</p>
                {isTooLong && (
                  <button
                    onClick={() => setShowFullContent(!showFullContent)}
                    className="text-xs font-semibold text-primary hover:text-primary/80 mt-1 transition-colors"
                  >
                    {showFullContent ? 'See less' : 'See more'}
                  </button>
                )}
              </div>
            );
          })()
        )}

        {post.image && !editRemoveImage && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border relative group">
            <img src={getImageUrl(post.image)} alt="Post content" className="w-full h-auto object-cover" loading="lazy" />
            {isEditing && (
              <button
                onClick={() => setEditRemoveImage(true)}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                title="Remove image"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {isEditing && editRemoveImage && post.image && (
          <div className="mt-4 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Image will be removed</span>
            <button
              onClick={() => setEditRemoveImage(false)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Undo
            </button>
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
            <span className="text-sm font-medium text-muted-foreground">
              {post.comments.reduce((total, comment) => total + 1 + (comment.replies ? comment.replies.length : 0), 0)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className={`transition-colors ${hasReposted ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-green-500'}`}
              title={hasReposted ? "Undo Repost" : "Repost"}
            >
              <Repeat2 size={20} className={hasReposted ? "stroke-[2.5]" : ""} />
            </button>
            <span className={`text-sm font-medium transition-colors ${hasReposted ? 'text-green-500 font-semibold' : 'text-muted-foreground'}`}>
              {post.shares?.length || 0}
            </span>
          </div>
        </div>

        {expanded && (
          <div className="w-full bg-muted/30 px-6 py-4">
            <div className="space-y-4 mb-4">
              {post.comments.map((comment) => (
                <div key={comment._id} className="flex flex-col gap-2 group/comment">
                  <div className="flex gap-3">
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarImage src={comment.author?.profilePicture} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {getInitials(comment.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-background/40 backdrop-blur-sm border border-blue-500/10 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs font-bold mb-0.5">
                            {formatFullName(comment.author)}
                          </p>
                          {(comment.author?._id === user?._id || post.author?._id === user?._id) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors opacity-0 group-hover/comment:opacity-100 focus:opacity-100 cursor-pointer">
                                  <MoreVertical size={13} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {comment.author?._id === user?._id && (
                                  <DropdownMenuItem onClick={() => handleStartEditComment(comment)} className="cursor-pointer text-xs py-1">
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                    <span>Edit</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleDeleteCommentClick(comment._id)} className="cursor-pointer text-xs py-1 text-red-500 focus:text-red-500">
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        {editingCommentId === comment._id ? (
                          <div className="mt-1 space-y-1.5">
                            <input
                              type="text"
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              className="w-full bg-background/60 text-sm px-2.5 py-1 rounded-lg border border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={handleCancelEditComment}
                                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEditComment(comment._id)}
                                disabled={!editingCommentText.trim() || editingCommentText.trim() === comment.content}
                                className="text-[10px] font-semibold text-primary hover:text-primary/80 px-2 py-0.5 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">{formatText(comment.content)}</p>
                        )}
                      </div>
                      <div className="flex items-center mt-1 ml-1">
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                        <div key={reply._id} className="flex gap-3 group/reply">
                          <Avatar className="w-5 h-5 mt-1">
                            <AvatarImage src={reply.author?.profilePicture} />
                            <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                              {getInitials(reply.author)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-background/40 backdrop-blur-sm border border-blue-500/10 rounded-lg px-3 py-2">
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-xs font-bold mb-0.5">
                                  {formatFullName(reply.author)}
                                </p>
                                {(reply.author?._id === user?._id || comment.author?._id === user?._id || post.author?._id === user?._id) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors opacity-0 group-hover/reply:opacity-100 focus:opacity-100 cursor-pointer">
                                        <MoreVertical size={13} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {reply.author?._id === user?._id && (
                                        <DropdownMenuItem onClick={() => handleStartEditReply(comment._id, reply)} className="cursor-pointer text-xs py-1">
                                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                          <span>Edit</span>
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handleDeleteReplyClick(comment._id, reply._id)} className="cursor-pointer text-xs py-1 text-red-500 focus:text-red-500">
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                        <span>Delete</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              {editingReplyId === reply._id ? (
                                <div className="mt-1 space-y-1.5">
                                  <input
                                    type="text"
                                    value={editingReplyText}
                                    onChange={(e) => setEditingReplyText(e.target.value)}
                                    className="w-full bg-background/60 text-xs px-2.5 py-1 rounded-lg border border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={handleCancelEditReply}
                                      className="text-[9px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveEditReply(comment._id, reply._id)}
                                      disabled={!editingReplyText.trim() || editingReplyText.trim() === reply.content}
                                      className="text-[9px] font-semibold text-primary hover:text-primary/80 px-2 py-0.5 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs">{formatText(reply.content)}</p>
                              )}
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
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 relative ${replyMention.showSuggestions ? 'z-30' : ''}`}>
                        <Input
                          ref={replyInputRef}
                          placeholder={`Reply to ${formatFullName(comment.author)}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyUp={replyMention.checkMention}
                          onSelect={replyMention.checkMention}
                          className="w-full bg-background/40 backdrop-blur-sm h-8 text-xs border-blue-500/20 focus:border-blue-500/50"
                          autoFocus
                        />
                        {replyMention.showSuggestions && (
                          <MentionDropdown
                            friends={replyMention.filteredFriends}
                            onSelect={replyMention.handleSelect}
                            className="bottom-9 left-0"
                          />
                        )}
                      </div>
                      <Button type="submit" size="icon" isLoading={isSubmittingReply} disabled={!replyText.trim()} className="h-8 w-8 shrink-0">
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
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className={`flex-1 relative ${commentMention.showSuggestions ? 'z-30' : ''}`}>
                <Input
                  ref={commentInputRef}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyUp={commentMention.checkMention}
                  onSelect={commentMention.checkMention}
                  className="w-full bg-background/40 backdrop-blur-sm h-9 text-sm border-blue-500/20 focus:border-blue-500/50"
                />
                {commentMention.showSuggestions && (
                  <MentionDropdown
                    friends={commentMention.filteredFriends}
                    onSelect={commentMention.handleSelect}
                    className="bottom-10 left-0"
                  />
                )}
              </div>
              <Button type="submit" size="icon" isLoading={isSubmittingComment} disabled={!commentText.trim()} className="h-9 w-9 shrink-0">
                <Send size={16} />
              </Button>
            </form>
          </div>
        )}
      </CardFooter>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={confirmDeletePost}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete"
        isDestructive={true}
      />
    </Card>
  );
};

export default PostCard;
