import express from 'express';
import { login, callback, refreshToken } from '../controllers/spotifyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/login', protect, login);
router.get('/callback', callback);
router.get('/refresh_token', protect, refreshToken);

export default router;
