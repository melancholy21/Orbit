import express from 'express';
import { getConversations, getMessages, sendMessage, editMessage, deleteMessage, markAsRead } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.get('/:userId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/:userId/read', protect, markAsRead);
router.put('/:messageId', protect, editMessage);
router.delete('/:messageId', protect, deleteMessage);

export default router;
