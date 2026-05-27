import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// TTL index — MongoDB automatically deletes documents when `expiresAt` is reached
pendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ensure one pending registration per email at a time
pendingUserSchema.index({ email: 1 }, { unique: true });

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);
export default PendingUser;
