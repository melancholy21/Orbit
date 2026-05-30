import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['nudge', 'follow', 'like', 'comment', 'friend_request', 'friend_accept', 'share'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  content: {
    type: String
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
