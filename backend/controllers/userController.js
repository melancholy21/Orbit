import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const toggleFollow = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      res.status(400);
      throw new Error('You cannot follow yourself');
    }

    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow || !currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    if (currentUser.following.includes(userToFollow.id)) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== userToFollow.id.toString());
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== currentUser.id.toString());
    } else {
      // Follow
      currentUser.following.push(userToFollow.id);
      userToFollow.followers.push(currentUser.id);
    }

    await currentUser.save();
    await userToFollow.save();

    res.status(200).json({ following: currentUser.following });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const keyword = req.query.search ? {
      username: {
        $regex: req.query.search,
        $options: 'i'
      }
    } : {};

    const users = await User.find({ ...keyword, _id: { $ne: req.user._id } }).select('-password');
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { isFree, emoji, text, expiresAt } = req.body;
    
    user.status = {
      isFree: isFree !== undefined ? isFree : user.status?.isFree,
      emoji: emoji !== undefined ? emoji : user.status?.emoji,
      text: text !== undefined ? text : user.status?.text,
      expiresAt: expiresAt !== undefined ? expiresAt : user.status?.expiresAt
    };

    await user.save();
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const getFriendsWithStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Get everyone user follows AND everyone following user (friends)
    const friendIds = [...new Set([...user.following.map(id => id.toString()), ...user.followers.map(id => id.toString())])];

    const friends = await User.find({
      _id: { $in: friendIds }
    }).select('username profilePicture status');

    res.status(200).json(friends);
  } catch (error) {
    next(error);
  }
};

export const nudgeUser = async (req, res, next) => {
  try {
    const recipientId = req.params.id;
    if (recipientId === req.user.id) {
      res.status(400);
      throw new Error('Cannot nudge yourself');
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      res.status(404);
      throw new Error('User not found');
    }

    const notification = await Notification.create({
      recipient: recipientId,
      sender: req.user.id,
      type: 'nudge',
      content: 'nudged you!'
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profilePicture')
      .limit(20);
    
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};
