import express from 'express';
const router = express.Router();
import { getUserProfile, toggleFollow, searchUsers, updateStatus, getFriendsWithStatus, nudgeUser, getNotifications } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/', protect, searchUsers);
router.get('/:id', getUserProfile);
router.put('/:id/follow', protect, toggleFollow);
router.put('/status', protect, updateStatus);
router.get('/friends/status', protect, getFriendsWithStatus);
router.post('/:id/nudge', protect, nudgeUser);
router.get('/me/notifications', protect, getNotifications);
export default router;
