import mongoose from 'mongoose';

const lobbyMessageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: false
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 500
  }
}, { timestamps: true });

// Auto-delete messages older than 24 hours
lobbyMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
lobbyMessageSchema.index({ roomId: 1 });
lobbyMessageSchema.index({ roomId: 1, createdAt: -1 });

const LobbyMessage = mongoose.model('LobbyMessage', lobbyMessageSchema);
export default LobbyMessage;
