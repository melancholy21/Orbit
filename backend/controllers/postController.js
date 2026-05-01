import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

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

    const populatedPost = await Post.findById(post._id).populate('author', 'username profilePicture');
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
      .populate('author', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'username profilePicture' },
          { path: 'replies.author', select: 'username profilePicture' }
        ]
      })
      .sort({ createdAt: -1 });
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

    const populatedComment = await Comment.findById(comment._id).populate('author', 'username profilePicture');

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
      .populate('author', 'username profilePicture')
      .populate('replies.author', 'username profilePicture');

    res.status(201).json(populatedComment);
  } catch (error) {
    next(error);
  }
};


