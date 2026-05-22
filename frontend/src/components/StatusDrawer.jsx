import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateStatus } from '../features/auth/authSlice';
import { X } from 'lucide-react';
import userService from '../features/users/userService';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const PRESETS = [
  { emoji: '🍕', label: 'Food' },
  { emoji: '🎮', label: 'Game' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🍺', label: 'Drinks' },
  { emoji: '😴', label: 'Chilling' },
  { emoji: '💻', label: 'Study' }
];

const StatusDrawer = ({ isOpen, onClose, currentStatus, onStatusUpdate }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const [isFree, setIsFree] = useState(currentStatus?.isFree || false);
  const [emoji, setEmoji] = useState(currentStatus?.emoji || '');
  const [text, setText] = useState(currentStatus?.text || '');
  const [duration, setDuration] = useState(4); // default 4h
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);

      const statusData = {
        isFree,
        emoji,
        text,
        expiresAt: expiresAt.toISOString()
      };

      const updatedUser = await userService.updateStatus(statusData, user.token);
      onStatusUpdate(updatedUser.status);
      dispatch(updateStatus(updatedUser.status));
      toast.success('Status updated!');
      onClose();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 bg-muted rounded-full hover:bg-muted/80">
          <X size={20} className="text-foreground" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-foreground">What's the vibe?</h2>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl mb-6">
          <span className="font-semibold text-lg text-foreground">I'm free to hang / chat</span>
          <button
            onClick={() => setIsFree(!isFree)}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${
              isFree ? 'bg-green-500' : 'bg-muted-foreground/30'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white transition-transform ${
                isFree ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setEmoji(preset.emoji);
                setText(preset.label);
              }}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border ${
                emoji === preset.emoji && text === preset.label
                  ? 'bg-primary/10 border-primary shadow-sm'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              <span className="text-3xl">{preset.emoji}</span>
              <span className="text-xs font-medium text-foreground">{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Specifics... (e.g. At Starbucks)"
            className="w-full bg-background border border-border p-4 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        <div className="flex gap-3 mb-8">
          {[1, 2, 4].map((hours) => (
            <button
              key={hours}
              onClick={() => setDuration(hours)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                duration === hours
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {hours}h
            </button>
          ))}
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          className="w-full py-6 text-lg rounded-2xl font-semibold"
        >
          {isLoading ? 'Updating...' : 'Set Status'}
        </Button>
      </div>
    </div>
  );
};

export default StatusDrawer;
