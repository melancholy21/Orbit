import express from 'express';
const router = express.Router();
import { createPost, getPosts, toggleLike, addComment, deletePost, editPost, replyToComment, getUserPosts, sharePost, getPostById, editComment, deleteComment, editReply, deleteReply } from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

router.route('/')
  .get(protect, getPosts)
  .post(protect, createPost);

router.get('/:id', protect, getPostById);
router.delete('/:id', protect, deletePost);
router.put('/:id', protect, editPost);
router.put('/:id/like', protect, toggleLike);
router.post('/:id/share', protect, sharePost);
router.post('/:id/comments', protect, addComment);
router.post('/comments/:commentId/reply', protect, replyToComment);

router.route('/comments/:commentId')
  .put(protect, editComment)
  .delete(protect, deleteComment);

router.route('/comments/:commentId/replies/:replyId')
  .put(protect, editReply)
  .delete(protect, deleteReply);

router.get('/user/:userId', protect, getUserPosts);

export default router;
