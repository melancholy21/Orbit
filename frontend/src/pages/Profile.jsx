import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Camera, Users, UserCheck, Grid3X3, Loader2, Heart, MessageCircle, MapPin, Link as LinkIcon, Pencil, X, MessageSquare, Share, LayoutList, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';
import userService from '../features/users/userService';
import { updateProfilePic, updateUser } from '../features/auth/authSlice';
import PostCard from '../components/PostCard';
import toast from 'react-hot-toast';
import axios from 'axios';

const Profile = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isOwnProfile = !id || id === user?._id;
  const targetUserId = id || user?._id;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState('timeline');
  
  // Edit Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', location: '', website: '' });
  const [isSaving, setIsSaving] = useState(false);

  // User list modal state
  const [listModal, setListModal] = useState({ open: false, title: '', users: [], loading: false });
  const [listPage, setListPage] = useState(1);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!targetUserId) return;
      setIsLoading(true);
      try {
        const [profileData, postsData] = await Promise.all([
          userService.getUserProfile(targetUserId, user.token),
          userService.getUserPosts(targetUserId, user.token),
        ]);
        setProfile(profileData);
        setPosts(postsData);
        setEditForm({
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

  const handleFollow = async () => {
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
        toast.success('Friend request accepted');
      } else if (action === 'remove') {
        await axios.delete(`/api/users/friends/${targetUserId}/remove`, config);
        setProfile(prev => ({
          ...prev,
          friends: prev.friends?.filter(id => id !== user._id)
        }));
        toast.success('Friend removed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to perform friend action');
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
    <div className="flex flex-col items-center w-full pb-10 gap-6">
      <Card className="w-full overflow-hidden border-border/50">
        <div className="h-32 bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30 relative flex justify-end p-4">
           {isOwnProfile && (
             <Button size="sm" variant="secondary" className="gap-2 backdrop-blur-md bg-background/50 hover:bg-background/80" onClick={() => setIsEditModalOpen(true)}>
               <Pencil size={14} /> Edit Profile
             </Button>
           )}
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col items-center -mt-14 mb-4 relative z-10">
            <div className="relative group mb-4">
              <Avatar className="w-28 h-28 border-4 border-background shadow-lg ring-2 ring-primary/20">
                <AvatarImage src={profile.profilePicture} alt={profile.username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                  {(profile.firstName || profile.lastName) ? (profile.firstName ? profile.firstName.charAt(0).toUpperCase() : profile.lastName.charAt(0).toUpperCase()) : profile.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {isOwnProfile && (
                <>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer border border-transparent"
                      title="Upload Photo"
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Camera size={20} />
                      )}
                    </button>
                    {profile.profilePicture && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={isUploading}
                        className="w-10 h-10 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 rounded-full text-red-200 hover:text-white transition-colors cursor-pointer border border-transparent"
                        title="Remove Photo"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  <div className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md border-2 border-background pointer-events-none z-10">
                    <Camera size={12} />
                  </div>
                </>
              )}
            </div>
            
            {!isOwnProfile && (
              <div className="flex flex-col gap-2 items-center w-full max-w-xs mt-2 px-2">
                {/* Row 1: Friend and Follow actions side-by-side */}
                <div className="flex justify-center items-center gap-2 w-full">
                  <div className="flex-1">
                    {isFriend ? (
                      <Button onClick={() => handleFriendAction('remove')} variant="outline" className="w-full gap-1.5 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10 border-red-500/30 px-2 h-9">
                        <UserCheck size={14} /> Unfriend
                      </Button>
                    ) : hasReceivedRequest ? (
                      <Button onClick={() => handleFriendAction('accept')} variant="default" className="w-full gap-1.5 text-xs bg-green-600 hover:bg-green-700 px-2 h-9">
                        <UserCheck size={14} /> Accept
                      </Button>
                    ) : hasSentRequest ? (
                      <Button disabled variant="outline" className="w-full gap-1.5 text-xs px-2 h-9">
                        <Users size={14} /> Sent
                      </Button>
                    ) : (
                      <Button onClick={() => handleFriendAction('request')} variant="outline" className="w-full gap-1.5 text-xs px-2 h-9">
                        <Users size={14} /> Add Friend
                      </Button>
                    )}
                  </div>

                  <div className="flex-1">
                    <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"} className="w-full text-xs h-9">
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>
                  </div>
                </div>

                {/* Row 2: Message button below */}
                {isMutualFollow && (
                  <div className="w-full">
                    <Button onClick={() => navigate(`/messages/${targetUserId}`)} variant="secondary" className="w-full gap-2 text-xs h-9">
                      <MessageSquare size={14} /> Message
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-5 flex flex-col items-center text-center">
            {profile.firstName || profile.lastName ? (
              <>
                <h1 className="text-2xl font-bold text-foreground">
                  {`${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
                </h1>
                <p className="text-sm text-muted-foreground font-semibold">@{profile.username}</p>
              </>
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
            )}
            
            {profile.bio && (
              <p className="text-sm text-foreground/90 mt-2.5 max-w-sm">{profile.bio}</p>
            )}
            
            <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted-foreground font-medium">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={14} /> {profile.location}
                </div>
              )}
              {profile.website && (
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-primary hover:underline">
                  <LinkIcon size={14} /> {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {profile.status && profile.status.expiresAt && new Date() < new Date(profile.status.expiresAt) && (profile.status.emoji || profile.status.text) && (
              <div className="mt-4 inline-flex items-center gap-2 bg-muted/60 border border-border/50 rounded-full px-4 py-1.5">
                {profile.status.emoji && <span className="text-base">{profile.status.emoji}</span>}
                {profile.status.text && <span className="text-sm text-muted-foreground">{profile.status.text}</span>}
                {profile.status.isFree && <span className="text-[10px] font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">Free</span>}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-8 border-t border-border/50 pt-5 mt-5">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-foreground">{posts.length}</span>
              <span className="text-xs text-muted-foreground font-medium">Posts</span>
            </div>
            <button onClick={() => openUserList('followers')} className="flex flex-col items-center hover:opacity-70 transition-opacity">
              <span className="text-lg font-bold text-foreground">{profile.followers?.length || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">Followers</span>
            </button>
            <button onClick={() => openUserList('following')} className="flex flex-col items-center hover:opacity-70 transition-opacity">
              <span className="text-lg font-bold text-foreground">{profile.following?.length || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">Following</span>
            </button>
            <button onClick={() => openUserList('friends')} className="flex flex-col items-center hover:opacity-70 transition-opacity">
              <span className="text-lg font-bold text-foreground">{profile.friends?.length || 0}</span>
              <span className="text-xs text-muted-foreground font-medium">Friends</span>
            </button>
          </div>
        </div>
      </Card>

      {/* View mode tabs */}
      <div className="w-full flex border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <button
          onClick={() => setViewMode('timeline')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            viewMode === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutList size={16} /> Timeline
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            viewMode === 'grid' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Grid3X3 size={16} /> Photos
        </button>
      </div>

      {/* Content */}
      {viewMode === 'timeline' ? (
        posts.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <LayoutList size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No posts yet</p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {posts.map((post) => {
              const isRepost = post.author?._id !== targetUserId;
              return (
                <div key={post._id}>
                  {isRepost && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 ml-4">
                      <Share size={12} />
                      <span className="font-medium">{profile.username}</span> reposted
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
          <div className="text-center text-muted-foreground py-12">
            <Grid3X3 size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No photo posts yet</p>
          </div>
        ) : (
          <div className="w-full grid grid-cols-3 gap-1">
            {imagePosts.map((post) => (
              <button key={post._id} onClick={() => navigate(`/post/${post._id}`)} className="relative aspect-square overflow-hidden bg-muted group cursor-pointer">
                <img src={post.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-white text-sm font-semibold"><Heart size={16} className="fill-white" />{post.likes?.length || 0}</div>
                  <div className="flex items-center gap-1 text-white text-sm font-semibold"><MessageCircle size={16} className="fill-white" />{post.comments?.length || 0}</div>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* Followers / Following / Friends List Modal */}
      {listModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl relative max-h-[70vh] flex flex-col">
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 text-foreground">Edit Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Bio</label>
                <textarea 
                  value={editForm.bio} 
                  onChange={e => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-24"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Location</label>
                <input 
                  type="text" 
                  value={editForm.location} 
                  onChange={e => setEditForm({...editForm, location: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. San Francisco, CA"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Website</label>
                <input 
                  type="text" 
                  value={editForm.website} 
                  onChange={e => setEditForm({...editForm, website: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. yoursite.com"
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full mt-2">
                {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
