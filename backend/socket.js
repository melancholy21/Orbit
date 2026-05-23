import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import LobbyMessage from './models/LobbyMessage.js';

// In-memory global online users
export const onlineUsers = new Map(); // userId -> socket.id

// In-memory lobby state
const lobbyUsers = new Map(); // socket.id -> { userId, username, ... }
let lobbyOwnerId = null;
let mediaQueue = [];
let currentTrackIndex = -1;
let currentStartedAt = null;
let isPlaying = false;
let lastAdvancedAt = 0;
let repeatMode = 'off'; // 'off' | 'track' | 'queue'

// Sleep timer: 30 minutes of inactivity
const SLEEP_TIMEOUT = 30 * 60 * 1000;
const sleepTimers = new Map();

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

    // ============ PRESENCE ============

    socket.on('joinLobby', ({ mode = 'active' } = {}) => {
      const isFirst = lobbyUsers.size === 0;
      if (isFirst || !lobbyOwnerId) {
        lobbyOwnerId = socket.id;
      }

      const userData = {
        socketId: socket.id,
        userId: socket.user._id,
        username: socket.user.username,
        profilePicture: socket.user.profilePicture,
        mode, // 'active' or 'lurker'
        joinedAt: new Date(),
        lastActivity: new Date(),
        isOwner: lobbyOwnerId === socket.id
      };

      lobbyUsers.set(socket.id, userData);
      socket.join('lobby');

      // Reset sleep timer
      resetSleepTimer(socket, io);

      // Broadcast updated presence
      io.to('lobby').emit('presenceUpdate', getLobbyUsersList());

      // Send current state to the joining user
      socket.emit('lobbyState', {
        users: getLobbyUsersList(),
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt ? currentStartedAt.toISOString() : null,
        isPlaying,
        repeatMode
      });

      // Send recent chat history (last 50 messages)
      LobbyMessage.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'username profilePicture')
        .then(messages => {
          socket.emit('chatHistory', messages.reverse());
        })
        .catch(() => {});
    });

    socket.on('updateMode', ({ mode }) => {
      const user = lobbyUsers.get(socket.id);
      if (user) {
        user.mode = mode;
        user.lastActivity = new Date();
        resetSleepTimer(socket, io);
        io.to('lobby').emit('presenceUpdate', getLobbyUsersList());
      }
    });

    socket.on('leaveLobby', () => {
      handleLeave(socket, io);
    });

    socket.on('disconnect', () => {
      console.log(`❌ ${socket.user.username} disconnected`);
      onlineUsers.delete(socket.user._id);
      handleLeave(socket, io);
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

    // ============ CHAT ============

    socket.on('sendMessage', async ({ text }) => {
      if (!text || !text.trim()) return;

      const user = lobbyUsers.get(socket.id);
      if (user) {
        user.lastActivity = new Date();
        resetSleepTimer(socket, io);
      }

      try {
        const msg = await LobbyMessage.create({
          sender: socket.user._id,
          text: text.trim()
        });

        const populated = await msg.populate('sender', 'username profilePicture');

        io.to('lobby').emit('newMessage', {
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

    socket.on('addToQueue', ({ url, title }) => {
      if (!url) return;

      const user = lobbyUsers.get(socket.id);
      if (user) {
        user.lastActivity = new Date();
        resetSleepTimer(socket, io);
      }

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

      mediaQueue.push(item);

      // If nothing is playing, start this track
      if (currentTrackIndex === -1 || !isPlaying) {
        currentTrackIndex = mediaQueue.length - 1;
        currentStartedAt = new Date();
        isPlaying = true;
      }

      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying
      });
    });

    socket.on('skipTrack', () => {
      if (mediaQueue.length === 0) return;

      if (currentTrackIndex < mediaQueue.length - 1) {
        currentTrackIndex++;
        currentStartedAt = new Date();
        isPlaying = true;
      } else {
        // End of queue
        isPlaying = false;
        currentStartedAt = null;
      }

      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying
      });
    });

    socket.on('previousTrack', () => {
      if (mediaQueue.length === 0) return;

      if (currentTrackIndex > 0) {
        currentTrackIndex--;
        currentStartedAt = new Date();
        isPlaying = true;
      }

      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying
      });
    });

    socket.on('togglePlay', () => {
      if (mediaQueue.length === 0 || currentTrackIndex === -1) return;
      
      isPlaying = !isPlaying;
      
      // If we are resuming, we should ideally adjust currentStartedAt, but for simplicity we just broadcast isPlaying
      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying
      });
    });

    socket.on('trackEnded', () => {
      // Debounce checks to prevent rapid skips if multiple clients call it
      const now = Date.now();
      if (now - lastAdvancedAt < 4000) return;
      lastAdvancedAt = now;

      if (repeatMode === 'track') {
        // loop 1 time
        currentStartedAt = new Date();
        isPlaying = true;
      } else if (currentTrackIndex < mediaQueue.length - 1) {
        currentTrackIndex++;
        currentStartedAt = new Date();
        isPlaying = true;
      } else if (repeatMode === 'queue') {
        // loop entirely
        currentTrackIndex = 0;
        currentStartedAt = new Date();
        isPlaying = true;
      } else {
        isPlaying = false;
        currentStartedAt = null;
      }

      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying,
        repeatMode
      });
    });

    socket.on('requestSync', () => {
      socket.emit('syncResponse', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying,
        repeatMode
      });
    });

    socket.on('clearQueue', () => {
      mediaQueue = [];
      currentTrackIndex = -1;
      currentStartedAt = null;
      isPlaying = false;

      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: null,
        isPlaying,
        repeatMode
      });
    });

    socket.on('shuffleQueue', () => {
      if (mediaQueue.length <= 1) return;
      
      const currentTrack = mediaQueue[currentTrackIndex];
      const remainingTracks = mediaQueue.filter((_, idx) => idx !== currentTrackIndex);
      
      for (let i = remainingTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
      }
      
      mediaQueue = currentTrack ? [currentTrack, ...remainingTracks] : remainingTracks;
      currentTrackIndex = currentTrack ? 0 : -1;
      
      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying,
        repeatMode
      });
    });

    socket.on('toggleRepeat', () => {
      if (repeatMode === 'off') {
        repeatMode = 'track';
      } else if (repeatMode === 'track') {
        repeatMode = 'queue';
      } else {
        repeatMode = 'off';
      }
      
      io.to('lobby').emit('queueUpdate', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying,
        repeatMode
      });
    });

    socket.on('activateAudioSync', () => {
      for (const [sid, userData] of lobbyUsers) {
        if (userData.userId === socket.user._id && sid !== socket.id) {
          io.to(sid).emit('deactivateAudioSync');
        }
      }
    });
  });

  return io;
};

