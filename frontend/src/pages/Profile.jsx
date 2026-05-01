import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, Users, UserCheck, Grid3X3, Loader2, Heart, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import userService from '../features/users/userService';
import { updateProfilePic } from '../features/auth/authSlice';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import axios from 'axios';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const [profileData, postsData] = await Promise.all([
          userService.getUserProfile(user._id, user.token),
          userService.getUserPosts(user._id, user.token),
        ]);
        setProfile(profileData);
        setPosts(postsData);
      } catch (error) {
        toast.error('Failed to load profile');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      // Upload the image first
      const formData = new FormData();
      formData.append('image', file);

      const uploadConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data: uploadData } = await axios.post('/api/upload', formData, uploadConfig);

      // Then update the profile picture
      await userService.updateProfilePicture(uploadData.image, user.token);

      // Update local state
      setProfile((prev) => ({ ...prev, profilePicture: uploadData.image }));

      // Sync Redux auth state (this also updates localStorage)
      dispatch(updateProfilePic(uploadData.image));

      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-muted-foreground mt-16">
        <p>Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full pb-10 gap-6">
      {/* Profile Header Card */}
      <Card className="w-full overflow-hidden border-border/50">
        {/* Banner gradient */}
        <div className="h-28 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 relative" />

        <div className="px-6 pb-6">
          {/* Avatar Section */}
          <div className="flex justify-center -mt-14 mb-4">
            <div className="relative group">
              <Avatar className="w-28 h-28 border-4 border-background shadow-lg ring-2 ring-primary/20">
                <AvatarImage src={profile.profilePicture} alt={profile.username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                  {profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Upload overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="animate-spin text-white" size={24} />
                ) : (
                  <Camera className="text-white" size={24} />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />

              {/* Small camera badge */}
              <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md border-2 border-background">
                <Camera size={12} />
              </div>
            </div>
          </div>

          {/* Username */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{profile.bio}</p>
            )}

            {/* User Status */}
            {profile.status && profile.status.expiresAt && new Date() < new Date(profile.status.expiresAt) && (profile.status.emoji || profile.status.text) && (
              <div className="mt-3 inline-flex items-center gap-2 bg-muted/60 border border-border/50 rounded-full px-4 py-1.5">
                {profile.status.emoji && (
                  <span className="text-base">{profile.status.emoji}</span>
                )}
                {profile.status.text && (
                  <span className="text-sm text-muted-foreground">{profile.status.text}</span>
                )}
                {profile.status.isFree && (
                  <span className="text-[10px] font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">Free</span>
                )}
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">{posts.length}</span>
              <span className="text-xs text-muted-foreground font-medium">Posts</span>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">{profile.followers?.length || 0}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <Users size={12} />
                Followers
              </div>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-foreground">{profile.following?.length || 0}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <UserCheck size={12} />
                Following
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* View Toggle */}
      <div className="w-full flex border-b border-border">
        <button
          onClick={() => setViewMode('grid')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            viewMode === 'grid'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Grid3X3 size={16} />
          Grid
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            viewMode === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageCircle size={16} />
          Posts
        </button>
      </div>

      {/* Posts Content */}
      {posts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Grid3X3 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm mt-1">Share your first post!</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="w-full grid grid-cols-3 gap-1">
          {posts.map((post) => (
            <button
              key={post._id}
              onClick={() => setViewMode('list')}
              className="relative aspect-square overflow-hidden bg-muted group cursor-pointer"
            >
              {post.image ? (
                <img
                  src={post.image}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2 bg-card">
                  <p className="text-xs text-muted-foreground line-clamp-4 text-center">
                    {post.content}
                  </p>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                <div className="flex items-center gap-1 text-white text-sm font-semibold">
                  <Heart size={16} className="fill-white" />
                  {post.likes?.length || 0}
                </div>
                <div className="flex items-center gap-1 text-white text-sm font-semibold">
                  <MessageCircle size={16} className="fill-white" />
                  {post.comments?.length || 0}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="w-full">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Profile;
