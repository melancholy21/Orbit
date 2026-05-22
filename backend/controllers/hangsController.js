import BucketItem from '../models/BucketItem.js';
import Poll from '../models/Poll.js';
import Bill from '../models/Bill.js';
import DTR from '../models/DTR.js';
import User from '../models/User.js';

// ========== BUCKET LIST ==========

export const createBucketItem = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      res.status(400);
      throw new Error('Please add a title');
    }

    const item = await BucketItem.create({
      title: title.trim(),
      author: req.user.id,
      imIn: [req.user.id] // Author is automatically "in"
    });

    const populated = await BucketItem.findById(item._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('imIn', 'username profilePicture firstName lastName');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

export const getBucketItems = async (req, res, next) => {
  try {
    const items = await BucketItem.find()
      .populate('author', 'username profilePicture firstName lastName')
      .populate('imIn', 'username profilePicture firstName lastName')
      .sort({ createdAt: -1 });

    // Sort by imIn count descending
    items.sort((a, b) => b.imIn.length - a.imIn.length);

    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

export const toggleImIn = async (req, res, next) => {
  try {
    const item = await BucketItem.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Bucket item not found');
    }

    const userId = req.user.id;
    const index = item.imIn.findIndex(id => id.toString() === userId);

    if (index > -1) {
      item.imIn.splice(index, 1);
    } else {
      item.imIn.push(userId);
    }

    await item.save();

    const populated = await BucketItem.findById(item._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('imIn', 'username profilePicture firstName lastName');

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

export const deleteBucketItem = async (req, res, next) => {
  try {
    const item = await BucketItem.findById(req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Bucket item not found');
    }
    if (item.author.toString() !== req.user.id) {
      res.status(401);
      throw new Error('Not authorized');
    }
    await item.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
};

// ========== POLLS ==========

export const createPoll = async (req, res, next) => {
  try {
    const { question, options, durationHours } = req.body;

    if (!question || !question.trim()) {
      res.status(400);
      throw new Error('Please add a question');
    }
    if (!options || options.length < 2 || options.length > 4) {
      res.status(400);
      throw new Error('A poll needs 2-4 options');
    }

    const hours = durationHours || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const pollOptions = options.map(opt => ({
      text: opt.text,
      image: opt.image || '',
      votes: []
    }));

    const poll = await Poll.create({
      question: question.trim(),
      author: req.user.id,
      options: pollOptions,
      expiresAt
    });

    const populated = await Poll.findById(poll._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('options.votes', 'username profilePicture firstName lastName');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

export const getPolls = async (req, res, next) => {
  try {
    // Get active polls + recently expired (last 24h) for "winner" display
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const polls = await Poll.find({ expiresAt: { $gte: cutoff } })
      .populate('author', 'username profilePicture firstName lastName')
      .populate('options.votes', 'username profilePicture firstName lastName')
      .sort({ createdAt: -1 });

    // Auto-resolve winners for expired polls
    const resolved = polls.map(poll => {
      const p = poll.toObject();
      if (new Date() >= new Date(p.expiresAt) && p.winner === null) {
        // Find option with most votes
        let maxVotes = 0;
        let winnerIdx = null;
        p.options.forEach((opt, idx) => {
          if (opt.votes.length > maxVotes) {
            maxVotes = opt.votes.length;
            winnerIdx = idx;
          }
        });
        if (maxVotes > 0) {
          p.winner = winnerIdx;
          // Also save to DB in background
          Poll.findByIdAndUpdate(p._id, { winner: winnerIdx }).catch(() => { });
        }
      }
      p.isExpired = new Date() >= new Date(p.expiresAt);
      return p;
    });

    res.status(200).json(resolved);
  } catch (error) {
    next(error);
  }
};

export const votePoll = async (req, res, next) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      res.status(404);
      throw new Error('Poll not found');
    }
    if (new Date() >= new Date(poll.expiresAt)) {
      res.status(400);
      throw new Error('This poll has expired');
    }
    if (optionIndex === undefined || optionIndex < 0 || optionIndex >= poll.options.length) {
      res.status(400);
      throw new Error('Invalid option');
    }

    // Remove any existing votes by this user
    const userId = req.user.id;
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== userId);
    });

    // Add vote to the selected option
    poll.options[optionIndex].votes.push(userId);

    await poll.save();

    const populated = await Poll.findById(poll._id)
      .populate('author', 'username profilePicture firstName lastName')
      .populate('options.votes', 'username profilePicture firstName lastName');

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

export const deletePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      res.status(404);
      throw new Error('Poll not found');
    }
    if (poll.author.toString() !== req.user.id) {
      res.status(401);
      throw new Error('Not authorized');
    }
    await poll.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
};

// ========== LEDGER (SPLIT-THE-BILL) ==========

export const addBill = async (req, res, next) => {
  try {
    const { amount, description, participants } = req.body;

    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error('Please add a valid amount');
    }
    if (!description || !description.trim()) {
      res.status(400);
      throw new Error('Please add a description');
    }
    if (!participants || participants.length === 0) {
      res.status(400);
      throw new Error('Please add at least one participant');
    }

    const bill = await Bill.create({
      payer: req.user.id,
      amount,
      description: description.trim(),
      participants,
      settled: []
    });

    const populated = await Bill.findById(bill._id)
      .populate('payer', 'username profilePicture firstName lastName')
      .populate('participants', 'username profilePicture firstName lastName')
      .populate('settled', 'username profilePicture firstName lastName');

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

export const getBills = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all bills where user is payer or participant
    const bills = await Bill.find({
      $or: [{ payer: userId }, { participants: userId }]
    })
      .populate('payer', 'username profilePicture firstName lastName')
      .populate('participants', 'username profilePicture firstName lastName')
      .populate('settled', 'username profilePicture firstName lastName')
      .sort({ createdAt: -1 });

    // Compute balances
    let youOwe = 0;
    let youAreOwed = 0;

    bills.forEach(bill => {
      const splitAmount = bill.amount / (bill.participants.length + 1); // +1 for payer
      const isSettled = bill.settled.some(s => s._id.toString() === userId);

      if (bill.payer._id.toString() === userId) {
        // I paid — others owe me
        bill.participants.forEach(p => {
          const pSettled = bill.settled.some(s => s._id.toString() === p._id.toString());
          if (!pSettled) {
            youAreOwed += splitAmount;
          }
        });
      } else {
        // I'm a participant — I owe the payer
        if (!isSettled) {
          youOwe += splitAmount;
        }
      }
    });

    res.status(200).json({
      bills,
      balance: {
        youOwe: Math.round(youOwe * 100) / 100,
        youAreOwed: Math.round(youAreOwed * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
};

export const settleBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      res.status(404);
      throw new Error('Bill not found');
    }

    const userId = req.user.id;

    // Only participants (not the payer) can settle
    if (bill.payer.toString() === userId) {
      res.status(400);
      throw new Error('Payer cannot settle their own bill');
    }

    if (!bill.participants.some(p => p.toString() === userId)) {
      res.status(400);
      throw new Error('You are not a participant in this bill');
    }

    if (bill.settled.some(s => s.toString() === userId)) {
      res.status(400);
      throw new Error('Already settled');
    }

    bill.settled.push(userId);
    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('payer', 'username profilePicture firstName lastName')
      .populate('participants', 'username profilePicture firstName lastName')
      .populate('settled', 'username profilePicture firstName lastName');

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

export const deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      res.status(404);
      throw new Error('Bill not found');
    }
    if (bill.payer.toString() !== req.user.id) {
      res.status(401);
      throw new Error('Not authorized');
    }
    await bill.deleteOne();
    res.status(200).json({ id: req.params.id });
  } catch (error) {
    next(error);
  }
};

// ========== DTR (DAILY TIME RECORD) ==========

export const getDTR = async (req, res, next) => {
  try {
    let dtr = await DTR.findOne({ user: req.user.id });

    // Auto-create DTR for new users
    if (!dtr) {
      dtr = await DTR.create({
        user: req.user.id,
        targetHours: 600,
        entries: []
      });
    }

    res.status(200).json(dtr);
  } catch (error) {
    next(error);
  }
};

export const clockIn = async (req, res, next) => {
  try {
    let dtr = await DTR.findOne({ user: req.user.id });
    if (!dtr) {
      dtr = await DTR.create({ user: req.user.id, targetHours: 600, entries: [] });
    }

    // Check if there's already an open entry (clocked in but not out)
    const openEntry = dtr.entries.find(e => !e.timeOut);
    if (openEntry) {
      res.status(400);
      throw new Error('You are already clocked in. Clock out first.');
    }

    const now = new Date();
    dtr.entries.push({
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      timeIn: now,
      timeOut: null,
      hoursRendered: 0,
      notes: req.body.notes || ''
    });

    await dtr.save();
    res.status(200).json(dtr);
  } catch (error) {
    next(error);
  }
};

export const clockOut = async (req, res, next) => {
  try {
    const dtr = await DTR.findOne({ user: req.user.id });
    if (!dtr) {
      res.status(404);
      throw new Error('DTR not found');
    }

    const openEntry = dtr.entries.find(e => !e.timeOut);
    if (!openEntry) {
      res.status(400);
      throw new Error('You are not clocked in');
    }

    const now = new Date();
    openEntry.timeOut = now;
    openEntry.hoursRendered = Math.round(((now - new Date(openEntry.timeIn)) / (1000 * 60 * 60)) * 100) / 100;

    await dtr.save();
    res.status(200).json(dtr);
  } catch (error) {
    next(error);
  }
};

export const addManualEntry = async (req, res, next) => {
  try {
    const { date, timeIn, timeOut, notes } = req.body;

    if (!date || !timeIn || !timeOut) {
      res.status(400);
      throw new Error('Date, Time In, and Time Out are required');
    }

    let dtr = await DTR.findOne({ user: req.user.id });
    if (!dtr) {
      dtr = await DTR.create({ user: req.user.id, targetHours: 600, entries: [] });
    }

    const inDate = new Date(timeIn);
    const outDate = new Date(timeOut);

    if (outDate <= inDate) {
      res.status(400);
      throw new Error('Time Out must be after Time In');
    }

    const hoursRendered = Math.round(((outDate - inDate) / (1000 * 60 * 60)) * 100) / 100;

    dtr.entries.push({
      date: new Date(date),
      timeIn: inDate,
      timeOut: outDate,
      hoursRendered,
      notes: notes || ''
    });

    // Sort entries by date descending
    dtr.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    await dtr.save();
    res.status(200).json(dtr);
  } catch (error) {
    next(error);
  }
};

export const deleteEntry = async (req, res, next) => {
  try {
    const dtr = await DTR.findOne({ user: req.user.id });
    if (!dtr) {
      res.status(404);
      throw new Error('DTR not found');
    }

    dtr.entries = dtr.entries.filter(e => e._id.toString() !== req.params.entryId);
    await dtr.save();
    res.status(200).json(dtr);
  } catch (error) {
    next(error);
  }
};

export const updateTarget = async (req, res, next) => {
  try {
    const { targetHours } = req.body;
    if (!targetHours || targetHours <= 0) {
      res.status(400);
      throw new Error('Please enter a valid target');
    }

    let dtr = await DTR.findOne({ user: req.user.id });
    if (!dtr) {
      dtr = await DTR.create({ user: req.user.id, targetHours, entries: [] });
    } else {
      dtr.targetHours = targetHours;
      await dtr.save();
    }

    res.status(200).json(dtr);
  } catch (error) {
    next(error);
  }
};

export const updateInitialHours = async (req, res, next) => {
  try {
    const { initialHours } = req.body;
    if (initialHours === undefined || initialHours < 0) {
      res.status(400);
      throw new Error('Please enter a valid number of hours');
    }

    let dtr = await DTR.findOne({ user: req.user.id });
    if (!dtr) {
      dtr = await DTR.create({ user: req.user.id, targetHours: 600, initialHours, entries: [] });
    } else {
      dtr.initialHours = initialHours;
      await dtr.save();
    }

    res.status(200).json(dtr);
  } catch (error) {
    next(error);
  }
};
