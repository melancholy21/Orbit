import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { onlineUsers } from '../socket.js';

const handleMentions = async (req, content, postId, commentId = null) => {
  try {
    const io = req.app.get('io');
    const notifiedUserIds = new Set();

    // 1. Process Markdown Mentions: @[username](userId)
    const markdownRegex = /@\[([^\]]+)\]\(([a-fA-F0-9]{24})\)/g;
    let mdMatch;
    while ((mdMatch = markdownRegex.exec(content)) !== null) {
      const targetUserId = mdMatch[2];
      if (targetUserId === req.user.id.toString()) continue;
      if (notifiedUserIds.has(targetUserId)) continue;

      notifiedUserIds.add(targetUserId);

      // Create notification
      const notif = await Notification.create({
        recipient: targetUserId,
        sender: req.user.id,
        type: 'mention',
        content: commentId ? 'mentioned you in a comment' : 'mentioned you in a post',
        post: postId
      });

      const receiverSocketId = onlineUsers.get(targetUserId);
      if (receiverSocketId && io) {
        const populatedNotif = await notif.populate('sender', 'username profilePicture firstName lastName');
        io.to(receiverSocketId).emit('newNotification', populatedNotif);
      }
    }

    // 2. Process Legacy Mentions: @username
    const legacyRegex = /\B@([a-zA-Z0-9._-]+)/g;
    const legacyUsernames = [];
    let legMatch;
    while ((legMatch = legacyRegex.exec(content)) !== null) {
      legacyUsernames.push(legMatch[1]);
    }

    if (legacyUsernames.length > 0) {
      const uniqueUsernames = [...new Set(legacyUsernames)];
      const legacyUsers = await User.find({ username: { $in: uniqueUsernames } });
      for (const targetUser of legacyUsers) {
        const targetUserId = targetUser._id.toString();
        if (targetUserId === req.user.id.toString()) continue;
        if (notifiedUserIds.has(targetUserId)) continue;

        notifiedUserIds.add(targetUserId);

        const notif = await Notification.create({
          recipient: targetUser._id,
          sender: req.user.id,
          type: 'mention',
          content: commentId ? 'mentioned you in a comment' : 'mentioned you in a post',
          post: postId
        });

        const receiverSocketId = onlineUsers.get(targetUserId);
        if (receiverSocketId && io) {
          const populatedNotif = await notif.populate('sender', 'username profilePicture firstName lastName');
          io.to(receiverSocketId).emit('newNotification', populatedNotif);
        }
      }
    }
  } catch (err) {
    console.error('Failed to process mentions:', err);
  }
};

