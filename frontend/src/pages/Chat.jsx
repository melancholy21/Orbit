import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { ChevronLeft, Send, Loader2, Image, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLobby } from '../context/LobbyContext'; // For global socket
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatFullName, getInitials } from '../lib/utils';

const Chat = () => {
  const { userId } = useParams(); // ID of the user we are chatting with
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { socket } = useLobby(); // Get the global socket

  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteConfirmMsgId, setDeleteConfirmMsgId] = useState(null);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const isFirstLoad = useRef(true);

  // Fetch user details
  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`/api/users/${userId}`, config);
        setOtherUser(res.data);
      } catch (err) {
        console.error('Failed to fetch user', err);
        setError('User not found');
      }
    };
    fetchOtherUser();
  }, [userId, user.token]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get(`/api/messages/${userId}`, config);
        setMessages(res.data.messages || []);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      } finally {
        setLoading(false);
      }
    };
    if (otherUser) {
      fetchMessages();
    }
  }, [userId, user.token, otherUser]);

  // Handle Socket Events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // If the message is from the person we are chatting with, or from us
      if (msg.sender._id === userId || msg.sender._id === user._id) {
        setMessages((prev) => [...prev, msg]);
        
        // If the message is from the other user, mark it as read in the DB in real-time
        if (msg.sender._id === userId) {
          const config = { headers: { Authorization: `Bearer ${user.token}` } };
          axios.put(`/api/messages/${userId}/read`, {}, config).catch(() => {});
        }
      }
    };

    const handleMessageEdited = ({ messageId, text }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, text } : msg))
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    socket.on('newPrivateMessage', handleNewMessage);
    socket.on('privateMessageEdited', handleMessageEdited);
    socket.on('privateMessageDeleted', handleMessageDeleted);

    return () => {
      socket.off('newPrivateMessage', handleNewMessage);
      socket.off('privateMessageEdited', handleMessageEdited);
      socket.off('privateMessageDeleted', handleMessageDeleted);
    };
  }, [socket, userId, user._id, user.token]);

  // Scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isFirstLoad.current ? 'auto' : 'smooth'
      });
      isFirstLoad.current = false;
    }
  }, [messages]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCancelImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditClick = (msg) => {
    setEditingMessageId(msg._id);
    setEditText(msg.text);
    setActiveMenuId(null);
  };

  const handleSaveEdit = async (msgId) => {
    if (!editText.trim()) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.put(`/api/messages/${msgId}`, { text: editText }, config);
      
      setMessages((prev) =>
        prev.map((msg) => (msg._id === msgId ? res.data : msg))
      );
      
      if (socket) {
        socket.emit('editPrivateMessage', {
          receiverId: userId,
          messageId: msgId,
          text: editText
        });
      }
      
      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to edit message', err);
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = (msgId) => {
    setDeleteConfirmMsgId(msgId);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteConfirmMsgId) return;
    const msgId = deleteConfirmMsgId;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`/api/messages/${msgId}`, config);
      
      setMessages((prev) => prev.filter((msg) => msg._id !== msgId));
      
      if (socket) {
        socket.emit('deletePrivateMessage', {
          receiverId: userId,
          messageId: msgId
        });
      }
      setActiveMenuId(null);
      toast.success('Message deleted');
    } catch (err) {
      console.error('Failed to delete message', err);
      toast.error('Failed to delete message');
    } finally {
      setDeleteConfirmMsgId(null);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !imageFile) return;

    setSending(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadConfig = {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${user.token}`,
          },
        };
        const { data: uploadData } = await axios.post('/api/upload', formData, uploadConfig);
        imageUrl = uploadData.image;
      }

      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      // Send image message first if it exists
      if (imageUrl) {
        const resImage = await axios.post(`/api/messages`, {
          receiverId: userId,
          text: '',
          image: imageUrl
        }, config);

        const newMsgImage = resImage.data;
        setMessages((prev) => [...prev, newMsgImage]);

        if (socket) {
          socket.emit('sendPrivateMessage', {
            receiverId: userId,
            message: newMsgImage
          });
        }
      }

      // Send text message next if it exists
      if (inputText.trim()) {
        const resText = await axios.post(`/api/messages`, {
          receiverId: userId,
          text: inputText,
          image: ''
        }, config);

        const newMsgText = resText.data;
        setMessages((prev) => [...prev, newMsgText]);

        if (socket) {
          socket.emit('sendPrivateMessage', {
            receiverId: userId,
            message: newMsgText
          });
        }
      }

      setInputText('');
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to send message', err);
      setError(err.response?.data?.message || 'Failed to send message. Make sure you follow each other.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background relative">
      {/* Chat Header */}
      <div className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-4 shrink-0 gap-3 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 text-muted-foreground shrink-0">
          <ChevronLeft size={20} />
        </Button>
        {otherUser && (
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            onClick={() => navigate(`/profile/${otherUser._id}`)}
          >
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={otherUser.profilePicture} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(otherUser)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <h2 className="font-bold text-foreground text-sm leading-tight truncate">
                {formatFullName(otherUser)}
              </h2>
              <span className="text-[10px] text-muted-foreground leading-none">@{otherUser.username}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 text-center border-b border-destructive/20">
          {error}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMe = msg.sender._id === user._id;
          return (
            <div key={msg._id || idx} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
              <div 
                onClick={() => isMe && activeMenuId !== msg._id && !editingMessageId && setActiveMenuId(msg._id)}
                className={`max-w-[75%] rounded-2xl overflow-hidden shadow-sm cursor-pointer transition-all hover:brightness-95 ${
                  isMe 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-muted text-foreground rounded-tl-sm'
                } ${!msg.text && msg.image ? 'p-1' : ''}`}
              >
                {msg.image && (
                  <img 
                    src={msg.image} 
                    alt="Sent attachment" 
                    className="max-w-full h-auto object-cover max-h-60 rounded-xl"
                  />
                )}
                {msg.text && (
                  editingMessageId === msg._id ? (
                    <div className="flex flex-col gap-2 p-3 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-background/50 text-foreground border border-border rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        rows={2}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMessageId(null)}
                          className="px-2.5 py-1 text-[10px] bg-muted hover:bg-muted/80 rounded-md text-foreground cursor-pointer font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg._id)}
                          className="px-2.5 py-1 text-[10px] bg-violet-600 hover:bg-violet-700 text-white rounded-md cursor-pointer font-bold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words px-4 py-2">
                      {msg.text}
                    </p>
                  )
                )}
              </div>
              {msg.createdAt && (
                <span className="text-[9px] text-muted-foreground mt-0.5 px-1.5 font-medium leading-none">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}

              {/* Action Menu (Edit / Delete) */}
              {isMe && activeMenuId === msg._id && !editingMessageId && (
                <div className="flex items-center gap-2 mt-1.5 px-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {msg.text && (
                    <button
                      onClick={() => handleEditClick(msg)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer bg-muted/60 px-2 py-0.5 rounded"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="text-[10px] font-bold text-red-400 hover:text-red-500 cursor-pointer bg-red-500/10 px-2 py-0.5 rounded"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setActiveMenuId(null)}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer bg-muted/60 px-2 py-0.5 rounded"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-card/80 backdrop-blur-md shrink-0 flex flex-col gap-2">
        {imagePreview && (
          <div className="relative inline-block self-start p-1 bg-muted rounded-xl border border-border">
            <img src={imagePreview} alt="Preview" className="max-h-24 rounded-lg object-cover" />
            <button
              type="button"
              onClick={handleCancelImage}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-md hover:bg-destructive/90 transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Image size={20} />
          </Button>
          <Input
            placeholder="Message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 rounded-full bg-background border-border focus-visible:ring-1 focus-visible:ring-primary h-10 px-4"
          />
          <Button 
            type="submit" 
            size="icon" 
            isLoading={sending}
            disabled={!inputText.trim() && !imageFile} 
            className="rounded-full h-10 w-10 shrink-0"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmMsgId)}
        title="Delete Message"
        message="Are you sure you want to delete this message? This will remove it for both you and the recipient."
        onConfirm={confirmDeleteMessage}
        onCancel={() => setDeleteConfirmMsgId(null)}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
};

export default Chat;
