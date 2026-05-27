import express from 'express';
const router = express.Router();
import { registerUser, loginUser, getMe, verifyEmail, resendVerificationCode } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-code', resendVerificationCode);
router.get('/me', protect, getMe);

export default router;