export const createPost = async (req, res, next) => {
  try {
    const { content, image, visibility } = req.body;

    if (!content) {
      res.status(400);
      throw new Error('Please add some text!');
    }

    const post = await Post.create({
      author: req.user.id,
      content,
      image,
      visibility: visibility || 'friends'
    });

    // Process mentions asynchronously
    handleMentions(req, content, post._id);

    const populatedPost = await Post.findById(post._id).populate('author', 'username profilePicture firstName lastName');
    res.status(201).json(populatedPost);
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  try {
    const friendIds = req.user.friends.map(id => id.toString());
    const followingIds = req.user.following.map(id => id.toString());

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Fallback to 50 for backward compatibility
    const skip = (page - 1) * limit;

    // Facebook-style visibility rules:
    // 1. My own posts
    // 2. Posts authored by my friends (both friends and public visibility)
    // 3. Posts authored by people I follow that are Public
    // 4. Posts reposted (shared) by my friends
    const query = {
      $or: [
        { author: req.user.id },
        { author: { $in: friendIds } },
        { author: { $in: followingIds }, visibility: 'public' },
        { shares: { $in: friendIds } },
        { visibility: 'public' }
      ]
    };

    const posts = await Post.find(query)
      .populate('author', 'username profilePicture status location firstName lastName')
      .populate('shares', 'username profilePicture firstName lastName')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username profilePicture firstName lastName' },
          { path: 'replies.author', select: 'username profilePicture firstName lastName' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
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

    // Process mentions asynchronously
    handleMentions(req, content, post._id, comment._id);

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

    const { content, image, visibility } = req.body;
    if (!content || !content.trim()) {
      res.status(400);
      throw new Error('Post content cannot be empty');
    }

    post.content = content;
    // Allow removing or updating image — if image key is present in body, update it
    if (image !== undefined) {
      post.image = image;
    }
    if (visibility !== undefined) {
      post.visibility = visibility;
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

    // Process mentions asynchronously
    handleMentions(req, content, comment.post, comment._id);

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
    const targetUserId = req.params.userId;
    const isMe = req.user.id === targetUserId;
    const isFriend = req.user.friends.some(id => id.toString() === targetUserId);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Fallback to 50 for backward compatibility
    const skip = (page - 1) * limit;

    let query = {};
    if (isMe || isFriend) {
      // Show all posts authored or shared by this user
      query = {
        $or: [
          { author: targetUserId },
          { shares: targetUserId }
        ]
      };
    } else {
      // Only show public posts authored or shared by this user
      query = {
        $or: [
          { author: targetUserId, visibility: 'public' },
          { shares: targetUserId, visibility: 'public' }
        ]
      };
    }

    const posts = await Post.find(query)
      .populate('author', 'username profilePicture status location firstName lastName')
      .populate('shares', 'username profilePicture firstName lastName')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username profilePicture firstName lastName' },
          { path: 'replies.author', select: 'username profilePicture firstName lastName' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username profilePicture status location firstName lastName')
      .populate('shares', 'username profilePicture firstName lastName')
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

    const userIdStr = req.user.id.toString();
    const hasShared = post.shares.some(id => id.toString() === userIdStr);

    if (hasShared) {
      // Undo Repost
      post.shares = post.shares.filter(id => id.toString() !== userIdStr);
      await Notification.deleteMany({
        recipient: post.author,
        sender: req.user.id,
        type: 'share',
        post: post._id
      });
    } else {
      // Repost
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
    }

    await post.save();
    res.status(200).json(post.shares);
  } catch (error) {
    next(error);
  }
};

export const editComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    if (comment.author.toString() !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized to edit this comment');
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400);
      throw new Error('Comment content cannot be empty');
    }

    comment.content = content;
    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('replies.author', 'username profilePicture firstName lastName');

    res.status(200).json(populatedComment);
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    // Check if user is comment author OR post author
    const post = await Post.findById(comment.post);
    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isPostAuthor = post && post.author.toString() === req.user.id;

    if (!isCommentAuthor && !isPostAuthor) {
      res.status(401);
      throw new Error('User not authorized to delete this comment');
    }

    // Remove comment ID from Post's comments array
    if (post) {
      post.comments = post.comments.filter(id => id.toString() !== comment._id.toString());
      await post.save();
    }

    await comment.deleteOne();

    res.status(200).json({ commentId: req.params.commentId, postId: comment.post });
  } catch (error) {
    next(error);
  }
};

export const editReply = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      res.status(404);
      throw new Error('Reply not found');
    }

    if (reply.author.toString() !== req.user.id) {
      res.status(401);
      throw new Error('User not authorized to edit this reply');
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400);
      throw new Error('Reply content cannot be empty');
    }

    reply.content = content;
    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('replies.author', 'username profilePicture firstName lastName');

    res.status(200).json(populatedComment);
  } catch (error) {
    next(error);
  }
};

export const deleteReply = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      res.status(404);
      throw new Error('Reply not found');
    }

    // Authorized if user is reply author OR comment author OR post author
    const post = await Post.findById(comment.post);
    const isReplyAuthor = reply.author.toString() === req.user.id;
    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isPostAuthor = post && post.author.toString() === req.user.id;

    if (!isReplyAuthor && !isCommentAuthor && !isPostAuthor) {
      res.status(401);
      throw new Error('User not authorized to delete this reply');
    }

    comment.replies = comment.replies.filter(r => r._id.toString() !== req.params.replyId);
    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('replies.author', 'username profilePicture firstName lastName');

    res.status(200).json(populatedComment);
  } catch (error) {
    next(error);
  }
};
