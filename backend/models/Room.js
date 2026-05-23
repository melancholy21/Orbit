import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  queue: [{
    id: { type: String, required: true },
    url: { type: String, required: true },
    title: { type: String },
    addedBy: {
      userId: { type: String, required: true },
      username: { type: String, required: true }
    },
    addedAt: { type: Date, default: Date.now }
  }],
  currentTrackIndex: {
    type: Number,
    default: -1
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  currentStartedAt: {
    type: Date
  },
  repeatMode: {
    type: String,
    enum: ['off', 'track', 'queue'],
    default: 'off'
  }
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);
export default Room;
