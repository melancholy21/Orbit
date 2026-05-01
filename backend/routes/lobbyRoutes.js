import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { lobbyUsers } from '../socket.js';

const router = express.Router();

// GET /api/lobby/presence — who's in the lobby (for Home page banner)
router.get('/presence', protect, (req, res) => {
  const users = [];
  const seen = new Set();
  for (const [, userData] of lobbyUsers) {
    if (!seen.has(userData.userId)) {
      seen.add(userData.userId);
      users.push({
        userId: userData.userId,
        username: userData.username,
        profilePicture: userData.profilePicture,
        mode: userData.mode
      });
    }
  }
  res.json({ users, count: users.length });
});

export default router;
