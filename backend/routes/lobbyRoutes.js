import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Room from '../models/Room.js';

const router = express.Router();

// GET /api/lobby/presence — who's in any lobby (for Home page banner)
router.get('/presence', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false }).populate('participants', 'username profilePicture');
    const users = [];
    const seen = new Set();
    
    for (const room of rooms) {
      if (room.participants) {
        for (const p of room.participants) {
          const pIdStr = p._id.toString();
          if (!seen.has(pIdStr)) {
            seen.add(pIdStr);
            users.push({
              userId: p._id,
              username: p.username,
              profilePicture: p.profilePicture,
              mode: 'active'
            });
          }
        }
      }
    }
    
    res.json({ users, count: users.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
