import mongoose from 'mongoose';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { onlineUsers } from '../socket.js';

// Helper to clean up non-existent user IDs from relationship arrays asynchronously in the background
const cleanUserRelationships = (user) => {
  const allIds = [
    ...(user.followers || []),
    ...(user.following || []),
    ...(user.friends || []),
    ...(user.friendRequestsSent || []),
    ...(user.friendRequestsReceived || [])
  ];

  if (allIds.length === 0) return user;

  // Execute database checks and updates in the background
  Promise.resolve().then(async () => {
    try {
      const existingUsers = await User.find({ _id: { $in: allIds } }).select('_id');
      const existingIdsSet = new Set(existingUsers.map(u => u._id.toString()));

      let hasChanges = false;
      const cleanList = (list) => {
        if (!list) return [];
        const filtered = list.filter(id => existingIdsSet.has(id.toString()));
        if (filtered.length !== list.length) {
          hasChanges = true;
        }
        return filtered;
      };

      // Dry run on current parameter object to detect changes
      cleanList(user.followers);
      cleanList(user.following);
      cleanList(user.friends);
      cleanList(user.friendRequestsSent);
      cleanList(user.friendRequestsReceived);

      if (hasChanges) {
        // Fetch fresh copy to avoid VersionError due to concurrent updates
        const freshUser = await User.findById(user._id);
        if (freshUser) {
          freshUser.followers = cleanList(freshUser.followers);
          freshUser.following = cleanList(freshUser.following);
          freshUser.friends = cleanList(freshUser.friends);
          freshUser.friendRequestsSent = cleanList(freshUser.friendRequestsSent);
          freshUser.friendRequestsReceived = cleanList(freshUser.friendRequestsReceived);
          await freshUser.save();
        }
      }
    } catch (error) {
      console.error('Failed to clean user relationships in background:', error);
    }
  });

  return user;
};

export const getUserProfile = async (req, res, next) => {
  try {
    let user;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      user = await User.findById(req.params.id);
    } else {
      const escapedUsername = req.params.id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      user = await User.findOne({ username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } });
    }

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    user = await cleanUserRelationships(user);

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.spotifyAccessToken;
    delete userObj.spotifyRefreshToken;
    delete userObj.spotifyTokenExpiry;
    delete userObj.email;
    delete userObj.loginAttempts;
    delete userObj.lockUntil;

    res.status(200).json(userObj);
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

      // Create Notification
      const notif = await Notification.create({
        recipient: userToFollow.id,
        sender: currentUser.id,
        type: 'follow',
        content: 'started following you'
      });

      // Emit real-time notification
      const io = req.app.get('io');
      const receiverSocketId = onlineUsers.get(userToFollow.id.toString());
      if (receiverSocketId && io) {
        const populatedNotif = await notif.populate('sender', 'username profilePicture firstName lastName');
        io.to(receiverSocketId).emit('newNotification', populatedNotif);
      }
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
    let keyword = {};
    if (req.query.search) {
      const searchVal = req.query.search.trim();
      const searchTerms = searchVal.split(/\s+/);
      
      keyword = {
        $or: [
          { username: { $regex: searchVal, $options: 'i' } },
          { firstName: { $regex: searchVal, $options: 'i' } },
          { lastName: { $regex: searchVal, $options: 'i' } },
          {
            $and: searchTerms.map(term => ({
              $or: [
                { firstName: { $regex: term, $options: 'i' } },
                { lastName: { $regex: term, $options: 'i' } }
              ]
            }))
          }
        ]
      };
    }

    const users = await User.find({ ...keyword, _id: { $ne: req.user._id } }).select('-password -spotifyAccessToken -spotifyRefreshToken -spotifyTokenExpiry -email -loginAttempts -lockUntil');
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
    }).select('username profilePicture status firstName lastName');

    const friendsWithOnline = friends.map(f => ({
      ...f.toObject(),
      isOnline: onlineUsers.has(f._id.toString())
    }));

    res.status(200).json(friendsWithOnline);
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

    // Emit real-time notification
    const io = req.app.get('io');
    const receiverSocketId = onlineUsers.get(recipientId.toString());
    if (receiverSocketId && io) {
      const populatedNotif = await notification.populate('sender', 'username profilePicture firstName lastName');
      io.to(receiverSocketId).emit('newNotification', populatedNotif);
    }

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

export const updateProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { profilePicture } = req.body;
    user.profilePicture = profilePicture;
    await user.save();

    res.status(200).json({ profilePicture: user.profilePicture });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { bio, location, website, firstName, lastName, isOnboarded, profilePicture, coverPicture, spotifyAccessToken } = req.body;
    
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (isOnboarded !== undefined) user.isOnboarded = isOnboarded;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (coverPicture !== undefined) user.coverPicture = coverPicture;
    if (spotifyAccessToken !== undefined) user.spotifyAccessToken = spotifyAccessToken || '';

    await user.save();
    
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      coverPicture: user.coverPicture,
      firstName: user.firstName,
      lastName: user.lastName,
      isOnboarded: user.isOnboarded,
      bio: user.bio,
      location: user.location,
      website: user.website,
      followers: user.followers,
      following: user.following,
      friends: user.friends,
      friendRequestsSent: user.friendRequestsSent,
      friendRequestsReceived: user.friendRequestsReceived,
      status: user.status,
      spotifyAccessToken: user.spotifyAccessToken
    });
  } catch (error) {
    next(error);
  }
};

