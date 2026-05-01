import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { _id: true });

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    maxlength: 300,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  options: {
    type: [pollOptionSchema],
    validate: [arr => arr.length >= 2 && arr.length <= 4, 'A poll needs 2-4 options']
  },
  expiresAt: {
    type: Date,
    required: true
  },
  winner: {
    type: Number,
    default: null
  }
}, { timestamps: true });

const Poll = mongoose.model('Poll', pollSchema);
export default Poll;
