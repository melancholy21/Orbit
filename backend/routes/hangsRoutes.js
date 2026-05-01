import express from 'express';
const router = express.Router();
import {
  createBucketItem, getBucketItems, toggleImIn, deleteBucketItem,
  createPoll, getPolls, votePoll, deletePoll,
  addBill, getBills, settleBill, deleteBill,
  getDTR, clockIn, clockOut, addManualEntry, deleteEntry, updateTarget, updateInitialHours
} from '../controllers/hangsController.js';
import { protect } from '../middleware/authMiddleware.js';

// Bucket List
router.route('/bucket')
  .get(protect, getBucketItems)
  .post(protect, createBucketItem);
router.put('/bucket/:id/imin', protect, toggleImIn);
router.delete('/bucket/:id', protect, deleteBucketItem);

// Polls
router.route('/polls')
  .get(protect, getPolls)
  .post(protect, createPoll);
router.put('/polls/:id/vote', protect, votePoll);
router.delete('/polls/:id', protect, deletePoll);

// Ledger
router.route('/bills')
  .get(protect, getBills)
  .post(protect, addBill);
router.put('/bills/:id/settle', protect, settleBill);
router.delete('/bills/:id', protect, deleteBill);

// DTR (Daily Time Record)
router.get('/dtr', protect, getDTR);
router.post('/dtr/clock-in', protect, clockIn);
router.post('/dtr/clock-out', protect, clockOut);
router.post('/dtr/entry', protect, addManualEntry);
router.delete('/dtr/entry/:entryId', protect, deleteEntry);
router.put('/dtr/target', protect, updateTarget);
router.put('/dtr/initial-hours', protect, updateInitialHours);

export default router;