export const sendFriendRequest = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      res.status(400);
      throw new Error('Cannot send friend request to yourself');
    }

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser || !currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    if (currentUser.friends.includes(targetUser.id)) {
      res.status(400);
      throw new Error('Already friends');
    }

    if (targetUser.friendRequestsReceived.includes(currentUser.id)) {
      res.status(400);
      throw new Error('Friend request already sent');
    }

    // Add to requests
    targetUser.friendRequestsReceived.push(currentUser.id);
    currentUser.friendRequestsSent.push(targetUser.id);

    // Create Notification
    const notif = await Notification.create({
      recipient: targetUser.id,
      sender: currentUser.id,
      type: 'friend_request',
      content: 'sent you a friend request'
    });

    const io = req.app.get('io');
    const receiverSocketId = onlineUsers.get(targetUser.id.toString());
    if (receiverSocketId && io) {
      const populatedNotif = await notif.populate('sender', 'username profilePicture');
      io.to(receiverSocketId).emit('newNotification', populatedNotif);
    }

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: 'Friend request sent' });
  } catch (error) {
    next(error);
  }
};

export const acceptFriendRequest = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser || !currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    if (!currentUser.friendRequestsReceived.includes(targetUserId)) {
      res.status(400);
      throw new Error('No friend request from this user');
    }

    // Remove from requests
    currentUser.friendRequestsReceived = currentUser.friendRequestsReceived.filter(id => id.toString() !== targetUserId.toString());
    targetUser.friendRequestsSent = targetUser.friendRequestsSent.filter(id => id.toString() !== currentUser.id.toString());

    // Add to friends
    if (!currentUser.friends.includes(targetUserId)) {
      currentUser.friends.push(targetUserId);
    }
    if (!targetUser.friends.includes(currentUser.id)) {
      targetUser.friends.push(currentUser.id);
    }

    // Auto-follow each other
    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUser.id);
    }
    if (!targetUser.following.includes(currentUser.id)) {
      targetUser.following.push(currentUser.id);
      currentUser.followers.push(targetUserId);
    }

    // Create Notification
    const notif = await Notification.create({
      recipient: targetUser.id,
      sender: currentUser.id,
      type: 'friend_accept',
      content: 'accepted your friend request'
    });

    const io = req.app.get('io');
    const receiverSocketId = onlineUsers.get(targetUser.id.toString());
    if (receiverSocketId && io) {
      const populatedNotif = await notif.populate('sender', 'username profilePicture');
      io.to(receiverSocketId).emit('newNotification', populatedNotif);
    }

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
};

export const removeFriend = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser || !currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    currentUser.friends = currentUser.friends.filter(id => id.toString() !== targetUserId.toString());
    targetUser.friends = targetUser.friends.filter(id => id.toString() !== currentUser.id.toString());

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: 'Friend removed' });
  } catch (error) {
    next(error);
  }
};

export const cancelFriendRequest = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser || !currentUser) {
      res.status(404);
      throw new Error('User not found');
    }

    // Remove from requests arrays
    currentUser.friendRequestsSent = (currentUser.friendRequestsSent || []).filter(
      id => id.toString() !== targetUserId.toString()
    );
    targetUser.friendRequestsReceived = (targetUser.friendRequestsReceived || []).filter(
      id => id.toString() !== currentUser.id.toString()
    );

    // Delete the friend request notification
    await Notification.deleteOne({
      recipient: targetUserId,
      sender: req.user.id,
      type: 'friend_request'
    });

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: 'Friend request cancelled' });
  } catch (error) {
    next(error);
  }
};


export const getFollowers = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user = await cleanUserRelationships(user);
    const populated = await user.populate('followers', 'username profilePicture bio');
    res.status(200).json(populated.followers);
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user = await cleanUserRelationships(user);
    const populated = await user.populate('following', 'username profilePicture bio');
    res.status(200).json(populated.following);
  } catch (error) {
    next(error);
  }
};

export const getFriendsList = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    user = await cleanUserRelationships(user);
    const populated = await user.populate('friends', 'username profilePicture bio');
    res.status(200).json(populated.friends);
  } catch (error) {
    next(error);
  }
};

export const getSuggestedUsers = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    if (totalUsers <= 5) {
      return res.status(200).json([]);
    }

    const currentUser = await User.findById(req.user.id);
    const excludeIds = [
      req.user.id,
      ...currentUser.friends.map(id => id.toString()),
      ...currentUser.friendRequestsSent.map(id => id.toString()),
      ...currentUser.friendRequestsReceived.map(id => id.toString())
    ];

    const suggestions = await User.find({
      _id: { $nin: excludeIds }
    })
      .select('username profilePicture bio followers firstName lastName')
      .limit(10);

    res.status(200).json(suggestions);
  } catch (error) {
    next(error);
  }
};
