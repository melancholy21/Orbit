import mongoose from 'mongoose';

const lobbyMessageSchema = new mongoose.Schema({
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

const LobbyMessage = mongoose.model('LobbyMessage', lobbyMessageSchema);
export default LobbyMessage;