function handleLeave(socket, io) {
  lobbyUsers.delete(socket.id);
  socket.leave('lobby');

  // Clear sleep timer
  const timer = sleepTimers.get(socket.id);
  if (timer) {
    clearTimeout(timer);
    sleepTimers.delete(socket.id);
  }

  if (lobbyUsers.size === 0) {
    // Terminate lobby when empty
    mediaQueue = [];
    currentTrackIndex = -1;
    currentStartedAt = null;
    isPlaying = false;
    lobbyOwnerId = null;
    repeatMode = 'off';
    LobbyMessage.deleteMany({}).catch(err => console.error(err));
  } else if (lobbyOwnerId === socket.id) {
    // Pass ownership
    const nextOwnerSocketId = lobbyUsers.keys().next().value;
    lobbyOwnerId = nextOwnerSocketId;
    const nextOwner = lobbyUsers.get(nextOwnerSocketId);
    if (nextOwner) {
      nextOwner.isOwner = true;
    }
  }

  io.to('lobby').emit('presenceUpdate', getLobbyUsersList());
  
  if (lobbyUsers.size === 0) {
    io.to('lobby').emit('queueUpdate', {
      queue: mediaQueue,
      currentTrackIndex,
      currentStartedAt: null,
      isPlaying: false
    });
  }
}

function getLobbyUsersList() {
  const users = [];
  const seen = new Set();
  for (const [, userData] of lobbyUsers) {
    // Dedupe by userId (user might have multiple tabs)
    if (!seen.has(userData.userId)) {
      seen.add(userData.userId);
      users.push({
        userId: userData.userId,
        username: userData.username,
        profilePicture: userData.profilePicture,
        mode: userData.mode,
        joinedAt: userData.joinedAt,
        isOwner: lobbyOwnerId === userData.socketId
      });
    }
  }
  return users;
}

function resetSleepTimer(socket, io) {
  const existing = sleepTimers.get(socket.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    console.log(`😴 ${socket.user.username} auto-disconnected (sleep timer)`);
    socket.emit('sleepTimeout');
    handleLeave(socket, io);
    socket.disconnect(true);
  }, SLEEP_TIMEOUT);

  sleepTimers.set(socket.id, timer);
}

export { initSocket, lobbyUsers };
