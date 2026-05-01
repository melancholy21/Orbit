import mongoose from 'mongoose';

const dtrEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  timeIn: {
    type: Date,
    required: true
  },
  timeOut: {
    type: Date,
    default: null
  },
  hoursRendered: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: '',
    maxlength: 200
  }
}, { _id: true, timestamps: false });

const dtrSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  targetHours: {
    type: Number,
    required: true,
    default: 600
  },
  initialHours: {
    type: Number,
    default: 0
  },
  entries: [dtrEntrySchema]
}, { timestamps: true });

const DTR = mongoose.model('DTR', dtrSchema);
export default DTR;
