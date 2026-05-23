import express from 'express';
import { createRoom, getPublicRooms, joinRoom, leaveRoom, getActiveRoom } from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createRoom);
router.get('/public', protect, getPublicRooms);
router.get('/active', protect, getActiveRoom);
router.post('/:roomId/join', protect, joinRoom);
router.post('/:roomId/leave', protect, leaveRoom);

export default router;
