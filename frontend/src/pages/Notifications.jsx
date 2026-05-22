import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Heart, MessageCircle, UserPlus, HandMetal, Loader2, Check, Share, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`/api/notifications`, config);
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user]);

  const markAllAsRead = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.put(`/api/notifications/read-all`, {}, config);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        await axios.put(`/api/notifications/${notification._id}/read`, {}, config);
        setNotifications(notifications.map(n => n._id === notification._id ? { ...n, read: true } : n));
      } catch (err) {}
    }

    // Navigate based on type
    if (['follow', 'nudge', 'friend_request', 'friend_accept'].includes(notification.type)) {
      if (notification.sender?._id) {
        navigate(`/profile/${notification.sender._id}`);
      } else {
        navigate('/');
      }
    } else if (notification.post) {
      navigate(`/post/${notification.post}`);
    } else {
      navigate('/'); // Go home as fallback
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={16} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle size={16} className="text-blue-500" />;
      case 'follow': return <UserPlus size={16} className="text-primary" />;
      case 'nudge': return <HandMetal size={16} className="text-yellow-500" />;
      case 'share': return <Share size={16} className="text-green-500" />;
      case 'friend_request': return <UserPlus size={16} className="text-purple-500" />;
      case 'friend_accept': return <UserCheck size={16} className="text-purple-500" />;
      default: return <Bell size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2 text-xs h-8">
            <Check size={14} /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20 text-muted-foreground">
          <Bell size={48} className="mb-4 opacity-20" />
          <p>No notifications yet.</p>
          <p className="text-sm mt-2 opacity-60">Interact with friends to get notified!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notif) => (
            <Card 
              key={notif._id}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full p-4 flex items-start gap-4 cursor-pointer transition-colors border-blue-500/10 ${!notif.read ? 'bg-primary/5' : 'bg-card hover:bg-muted/50'}`}
            >
              <div className="relative shrink-0">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={notif.sender?.profilePicture} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {(notif.sender?.firstName || notif.sender?.lastName) ? (notif.sender.firstName ? notif.sender.firstName.charAt(0).toUpperCase() : notif.sender.lastName.charAt(0).toUpperCase()) : notif.sender?.username ? notif.sender.username.charAt(0).toUpperCase() : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border/50">
                  {getIcon(notif.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-foreground">
                  <span className="font-bold">
                    {notif.sender?.firstName || notif.sender?.lastName
                      ? `${notif.sender.firstName || ''} ${notif.sender.lastName || ''}`.trim()
                      : notif.sender?.username || 'Deleted User'}
                  </span>
                  {(notif.sender?.firstName || notif.sender?.lastName) && (
                    <span className="text-xs text-muted-foreground ml-1">@{notif.sender?.username}</span>
                  )} {notif.content}
                </p>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </span>
              </div>

              {!notif.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
