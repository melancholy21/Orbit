import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import LobbyMessage from './models/LobbyMessage.js';
import Room from './models/Room.js';

// In-memory global online users
export const onlineUsers = new Map(); // userId -> socket.id

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Auth middleware — verify JWT on connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = {
        _id: user._id.toString(),
        username: user.username,
        profilePicture: user.profilePicture
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 ${socket.user.username} connected globally`);

    // Track online user
    onlineUsers.set(socket.user._id, socket.id);

    // ============ ROOM PRESENCE ============

    socket.on('joinRoom', async ({ roomId }) => {
      try {
        socket.join(roomId);
        socket.roomId = roomId;

        // Add user to Room participants list in database
        const room = await Room.findByIdAndUpdate(
          roomId,
          { $addToSet: { participants: socket.user._id } },
          { returnDocument: 'after' }
        ).populate('participants', 'username profilePicture firstName lastName');

        if (!room) return;

        // Broadcast presence updates to other room members
        io.to(roomId).emit('presenceUpdate', room.participants);

        // Send current state to the joining user
        socket.emit('lobbyState', {
          users: room.participants,
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt ? room.currentStartedAt.toISOString() : null,
          isPlaying: room.isPlaying,
          repeatMode: room.repeatMode,
          ownerId: room.owner
        });

        // Send recent chat history for this specific room
        const messages = await LobbyMessage.find({ roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('sender', 'username profilePicture firstName lastName');

        socket.emit('chatHistory', messages.reverse());
      } catch (err) {
        console.error('Error joining room socket:', err);
      }
    });

    socket.on('leaveRoom', async () => {
      await handleLeaveRoom(socket, io);
    });

    socket.on('disconnect', async () => {
      console.log(`❌ ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.user._id);
      await handleLeaveRoom(socket, io);
    });

    // ============ PRIVATE MESSAGING & NOTIFS ============
    
    socket.on('sendPrivateMessage', (data) => {
      const { receiverId, message } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newPrivateMessage', message);
      }
    });

    socket.on('editPrivateMessage', (data) => {
      const { receiverId, messageId, text } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('privateMessageEdited', { messageId, text });
      }
    });

    socket.on('deletePrivateMessage', (data) => {
      const { receiverId, messageId } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('privateMessageDeleted', { messageId });
      }
    });

    socket.on('sendNotification', (data) => {
      const { receiverId, notification } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newNotification', notification);
      }
    });

    // Send lobby invite notification to a friend
    socket.on('sendLobbyInvite', (data) => {
      const { receiverId, roomId, roomName } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('lobbyInvite', {
          sender: {
            _id: socket.user._id,
            username: socket.user.username,
            profilePicture: socket.user.profilePicture
          },
          roomId,
          roomName
        });
      }
    });

    // ============ ROOM CHAT ============

    socket.on('sendMessage', async ({ text }) => {
      const roomId = socket.roomId;
      if (!roomId || !text || !text.trim()) return;

      try {
        const msg = await LobbyMessage.create({
          roomId,
          sender: socket.user._id,
          text: text.trim()
        });

        const populated = await msg.populate('sender', 'username profilePicture firstName lastName');

        io.to(roomId).emit('newMessage', {
          _id: populated._id,
          sender: populated.sender,
          text: populated.text,
          createdAt: populated.createdAt
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ============ MEDIA QUEUE ============

    socket.on('addToQueue', async ({ url, title }) => {
      const roomId = socket.roomId;
      if (!roomId || !url) return;

      try {
        const room = await Room.findById(roomId);
        if (!room) return;

        const item = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          url,
          title: title || url,
          addedBy: {
            userId: socket.user._id,
            username: socket.user.username
          },
          addedAt: new Date()
        };

        room.queue.push(item);

        if (room.currentTrackIndex === -1 || !room.isPlaying) {
          room.currentTrackIndex = room.queue.length - 1;
          room.currentStartedAt = new Date();
          room.isPlaying = true;
        }

        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying
        });
      } catch (err) {
        console.error('Error adding to queue:', err);
      }
    });

    socket.on('skipTrack', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room || room.queue.length === 0) return;

        if (room.currentTrackIndex < room.queue.length - 1) {
          room.currentTrackIndex++;
          room.currentStartedAt = new Date();
          room.isPlaying = true;
        } else {
          room.isPlaying = false;
          room.currentStartedAt = null;
        }

        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying
        });
      } catch (err) {
        console.error('Error skipping track:', err);
      }
    });

    socket.on('previousTrack', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room || room.queue.length === 0) return;

        if (room.currentTrackIndex > 0) {
          room.currentTrackIndex--;
          room.currentStartedAt = new Date();
          room.isPlaying = true;
        }

        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying
        });
      } catch (err) {
        console.error('Error going to previous track:', err);
      }
    });

    socket.on('togglePlay', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room || room.queue.length === 0 || room.currentTrackIndex === -1) return;

        room.isPlaying = !room.isPlaying;
        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying
        });
      } catch (err) {
        console.error('Error toggling play:', err);
      }
    });

    socket.on('trackEnded', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room) return;

        if (room.repeatMode === 'track') {
          room.currentStartedAt = new Date();
          room.isPlaying = true;
        } else if (room.currentTrackIndex < room.queue.length - 1) {
          room.currentTrackIndex++;
          room.currentStartedAt = new Date();
          room.isPlaying = true;
        } else if (room.repeatMode === 'queue') {
          room.currentTrackIndex = 0;
          room.currentStartedAt = new Date();
          room.isPlaying = true;
        } else {
          room.isPlaying = false;
          room.currentStartedAt = null;
        }

        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying,
          repeatMode: room.repeatMode
        });
      } catch (err) {
        console.error('Error on track ended:', err);
      }
    });

    socket.on('requestSync', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room) return;

        socket.emit('syncResponse', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying,
          repeatMode: room.repeatMode
        });
      } catch (err) {
        console.error('Error syncing:', err);
      }
    });

    socket.on('clearQueue', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room) return;

        room.queue = [];
        room.currentTrackIndex = -1;
        room.currentStartedAt = null;
        room.isPlaying = false;

        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: null,
          isPlaying: room.isPlaying,
          repeatMode: room.repeatMode
        });
      } catch (err) {
        console.error('Error clearing queue:', err);
      }
    });

    socket.on('shuffleQueue', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room || room.queue.length <= 1) return;

        const currentTrack = room.queue[room.currentTrackIndex];
        const remainingTracks = room.queue.filter((_, idx) => idx !== room.currentTrackIndex);

        for (let i = remainingTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
        }

        room.queue = currentTrack ? [currentTrack, ...remainingTracks] : remainingTracks;
        room.currentTrackIndex = currentTrack ? 0 : -1;

        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying,
          repeatMode: room.repeatMode
        });
      } catch (err) {
        console.error('Error shuffling queue:', err);
      }
    });

    socket.on('toggleRepeat', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const room = await Room.findById(roomId);
        if (!room) return;

        if (room.repeatMode === 'off') {
          room.repeatMode = 'track';
        } else if (room.repeatMode === 'track') {
          room.repeatMode = 'queue';
        } else {
          room.repeatMode = 'off';
        }

        await room.save();

        io.to(roomId).emit('queueUpdate', {
          queue: room.queue,
          currentTrackIndex: room.currentTrackIndex,
          currentStartedAt: room.currentStartedAt?.toISOString(),
          isPlaying: room.isPlaying,
          repeatMode: room.repeatMode
        });
      } catch (err) {
        console.error('Error toggling repeat:', err);
      }
    });

    socket.on('activateAudioSync', async () => {
      const roomId = socket.roomId;
      if (!roomId) return;
      
      try {
        const roomSockets = await io.in(roomId).fetchSockets();
        for (const s of roomSockets) {
          if (s.user._id === socket.user._id && s.id !== socket.id) {
            s.emit('deactivateAudioSync');
          }
        }
      } catch (err) {
        console.error('Error activating audio sync:', err);
      }
    });
  });

  return io;
};

const handleLeaveRoom = async (socket, io) => {
  const roomId = socket.roomId;
  if (!roomId) return;

  try {
    socket.leave(roomId);
    socket.roomId = null;

    const room = await Room.findById(roomId);
    if (!room) return;

    // Filter out user from participants
    room.participants = room.participants.filter(p => p.toString() !== socket.user._id);

    if (room.participants.length === 0) {
      await room.deleteOne();
      await LobbyMessage.deleteMany({ roomId });
    } else {
      if (room.owner.toString() === socket.user._id) {
        room.owner = room.participants[0];
      }
      await room.save();

      const populated = await Room.findById(roomId).populate('participants', 'username profilePicture firstName lastName');
      io.to(roomId).emit('presenceUpdate', populated.participants);
    }
  } catch (err) {
    console.error('Error handling leave room socket:', err);
  }
};

export { initSocket };
