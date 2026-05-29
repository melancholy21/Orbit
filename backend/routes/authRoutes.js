import express from 'express';
const router = express.Router();
import { registerUser, loginUser, getMe, verifyEmail, resendVerificationCode, logoutUser } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { registerSchema, loginSchema, verifyEmailSchema } from '../validation/authValidation.js';

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/logout', logoutUser);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-code', resendVerificationCode);
router.get('/me', protect, getMe);

export default router;
