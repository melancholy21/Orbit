import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import LobbyMessage from './models/LobbyMessage.js';

// In-memory lobby state
const lobbyUsers = new Map(); // oderId -> { userId, username, profilePicture, mode, joinedAt, lastActivity }
let mediaQueue = [];
let currentTrackIndex = -1;
let currentStartedAt = null;
let isPlaying = false;

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
    console.log(`🔌 ${socket.user.username} connected`);

    // ============ PRESENCE ============

    socket.on('joinLobby', ({ mode = 'active' }) => {
      const userData = {
        socketId: socket.id,
        userId: socket.user._id,
        username: socket.user.username,
        profilePicture: socket.user.profilePicture,
        mode, // 'active' or 'lurker'
        joinedAt: new Date(),
        lastActivity: new Date()
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
        isPlaying
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
      handleLeave(socket, io);
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

    socket.on('trackEnded', () => {
      // Move to next track automatically
      if (currentTrackIndex < mediaQueue.length - 1) {
        currentTrackIndex++;
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
        isPlaying
      });
    });

    socket.on('requestSync', () => {
      socket.emit('syncResponse', {
        queue: mediaQueue,
        currentTrackIndex,
        currentStartedAt: currentStartedAt?.toISOString(),
        isPlaying
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
        isPlaying
      });
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

  io.to('lobby').emit('presenceUpdate', getLobbyUsersList());
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
        joinedAt: userData.joinedAt
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
