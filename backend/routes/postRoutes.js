import express from 'express';
const router = express.Router();
import { createPost, getPosts, toggleLike, addComment, deletePost, editPost, replyToComment, getUserPosts } from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

router.route('/')
  .get(protect, getPosts)
  .post(protect, createPost);

router.delete('/:id', protect, deletePost);
router.put('/:id', protect, editPost);
router.put('/:id/like', protect, toggleLike);
router.post('/:id/comments', protect, addComment);
router.post('/comments/:commentId/reply', protect, replyToComment);
router.get('/user/:userId', protect, getUserPosts);

export default router;
