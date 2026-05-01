import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Send, Loader2, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { getPosts, createPost, reset } from '../features/posts/postSlice';
import PostCard from '../components/PostCard';
import StatusBar from '../components/StatusBar';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import toast from 'react-hot-toast';
import axios from 'axios';

const Home = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  
  const { user } = useSelector((state) => state.auth);
  const { posts, isLoading, isError, message } = useSelector((state) => state.posts);
  
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isError) {
      toast.error(message);
      // We need to dispatch reset here to clear the error so it doesn't persist
      dispatch(reset());
    }
  }, [isError, message, dispatch]);

  useEffect(() => {
    dispatch(getPosts());
    
    return () => {
      dispatch(reset());
    };
  }, [dispatch]);

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

      dispatch(createPost({ content, image: uploadedImagePath }));
      
      // Reset form
      setContent('');
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
      
      {/* Create Post Card */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex gap-3 items-start mb-4">
            <Avatar className="cursor-pointer hover:scale-105 transition-transform mt-1">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {user?.username?.charAt(0).toUpperCase() || '?'}
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
            <Button 
              variant="ghost" 
              className="text-muted-foreground gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={18} />
              Photo
            </Button>
            
            <Button 
              onClick={handlePostSubmit}
              disabled={(!content.trim() && !imageFile) || isLoading || isUploading}
              className="gap-2"
            >
              {(isLoading || isUploading) ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      <div className="w-full">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post._id} post={post} />)
        ) : (
          !isLoading && <p className="text-center text-muted-foreground mt-8">No posts yet. Be the first!</p>
        )}
      </div>

    </div>
  );
};

export default Home;
