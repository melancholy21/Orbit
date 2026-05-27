import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import sendEmail from '../utils/sendEmail.js';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
};

// ─── Register User (Step 1: Save to PendingUser + Send OTP) ───────────────────
export const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Please add all fields');
    }

    // Check if user already exists in the main User table
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Hash the password before storing in the temporary collection
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create or overwrite pending registration (upsert so re-registrations work)
    await PendingUser.findOneAndUpdate(
      { email },
      { username, password: hashedPassword, otp, expiresAt },
      { upsert: true, returnDocument: 'after' }
    );

    // Send OTP via email (or console fallback in dev)
    await sendEmail({
      email,
      subject: 'Orbit — Email Verification Code',
      message: `Your Orbit verification code is: ${otp}. It will expire in 15 minutes.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa;">
          <h2 style="color: #6d28d9; text-align: center; margin-bottom: 8px;">Welcome to Orbit 🚀</h2>
          <p style="color: #374151; text-align: center; font-size: 14px;">Use the code below to verify your email and complete registration:</p>
          <div style="background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%); padding: 18px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff; border-radius: 12px; margin: 24px 0;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">This code will expire in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    res.status(201).json({
      success: true,
      email,
      isVerified: false,
      message: 'Verification code sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Verify Email (Step 2: Validate OTP → Move to User table) ─────────────────
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400);
      throw new Error('Email and verification code are required');
    }

    const pendingRecord = await PendingUser.findOne({ email });

    if (!pendingRecord) {
      res.status(404);
      throw new Error('Registration session expired or not found. Please sign up again.');
    }

    // Validate OTP
    if (pendingRecord.otp !== code) {
      res.status(400);
      throw new Error('Invalid verification code');
    }

    // Check expiration (belt-and-suspenders — TTL handles this too)
    if (new Date() > pendingRecord.expiresAt) {
      res.status(400);
      throw new Error('Verification code has expired. Please request a new one.');
    }

    // Final guard: make sure nobody registered this email/username while OTP was pending
    const userExists = await User.findOne({
      $or: [{ email: pendingRecord.email }, { username: pendingRecord.username }],
    });
    if (userExists) {
      res.status(400);
      throw new Error('User or email already exists');
    }

    // Move to the main User collection
    // Password is already hashed in PendingUser — use a new document + save
    // with isNew but skip the password modification check
    const now = new Date();
    const user = new User({
      username: pendingRecord.username,
      email: pendingRecord.email,
      password: pendingRecord.password,
      createdAt: now,
      updatedAt: now,
    });
    // Mark password as NOT modified so the pre-save hook won't re-hash it
    user.markModified('password');
    user.isNew = true;
    // Use collection.insertOne to completely bypass Mongoose middleware
    await User.collection.insertOne(user.toObject());
    // Re-fetch to get proper Mongoose document with virtuals/defaults
    const savedUser = await User.findById(user._id);

    // Delete the pending record immediately
    await PendingUser.deleteOne({ email });

    res.status(200).json({
      _id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      following: savedUser.following,
      friends: savedUser.friends,
      friendRequestsSent: savedUser.friendRequestsSent,
      friendRequestsReceived: savedUser.friendRequestsReceived,
      profilePicture: savedUser.profilePicture,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      isOnboarded: savedUser.isOnboarded,
      spotifyAccessToken: savedUser.spotifyAccessToken,
      token: generateToken(savedUser._id),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Resend Verification Code ─────────────────────────────────────────────────
export const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    const pendingRecord = await PendingUser.findOne({ email });

    if (!pendingRecord) {
      res.status(404);
      throw new Error('No pending registration found for this email. Please sign up again.');
    }

    // Generate a fresh OTP and reset expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    pendingRecord.otp = otp;
    pendingRecord.expiresAt = expiresAt;
    await pendingRecord.save();

    // Send new OTP
    await sendEmail({
      email,
      subject: 'Orbit — New Verification Code',
      message: `Your new Orbit verification code is: ${otp}. It will expire in 15 minutes.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #fafafa;">
          <h2 style="color: #6d28d9; text-align: center; margin-bottom: 8px;">New Verification Code</h2>
          <p style="color: #374151; text-align: center; font-size: 14px;">Here's your fresh code to verify your Orbit account:</p>
          <div style="background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%); padding: 18px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff; border-radius: 12px; margin: 24px 0;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">This code will expire in 15 minutes.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'New verification code sent.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login User ───────────────────────────────────────────────────────────────
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials!');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      res.status(423); // 423 Locked
      throw new Error(`Account is temporarily locked. Try again in ${minutesLeft} minute(s).`);
    }

    // If lock expired but is still set, clear it before verifying password
    if (user.lockUntil && user.lockUntil <= Date.now()) {
      user.loginAttempts = 0;
      user.lockUntil = 0;
    }

    if (user && (await user.matchPassword(password))) {
      // Reset attempts on successful login
      if (user.loginAttempts > 0 || user.lockUntil > 0) {
        user.loginAttempts = 0;
        user.lockUntil = 0;
        await user.save();
      }

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
      // Increment failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      const MAX_ATTEMPTS = 5;
      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
        await user.save();
        res.status(423);
        throw new Error('Too many failed login attempts. Your account has been temporarily locked for 15 minutes.');
      } else {
        await user.save();
        res.status(401);
        const attemptsRemaining = MAX_ATTEMPTS - user.loginAttempts;
        throw new Error(`Invalid credentials! ${attemptsRemaining} attempt(s) remaining before account lockout.`);
      }
    }
  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};
