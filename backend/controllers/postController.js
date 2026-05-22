import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import { onlineUsers } from '../socket.js';

export const createPost = async (req, res, next) => {
  try {
    const { content, image } = req.body;

    if (!content) {
      res.status(400);
      throw new Error('Please add some text!');
    }

    const post = await Post.create({
      author: req.user.id,
      content,
      image
    });

    const populatedPost = await Post.findById(post._id).populate('author', 'username profilePicture firstName lastName');
    res.status(201).json(populatedPost);
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  try {
    const followingIds = req.user.following.map(id => id.toString());
    const authorIds = [req.user.id, ...followingIds];

    const posts = await Post.find({ author: { $in: authorIds } })
      .populate('author', 'username profilePicture status location firstName lastName')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username profilePicture firstName lastName' },
          { path: 'replies.author', select: 'username profilePicture firstName lastName' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

export const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Post not found!');
    }

    if (post.likes.includes(req.user.id)) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== req.user.id.toString());
    } else {
      // Like
      post.likes.push(req.user.id);
      
      // Create notification if liking someone else's post
      if (post.author.toString() !== req.user.id) {
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.user.id,
          type: 'like',
          content: 'liked your post',
          post: post._id
        });

        // Emit real-time notification
        const io = req.app.get('io');
        const receiverSocketId = onlineUsers.get(post.author.toString());
        if (receiverSocketId && io) {
          const populatedNotif = await notif.populate('sender', 'username profilePicture firstName lastName');
          io.to(receiverSocketId).emit('newNotification', populatedNotif);
        }
      }
    }

    await post.save();
    res.status(200).json(post.likes);
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      res.status(400);
      throw new Error('Please add some comment!');
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.user.id,
      content
    });

    post.comments.push(comment._id);
    await post.save();

    // Create notification if commenting on someone else's post
    if (post.author.toString() !== req.user.id) {
      const notif = await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        content: 'commented on your post',
        post: post._id
      });

      // Emit real-time notification
      const io = req.app.get('io');
      const receiverSocketId = onlineUsers.get(post.author.toString());
      if (receiverSocketId && io) {
        const populatedNotif = await notif.populate('sender', 'username profilePicture firstName lastName');
        io.to(receiverSocketId).emit('newNotification', populatedNotif);
      }
    }

    const populatedComment = await Comment.findById(comment._id).populate('author', 'username profilePicture firstName lastName');

    res.status(201).json(populatedComment);
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized to delete this post');
    }

    // Optional: Delete comments associated with post
    await Comment.deleteMany({ post: post._id });

    await post.deleteOne();

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
};

export const editPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    if (post.author.toString() !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized to edit this post');
    }

    const { content, image } = req.body;
    if (!content || !content.trim()) {
      res.status(400);
      throw new Error('Post content cannot be empty');
    }

    post.content = content;
    // Allow removing or updating image — if image key is present in body, update it
    if (image !== undefined) {
      post.image = image;
    }
    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username profilePicture firstName lastName' },
          { path: 'replies.author', select: 'username profilePicture firstName lastName' }
        ]
      });

    res.status(200).json(updatedPost);
  } catch (error) {
    next(error);
  }
};

export const replyToComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      res.status(400);
      throw new Error('Please add reply content');
    }

    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    const reply = {
      author: req.user.id,
      content
    };

    comment.replies.push(reply);
    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('replies.author', 'username profilePicture firstName lastName');

    res.status(201).json(populatedComment);
  } catch (error) {
    next(error);
  }
};


export const getUserPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({
      $or: [
        { author: req.params.userId },
        { shares: req.params.userId }
      ]
    })
      .populate('author', 'username profilePicture status location firstName lastName')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username profilePicture firstName lastName' },
          { path: 'replies.author', select: 'username profilePicture firstName lastName' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username profilePicture status location firstName lastName')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username profilePicture firstName lastName' },
          { path: 'replies.author', select: 'username profilePicture firstName lastName' }
        ]
      });

    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

export const sharePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    if (!post.shares.includes(req.user.id)) {
      post.shares.push(req.user.id);
      
      // Notify author
      if (post.author.toString() !== req.user.id) {
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.user.id,
          type: 'share',
          content: 'shared your post',
          post: post._id
        });

        const io = req.app.get('io');
        const receiverSocketId = onlineUsers.get(post.author.toString());
        if (receiverSocketId && io) {
          const populatedNotif = await notif.populate('sender', 'username profilePicture');
          io.to(receiverSocketId).emit('newNotification', populatedNotif);
        }
      }
      
      await post.save();
    }

    res.status(200).json(post.shares);
  } catch (error) {
    next(error);
  }
};
