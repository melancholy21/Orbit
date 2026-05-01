import express from 'express';
const router = express.Router();
import { getUserProfile, toggleFollow, searchUsers, updateStatus, getFriendsWithStatus, nudgeUser, getNotifications, updateProfilePicture } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/', protect, searchUsers);
router.put('/status', protect, updateStatus);
router.get('/friends/status', protect, getFriendsWithStatus);
router.get('/me/notifications', protect, getNotifications);
router.put('/me/profile-picture', protect, updateProfilePicture);
router.get('/:id', getUserProfile);
router.put('/:id/follow', protect, toggleFollow);
router.post('/:id/nudge', protect, nudgeUser);
export default router;
