import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, Users, User, UserCheck, Grid3X3, Loader2, Heart, MessageCircle, MapPin, Link as LinkIcon, Pencil, X, MessageSquare, Share, LayoutList, Trash2, Calendar, AlignLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';
import userService from '../features/users/userService';
import { updateProfilePic, updateUser } from '../features/auth/authSlice';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import axios from 'axios';
import ConfirmDialog from '../components/ConfirmDialog';
import { getImageUrl } from '../lib/utils';


const Profile = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isOwnProfile = !id || id === user?._id;
  const targetUserId = id || user?._id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friendsPreview, setFriendsPreview] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [viewMode, setViewMode] = useState('timeline');

  // Edit Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', bio: '', location: '', website: '' });
  const [isSaving, setIsSaving] = useState(false);

  // User list modal state
  const [listModal, setListModal] = useState({ open: false, title: '', users: [], loading: false });
  const [listPage, setListPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, isDestructive: false });

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUserId) return;
      setIsLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const [profileData, postsData, friendsData] = await Promise.all([
          userService.getUserProfile(targetUserId, user.token),
          userService.getUserPosts(targetUserId, user.token),
          axios.get(`/api/users/${targetUserId}/friends`, config).then(res => res.data).catch(() => []),
        ]);
        setProfile(profileData);
        setPosts(postsData);
        setFriendsPreview(friendsData);
        setEditForm({
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          website: profileData.website || ''
        });
      } catch (error) {
        toast.error('Failed to load profile');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [targetUserId, user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data: uploadData } = await axios.post('/api/upload', formData, uploadConfig);

      await userService.updateProfilePicture(uploadData.image, user.token);

      setProfile((prev) => ({ ...prev, profilePicture: uploadData.image }));
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

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    try {
      await userService.updateProfilePicture('', user.token);
      setProfile((prev) => ({ ...prev, profilePicture: '' }));
      dispatch(updateProfilePic(''));
      toast.success('Profile picture removed!');
    } catch (error) {
      toast.error('Failed to remove profile picture');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data: uploadData } = await axios.post('/api/upload', formData, uploadConfig);

      await userService.updateProfile({ coverPicture: uploadData.image }, user.token);

      setProfile((prev) => ({ ...prev, coverPicture: uploadData.image }));
      dispatch(updateUser({ coverPicture: uploadData.image }));

      toast.success('Cover picture updated!');
    } catch (error) {
      toast.error('Failed to upload cover picture');
      console.error(error);
    } finally {
      setIsCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleCoverRemove = async () => {
    setIsCoverUploading(true);
    try {
      await userService.updateProfile({ coverPicture: '' }, user.token);
      setProfile((prev) => ({ ...prev, coverPicture: '' }));
      dispatch(updateUser({ coverPicture: '' }));
      toast.success('Cover picture removed!');
    } catch (error) {
      toast.error('Failed to remove cover picture');
      console.error(error);
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleFollow = async () => {
    const isCurrentlyFollowing = profile.followers?.includes(user._id);
    if (isCurrentlyFollowing) {
      setConfirmModal({
        open: true,
        title: 'Unfollow User',
        message: `Are you sure you want to unfollow @${profile.username}?`,
        onConfirm: executeFollowToggle,
        isDestructive: true
      });
    } else {
      executeFollowToggle();
    }
  };

  const executeFollowToggle = async () => {
    setConfirmModal(prev => ({ ...prev, open: false }));
    try {
      await axios.put(`/api/users/${targetUserId}/follow`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const isFollowing = profile.followers.includes(user._id);
      setProfile(prev => ({
        ...prev,
        followers: isFollowing
          ? prev.followers.filter(fid => fid !== user._id)
          : [...prev.followers, user._id]
      }));
    } catch (error) {
      toast.error('Failed to update follow status');
    }
  };

  const handleFriendAction = async (action) => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (action === 'request') {
        await axios.post(`/api/users/friends/${targetUserId}/request`, {}, config);
        setProfile(prev => ({ ...prev, friendRequestsReceived: [...(prev.friendRequestsReceived || []), user._id] }));
        toast.success('Friend request sent');
      } else if (action === 'accept') {
        await axios.put(`/api/users/friends/${targetUserId}/accept`, {}, config);
        setProfile(prev => ({
          ...prev,
          friends: [...(prev.friends || []), user._id],
          friendRequestsSent: prev.friendRequestsSent?.filter(id => id !== user._id),
          followers: prev.followers?.includes(user._id) ? prev.followers : [...(prev.followers || []), user._id]
        }));
        setFriendsPreview(prev => [...prev, user]);
        toast.success('Friend request accepted');
      } else if (action === 'remove') {
        setConfirmModal({
          open: true,
          title: 'Unfriend User',
          message: `Are you sure you want to unfriend @${profile.username}?`,
          onConfirm: () => executeUnfriendAction(config),
          isDestructive: true
        });
      } else if (action === 'cancel') {
        await axios.delete(`/api/users/friends/${targetUserId}/cancel`, config);
        setProfile(prev => ({
          ...prev,
          friendRequestsReceived: prev.friendRequestsReceived?.filter(id => id.toString() !== user._id.toString())
        }));
        toast.success('Friend request cancelled');
      }

    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to perform friend action');
    }
  };

  const executeUnfriendAction = async (config) => {
    setConfirmModal(prev => ({ ...prev, open: false }));
    try {
      await axios.delete(`/api/users/friends/${targetUserId}/remove`, config);
      setProfile(prev => ({
        ...prev,
        friends: prev.friends?.filter(id => id !== user._id)
      }));
      setFriendsPreview(prev => prev.filter(f => f._id !== user._id));
      toast.success('Friend removed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unfriend user');
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updatedProfile = await userService.updateProfile(editForm, user.token);
      setProfile(prev => ({ ...prev, ...updatedProfile }));
      dispatch(updateUser(updatedProfile));
      setIsEditModalOpen(false);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const openUserList = async (type) => {
    setListPage(1);
    setListModal({ open: true, title: type, users: [], loading: true });
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get(`/api/users/${targetUserId}/${type.toLowerCase()}`, config);
      setListModal(prev => ({ ...prev, users: data, loading: false }));
    } catch (err) {
      toast.error(`Failed to load ${type}`);
      setListModal(prev => ({ ...prev, loading: false }));
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

  const isFollowing = profile.followers?.includes(user?._id);
  const isFollowedBy = profile.following?.includes(user?._id);
  const isMutualFollow = isFollowing && isFollowedBy;
  const isFriend = profile.friends?.includes(user?._id);
  const hasSentRequest = profile.friendRequestsReceived?.includes(user?._id);
  const hasReceivedRequest = profile.friendRequestsSent?.includes(user?._id);

  const imagePosts = posts.filter(p => p.image);

  return (
    <div className="flex flex-col items-center w-full pb-10 gap-6 max-w-2xl mx-auto px-4 md:px-0">
      {/* Profile Card Header (Highly Polished Centered Layout) */}
      <Card className="w-full overflow-hidden border-border/30 bg-card/30 backdrop-blur-md shadow-lg rounded-2xl">
        {/* Cover Photo */}
        <div className="relative h-44 md:h-52 w-full bg-muted overflow-hidden group">
          {profile.coverPicture ? (
            <img
              src={getImageUrl(profile.coverPicture)}
              alt="Cover"
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full relative overflow-hidden bg-slate-950">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 via-fuchsia-500/20 to-indigo-600/30" />
              <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
              <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
            </div>
          )}

          {/* Edit/Remove Cover Button Overlay (Own Profile) - Placed at top-right to avoid overlap with profile picture */}
          {isOwnProfile && (
            <div className="absolute right-3 top-3 flex gap-2 z-30 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 backdrop-blur-md bg-background/50 hover:bg-background/85 text-foreground border border-white/10 shadow-lg text-xs h-8 px-3 rounded-xl font-bold transition-all duration-200 active:scale-95"
                onClick={() => coverInputRef.current?.click()}
                disabled={isCoverUploading}
              >
                {isCoverUploading ? <Loader2 className="animate-spin" size={12} /> : <Camera size={12} />}
                Edit Cover
              </Button>
              {profile.coverPicture && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 backdrop-blur-md bg-red-600/60 hover:bg-red-600/80 text-white border border-red-500/20 shadow-lg text-xs h-8 px-2.5 rounded-xl transition-all duration-200 active:scale-95"
                  onClick={handleCoverRemove}
                  disabled={isCoverUploading}
                >
                  <Trash2 size={12} />
                </Button>
              )}
              <input type="file" ref={coverInputRef} accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </div>
          )}
        </div>


        {/* Profile Content Container */}
        <div className="px-6 pb-6 text-center flex flex-col items-center">
          {/* Avatar (Centered & Overlapping) - Clickable for touch-friendly menu on mobile */}
          <div
            className={`relative group shrink-0 z-10 -mt-14 ${isOwnProfile ? 'cursor-pointer' : ''}`}
            onClick={() => isOwnProfile && setIsAvatarModalOpen(true)}
          >
            <Avatar className="w-28 h-28 md:w-32 md:h-32 border-4 border-background/40 backdrop-blur-sm shadow-lg ring-1 ring-border/30">
              <AvatarImage src={profile.profilePicture} alt={profile.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                {(profile.firstName || profile.lastName) ? (profile.firstName ? profile.firstName.charAt(0).toUpperCase() : profile.lastName.charAt(0).toUpperCase()) : profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {isOwnProfile && (
              <>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsAvatarModalOpen(true); }}
                  className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 shadow-md border-2 border-background/40 z-15 transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Change Profile Picture"
                >
                  <Camera size={12} />
                </button>
              </>
            )}
          </div>

          {/* User Names & Username */}
          <div className="mt-5">
            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              {profile.firstName || profile.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : profile.username}
            </h1>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">@{profile.username}</p>
          </div>

          {/* Status Badge */}
          {profile.status && profile.status.expiresAt && new Date() < new Date(profile.status.expiresAt) && (profile.status.emoji || profile.status.text) && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-full px-3 py-1 shadow-sm text-xs text-primary font-semibold">
              {profile.status.emoji && <span className="text-sm">{profile.status.emoji}</span>}
              {profile.status.text && <span>{profile.status.text}</span>}
              {profile.status.isFree && <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1 py-0.5 rounded-full ml-1">Free</span>}
            </div>
          )}

          {/* Bio */}
          {profile.bio ? (
            <p className="text-sm text-foreground/90 mt-5 max-w-md leading-relaxed">{profile.bio}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic mt-5">No bio written yet.</p>
          )}

          {/* Location, Website, Joined Date */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-5 text-xs text-muted-foreground font-semibold">
            {profile.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-muted-foreground/80" /> {profile.location}
              </div>
            )}
            {profile.website && (
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                <LinkIcon size={14} className="text-primary/80" /> {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-muted-foreground/80" /> Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap justify-center items-center gap-2 mt-6 w-full max-w-sm">
            {isOwnProfile ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 border-border hover:border-primary/30 bg-secondary/50 hover:bg-primary/10 text-foreground hover:text-primary h-9 rounded-xl font-bold text-xs shadow-md hover:shadow-[0_0_15px_hsl(var(--primary)/0.15)] transition-all duration-300 active:scale-[0.98] group"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Pencil size={13} className="text-muted-foreground group-hover:text-primary transition-transform group-hover:rotate-12 duration-200" /> Edit Profile
              </Button>
            ) : (
              <div className="flex w-full gap-2">
                <div className="flex-1">
                  {isFriend ? (
                    <Button onClick={() => handleFriendAction('remove')} variant="outline" className="w-full gap-1.5 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/20 border-red-500/20 h-9 rounded-xl backdrop-blur-md bg-background/30 shadow-md">
                      <UserCheck size={14} /> Unfriend
                    </Button>
                  ) : hasReceivedRequest ? (
                    <Button onClick={() => handleFriendAction('accept')} variant="default" className="w-full gap-1.5 text-xs bg-green-600 hover:bg-green-700 h-9 rounded-xl text-white">
                      <UserCheck size={14} /> Accept Request
                    </Button>
                  ) : hasSentRequest ? (
                    <Button onClick={() => handleFriendAction('cancel')} variant="outline" className="w-full gap-1.5 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/20 border-red-500/20 h-9 rounded-xl backdrop-blur-md bg-background/30 shadow-md">
                      <X size={14} /> Cancel Request
                    </Button>
                  ) : (
                    <Button onClick={() => handleFriendAction('request')} variant="outline" className="w-full gap-1.5 text-xs h-9 rounded-xl border-primary/30 backdrop-blur-md bg-primary/10 text-primary hover:bg-primary/20">
                      <Users size={14} /> Add Friend
                    </Button>
                  )}
                </div>

                <div className="flex-1">
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className={`w-full text-xs h-9 rounded-xl font-bold ${isFollowing ? 'backdrop-blur-md bg-background/30 hover:bg-background/50 border border-border/30 text-foreground shadow-md' : 'bg-primary hover:bg-primary/95 text-primary-foreground shadow-md'}`}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                </div>

                {isMutualFollow && (
                  <Button onClick={() => navigate(`/messages/${targetUserId}`)} variant="secondary" className="gap-2 text-xs h-9 rounded-xl px-3.5 backdrop-blur-md bg-background/30 hover:bg-background/50 border border-border/30 text-foreground shadow-md">
                    <MessageSquare size={14} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex justify-between sm:justify-center gap-4 sm:gap-8 w-full border-t border-border/20 pt-4 mt-4 text-center px-1">
            <div className="flex flex-col items-center">
              <span className="text-base font-bold text-foreground">{posts.length}</span>
              <span className="text-xs text-muted-foreground font-medium">Posts</span>
            </div>
            <button onClick={() => openUserList('followers')} className="flex flex-col items-center hover:opacity-75 transition-opacity">
              <span className="text-base font-bold text-foreground">{profile.followers?.length || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">Followers</span>
            </button>
            <button onClick={() => openUserList('following')} className="flex flex-col items-center hover:opacity-75 transition-opacity">
              <span className="text-base font-bold text-foreground">{profile.following?.length || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">Following</span>
            </button>
            <button onClick={() => openUserList('friends')} className="flex flex-col items-center hover:opacity-75 transition-opacity">
              <span className="text-base font-bold text-foreground">{profile.friends?.length || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">Friends</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Single-Column Content Section */}
      <div className="w-full space-y-6">
        {/* Sticky Tabs Bar */}
        <div className="w-full flex border border-border/30 sticky top-0 bg-card/30 backdrop-blur-md z-10 rounded-xl overflow-hidden shadow-md">
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${viewMode === 'timeline' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-background/25'
              }`}
          >
            <LayoutList size={16} /> Timeline
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${viewMode === 'grid' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-background/25'
              }`}
          >
            <Grid3X3 size={16} /> Photos Grid
          </button>
        </div>

        {/* Content Views */}
        {viewMode === 'timeline' ? (
          posts.length === 0 ? (
            <Card className="text-center text-muted-foreground py-12 border-border/30 bg-card/25 backdrop-blur-md rounded-2xl shadow-md">
              <LayoutList size={48} className="mx-auto mb-4 opacity-30 text-primary" />
              <p className="text-lg font-bold text-foreground">No posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">When {profile.username} shares something, it will show up here.</p>
            </Card>
          ) : (
            <div className="w-full space-y-4">
              {posts.map((post) => {
                const isRepost = post.author?._id !== targetUserId;
                return (
                  <div key={post._id}>
                    {isRepost && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 ml-4">
                        <Share size={12} />
                        <span className="font-semibold">{profile.username}</span> reposted
                      </div>
                    )}
                    <PostCard post={post} />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          imagePosts.length === 0 ? (
            <Card className="text-center text-muted-foreground py-12 border-border/30 bg-card/25 backdrop-blur-md rounded-2xl shadow-md">
              <Grid3X3 size={48} className="mx-auto mb-4 opacity-30 text-primary" />
              <p className="text-lg font-bold text-foreground">No photos yet</p>
              <p className="text-sm text-muted-foreground mt-1">Photo posts shared by {profile.username} will appear here.</p>
            </Card>
          ) : (
            <Card className="p-4 border-border/30 bg-card/25 backdrop-blur-md shadow-md rounded-2xl">
              <div className="w-full grid grid-cols-3 gap-2">
                {imagePosts.map((post) => (
                  <button
                    key={post._id}
                    onClick={() => navigate(`/post/${post._id}`)}
                    className="relative aspect-square overflow-hidden bg-muted group cursor-pointer rounded-lg border border-border/40"
                  >
                    <img src={getImageUrl(post.image)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white text-sm font-semibold"><Heart size={16} className="fill-white" />{post.likes?.length || 0}</div>
                      <div className="flex items-center gap-1 text-white text-sm font-semibold"><MessageCircle size={16} className="fill-white" />{post.comments?.length || 0}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )
        )}
      </div>

      {/* Followers / Following / Friends List Modal */}
      {listModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card/85 backdrop-blur-lg w-full max-w-md rounded-2xl border border-border/30 shadow-2xl relative max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold capitalize">{listModal.title}</h2>
              <button onClick={() => setListModal({ open: false, title: '', users: [], loading: false })} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {listModal.loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-primary" size={28} />
                </div>
              ) : listModal.users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No {listModal.title} yet.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {listModal.users.slice((listPage - 1) * 5, listPage * 5).map(u => (
                    <button
                      key={u._id}
                      onClick={() => { setListModal({ open: false, title: '', users: [], loading: false }); navigate(`/profile/${u._id}`); }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors w-full text-left"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.profilePicture} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {(u.firstName || u.lastName) ? (u.firstName ? u.firstName.charAt(0).toUpperCase() : u.lastName.charAt(0).toUpperCase()) : u.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">
                          {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.username}
                        </span>
                        <span className="text-xs text-muted-foreground">@{u.username}</span>
                        {u.bio && <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{u.bio}</span>}
                      </div>
                    </button>
                  ))}

                  {listModal.users.length > 5 && (
                    <div className="flex items-center justify-between mt-4 px-2 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={listPage === 1}
                        onClick={() => setListPage(prev => prev - 1)}
                        className="h-8 text-xs"
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground font-medium">
                        Page {listPage} of {Math.ceil(listModal.users.length / 5)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={listPage >= Math.ceil(listModal.users.length / 5)}
                        onClick={() => setListPage(prev => prev + 1)}
                        className="h-8 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal (Improved with FirstName / LastName fields) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-card/90 backdrop-blur-xl w-full max-w-md rounded-2xl border border-white/10 shadow-2xl p-6 relative shadow-[0_0_50px_0_rgba(109,40,217,0.15)]">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 hover:bg-white/5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
                Edit Orbit Profile
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Customize your presence details for your friends to see.</p>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <User size={13} className="text-violet-400" /> First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full bg-slate-900/60 border border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 outline-none text-foreground placeholder:text-muted-foreground/60"
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <User size={13} className="text-violet-400" /> Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full bg-slate-900/60 border border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 outline-none text-foreground placeholder:text-muted-foreground/60"
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <AlignLeft size={13} className="text-violet-400" /> Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 outline-none text-foreground placeholder:text-muted-foreground/60 resize-none h-20"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <MapPin size={13} className="text-violet-400" /> Location
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 outline-none text-foreground placeholder:text-muted-foreground/60"
                  placeholder="e.g. San Francisco, CA"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <LinkIcon size={13} className="text-violet-400" /> Website
                </label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 hover:border-white/20 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 outline-none text-foreground placeholder:text-muted-foreground/60"
                  placeholder="e.g. yoursite.com"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 border-0"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                  Save Profile Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal (Mobile/PWA Touch Friendly) */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card/85 backdrop-blur-lg w-full max-w-sm rounded-2xl border border-border/30 shadow-2xl p-6 relative">
            <button onClick={() => setIsAvatarModalOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4 text-foreground text-center">Profile Picture</h2>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => { setIsAvatarModalOpen(false); fileInputRef.current?.click(); }}
                className="w-full gap-2 text-sm font-semibold rounded-xl"
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                Upload New Photo
              </Button>
              {profile.profilePicture && (
                <Button
                  onClick={() => { setIsAvatarModalOpen(false); handleRemoveAvatar(); }}
                  variant="destructive"
                  className="w-full gap-2 text-sm font-semibold rounded-xl bg-red-600/80 hover:bg-red-600 text-white"
                >
                  <Trash2 size={16} /> Remove Current Photo
                </Button>
              )}
              <Button
                onClick={() => setIsAvatarModalOpen(false)}
                variant="outline"
                className="w-full mt-1 border-border/40 text-sm font-semibold rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        confirmText="Confirm"
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
};

export default Profile;
