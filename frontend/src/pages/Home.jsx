import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Send, Loader2, X, Radio, Globe, Users } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { getPosts, createPost, reset } from '../features/posts/postSlice';
import PostCard from '../components/PostCard';
import StatusBar from '../components/StatusBar';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import axios from 'axios';

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const { user } = useSelector((state) => state.auth);
  const { posts, isLoading, isError, message } = useSelector((state) => state.posts);
  
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [visibility, setVisibility] = useState('friends');

  useEffect(() => {
    if (isError) {
      toast.error(message);
      dispatch(reset());
    }

    dispatch(getPosts());

    // Check lobby presence
    const checkLobby = async () => {
      try {
        const res = await axios.get('/api/lobby/presence', {
          headers: { Authorization: `Bearer ${user?.token}` },
          baseURL: import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
        });
        setLobbyCount(res.data?.count || 0);
      } catch {}
    };
    if (user?.token) checkLobby();
    const interval = setInterval(() => { if (user?.token) checkLobby(); }, 30000);

    return () => {
      dispatch(reset());
      clearInterval(interval);
    };
  }, [dispatch, user?.token]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) {
      return toast.error('Please enter text or select an image');
    }

    setIsUploading(true);
    let uploadedImagePath = '';

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const config = {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`
          }
        };

        const { data } = await axios.post('/api/upload', formData, config);
        uploadedImagePath = data.image;
      }

      dispatch(createPost({ content, image: uploadedImagePath, visibility }));
      
      // Reset form
      setContent('');
      setVisibility('friends');
      removeImage();
    } catch (error) {
      toast.error('Error uploading image');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center w-full pb-10">
      <StatusBar />

      {/* Live Now Banner */}
      {lobbyCount > 0 && (
        <button
          onClick={() => navigate('/lobby')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 border border-primary/20 hover:border-primary/40 transition-all active:scale-[0.98]"
        >
          <div className="relative">
            <Radio size={20} className="text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">{lobbyCount} friend{lobbyCount !== 1 ? 's' : ''} in the Lobby</p>
            <p className="text-xs text-muted-foreground">Tap to join the vibe</p>
          </div>
          <span className="text-xs text-primary font-medium">Join →</span>
        </button>
      )}
      {/* Create Post Card */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex gap-3 items-start mb-4">
            <Avatar className="cursor-pointer hover:scale-105 transition-transform mt-1">
              <AvatarImage src={user?.profilePicture} alt={user?.username} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {(user?.firstName || user?.lastName) ? (user.firstName ? user.firstName.charAt(0).toUpperCase() : user.lastName.charAt(0).toUpperCase()) : user?.username?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 min-h-[80px] bg-background/40 backdrop-blur-sm text-foreground text-sm p-3 rounded-xl border border-border/50 hover:border-border hover:bg-muted/50 focus:border-primary focus:ring-1 focus:ring-primary focus:bg-background/60 transition-all resize-none outline-none"
            />
          </div>
          
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative w-full mb-4">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full max-h-[300px] object-cover rounded-lg border border-border"
              />
              <button 
                onClick={removeImage}
                className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1.5 rounded-full shadow-sm transition-colors border border-border"
              >
                <X size={16} className="text-foreground" />
              </button>
            </div>
          )}
          
          <Separator className="mb-4" />
          
          <div className="flex justify-between items-center">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              className="hidden" 
            />
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                className="text-muted-foreground gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={18} />
                Photo
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground text-xs gap-1.5 h-8 border border-border/40 rounded-lg px-2.5 cursor-pointer">
                    {visibility === 'public' ? <Globe size={14} /> : <Users size={14} />}
                    <span className="capitalize">{visibility}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setVisibility('friends')} className="gap-2 cursor-pointer">
                    <Users size={14} />
                    <span>Friends</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setVisibility('public')} className="gap-2 cursor-pointer">
                    <Globe size={14} />
                    <span>Public</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <Button 
              onClick={handlePostSubmit}
              isLoading={isLoading || isUploading}
              disabled={(!content.trim() && !imageFile)}
              className="gap-2"
            >
              <Send size={16} />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      <div className="w-full flex flex-col gap-4">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post._id} post={post} />)
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="w-full bg-card/60 backdrop-blur-md border-border/40 p-4 rounded-xl space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
              <div className="h-48 bg-muted rounded-xl w-full mt-2" />
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground mt-8">No posts yet. Be the first!</p>
        )}
      </div>

    </div>
  );
};

export default Home;
