import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Please add all fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        email: user.email,
        following: user.following,
        friends: user.friends,
        friendRequestsSent: user.friendRequestsSent,
        friendRequestsReceived: user.friendRequestsReceived,
        profilePicture: user.profilePicture,
        firstName: user.firstName,
        lastName: user.lastName,
        isOnboarded: user.isOnboarded,
        spotifyAccessToken: user.spotifyAccessToken,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        username: user.username,
        email: user.email,
        following: user.following,
        friends: user.friends,
        friendRequestsSent: user.friendRequestsSent,
        friendRequestsReceived: user.friendRequestsReceived,
        profilePicture: user.profilePicture,
        firstName: user.firstName,
        lastName: user.lastName,
        isOnboarded: user.isOnboarded,
        spotifyAccessToken: user.spotifyAccessToken,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid credentials!');
    }
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};


