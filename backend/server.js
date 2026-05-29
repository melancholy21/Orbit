import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 20;
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { initSocket, onlineUsers } from './socket.js';

// Connect to database
connectDB();

const app = express();
const httpServer = http.createServer(app);

// CORS must be at the very top of the middleware stack
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://orbit-rouge-three.vercel.app',
      'https://siding-hug-slab.ngrok-free.dev',
      'http://localhost:5173'
    ].filter(Boolean).map(o => o.trim().replace(/\/$/, ''));

    const cleanOrigin = origin ? origin.trim().replace(/\/$/, '') : '';

    if (!origin || allowedOrigins.includes(cleanOrigin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true
}));

// Initialize Socket.io
const io = initSocket(httpServer);

// Security Middleware
app.use(helmet({
  frameguard: { action: 'deny' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      styleSrc: ["'unsafe-inline'"],
    }
  }
}));

// Rate Limiting
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
  app.set('trust proxy', 1); // Trust reverse proxy headers
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 1000 : 5000,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 100 : 500, // Stricter limit on auth routes
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Strict OTP rate limiter — prevents bot spam on email-sending endpoints
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isProd ? 3 : 20,     // 3 in production, relaxed for dev
  message: 'Too many verification requests from this IP. Please try again after 10 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/register', otpLimiter);
app.use('/api/auth/resend-code', otpLimiter);

// Middleware
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Make io accessible in routes
app.set('io', io);

import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import hangsRoutes from './routes/hangsRoutes.js';
import lobbyRoutes from './routes/lobbyRoutes.js';
import spotifyRoutes from './routes/spotifyRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import roomRoutes from './routes/roomRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/hangs', hangsRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rooms', roomRoutes);

// Health Check Endpoint (to prevent Render Free Tier spin-down)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is active' });
});

// Make uploads folder static
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, '/uploads'), { maxAge: '1d' }));

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => console.log(`Server started on port ${PORT}`));
