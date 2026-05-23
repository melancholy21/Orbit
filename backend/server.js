import dotenv from 'dotenv';
dotenv.config();
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 20;
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { initSocket, lobbyUsers } from './socket.js';

// Connect to database
connectDB();

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.io
const io = initSocket(httpServer);

// Security Middleware
app.use(helmet());

// Rate Limiting (Enabled only in Production)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust reverse proxy headers (Render, Vercel, Cloudflare)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, 
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/api', limiter);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Make io accessible in routes
app.set('io', io);

// Routes
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import hangsRoutes from './routes/hangsRoutes.js';
import lobbyRoutes from './routes/lobbyRoutes.js';
import spotifyRoutes from './routes/spotifyRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/hangs', hangsRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);

// Make uploads folder static
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`));
