import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Orbit, User, Camera, Upload, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { updateUser } from '../features/auth/authSlice';
import toast from 'react-hot-toast';
import axios from 'axios';

const Onboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const fileInputRef = useRef(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.isOnboarded) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  const handleUploadAndSubmit = async (e) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and Last name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageUrl = '';
      if (profileFile) {
        // 1. Upload photo to server
        const formData = new FormData();
        formData.append('image', profileFile);

        const uploadConfig = {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`,
          },
        };

        const { data: uploadData } = await axios.post('/api/upload', formData, uploadConfig);
        uploadedImageUrl = uploadData.image;
      }

      // 2. Update user profile details
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data: updatedUser } = await axios.put('/api/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        profilePicture: uploadedImageUrl || undefined,
        isOnboarded: true
      }, config);

      dispatch(updateUser(updatedUser));
      toast.success('Profile completed! Welcome to Orbit.');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to complete profile setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex justify-center items-center min-h-screen relative z-10 p-4 bg-background">
      <Card className="w-full max-w-[420px] p-8 rounded-2xl border border-border bg-card/30 backdrop-blur-md text-card-foreground shadow-2xl relative overflow-hidden flex flex-col justify-between">
        
        {/* Top Header */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground p-2.5 rounded-xl mb-4 shadow-lg shadow-primary/25">
            <Orbit size={28} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Complete your profile</h2>
          <p className="text-xs text-muted-foreground mt-1">Let's get your identity set up on Orbit</p>
        </div>

        {/* Content Form */}
        <form onSubmit={handleUploadAndSubmit} className="space-y-6 my-6">
          {/* Avatar Upload Selection */}
          <div className="flex flex-col items-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/60 hover:border-primary bg-muted/30 cursor-pointer flex items-center justify-center transition-all group hover:scale-105 shadow-inner"
            >
              {profilePreview ? (
                <img src={profilePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-center p-2 text-muted-foreground group-hover:text-primary transition-colors">
                  <Camera size={24} className="mb-1" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Add Photo</span>
                </div>
              )}
              {profilePreview && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload size={20} className="text-white" />
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            {profileFile && (
              <span className="text-[10px] text-muted-foreground mt-1.5 truncate max-w-[200px]">
                {profileFile.name}
              </span>
            )}
            {profilePreview && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileFile(null);
                  setProfilePreview('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="mt-2 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} /> Remove Selected
              </button>
            )}
          </div>

          {/* Inputs for First and Last Name */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5 ml-1">First Name</label>
              <Input
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-background/40 border-border/50 focus:border-primary h-11"
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5 ml-1">Last Name</label>
              <Input
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-background/40 border-border/50 focus:border-primary h-11"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 font-bold bg-gradient-to-r from-violet-600 to-emerald-500 hover:from-violet-500 hover:to-emerald-400 text-white shadow-lg transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" /> Finalizing Profile...
              </span>
            ) : (
              'Launch Orbit 🪐'
            )}
          </Button>
        </form>

      </Card>
    </div>
  );
};

export default Onboarding;
