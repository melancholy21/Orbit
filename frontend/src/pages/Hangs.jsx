import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Sparkles, BarChart3, Wallet, X, Loader2,
  ChevronDown, ChevronUp, PartyPopper, Search, Clock
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import BucketCard from '../components/hangs/BucketCard';
import PollCard from '../components/hangs/PollCard';
import LedgerSection from '../components/hangs/LedgerSection';
import DTRSection from '../components/hangs/DTRSection';
import hangsService from '../features/hangs/hangsService';
import userService from '../features/users/userService';
import toast from 'react-hot-toast';
import { formatFullName, getInitials } from '../lib/utils';

const Hangs = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Data states
  const [bucketItems, setBucketItems] = useState([]);
  const [polls, setPolls] = useState([]);
  const [bills, setBills] = useState([]);
  const [balance, setBalance] = useState({ youOwe: 0, youAreOwed: 0 });
  const [dtr, setDtr] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Drawer states
  const [showBucketDrawer, setShowBucketDrawer] = useState(false);
  const [showPollDrawer, setShowPollDrawer] = useState(false);
  const [showBillDrawer, setShowBillDrawer] = useState(false);

  // Section collapse states
  const [pollsOpen, setPollsOpen] = useState(true);
  const [bucketOpen, setBucketOpen] = useState(true);
  const [ledgerOpen, setLedgerOpen] = useState(true);
  const [dtrOpen, setDtrOpen] = useState(true);

  // Form states
  const [bucketTitle, setBucketTitle] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState([{ text: '', image: '' }, { text: '', image: '' }]);
  const [pollDuration, setPollDuration] = useState(24);
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [billParticipants, setBillParticipants] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFollowers, setHasFollowers] = useState(null); // null = checking

  // Check if user has followers first
  useEffect(() => {
    const checkFollowers = async () => {
      if (!user) return;
      try {
        const profile = await userService.getUserProfile(user._id, user.token);
        setHasFollowers(profile.followers && profile.followers.length > 0);
      } catch (err) {
        console.error(err);
        setHasFollowers(false);
      }
    };
    checkFollowers();
  }, [user]);

  // Fetch all data only if user has followers
  useEffect(() => {
    const fetchAll = async () => {
      if (!user || hasFollowers !== true) return;
      setIsLoading(true);
      try {
        const [bucketData, pollData, billData, dtrData] = await Promise.all([
          hangsService.getBucketItems(user.token),
          hangsService.getPolls(user.token),
          hangsService.getBills(user.token),
          hangsService.getDTR(user.token),
        ]);
        setBucketItems(bucketData);
        setPolls(pollData);
        setBills(billData.bills);
        setBalance(billData.balance);
        setDtr(dtrData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [user, hasFollowers]);

  // Fetch friends for bill participant selector
  const fetchFriends = async () => {
    try {
      const data = await userService.getFriendsWithStatus(user.token);
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  };

  // ====== BUCKET LIST HANDLERS ======
  const handleCreateBucket = async () => {
    if (!bucketTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const item = await hangsService.createBucketItem(bucketTitle.trim(), user.token);
      setBucketItems(prev => [item, ...prev].sort((a, b) => (b.imIn?.length || 0) - (a.imIn?.length || 0)));
      setBucketTitle('');
      setShowBucketDrawer(false);
      toast.success('Added to bucket list!');
    } catch (err) {
      toast.error('Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleImIn = async (itemId) => {
    try {
      const updated = await hangsService.toggleImIn(itemId, user.token);
      setBucketItems(prev =>
        prev.map(i => i._id === itemId ? updated : i).sort((a, b) => (b.imIn?.length || 0) - (a.imIn?.length || 0))
      );
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const handleDeleteBucket = async (itemId) => {
    try {
      await hangsService.deleteBucketItem(itemId, user.token);
      setBucketItems(prev => prev.filter(i => i._id !== itemId));
      toast.success('Removed');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ====== POLL HANDLERS ======
  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter(o => o.text.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) {
      toast.error('Add a question and at least 2 options');
      return;
    }
    setIsSubmitting(true);
    try {
      const poll = await hangsService.createPoll({
        question: pollQuestion.trim(),
        options: validOptions.map(o => ({ text: o.text.trim(), image: o.image })),
        durationHours: pollDuration
      }, user.token);
      setPolls(prev => [poll, ...prev]);
      setPollQuestion('');
      setPollOptions([{ text: '', image: '' }, { text: '', image: '' }]);
      setPollDuration(24);
      setShowPollDrawer(false);
      toast.success('Poll created!');
    } catch (err) {
      toast.error('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVotePoll = async (pollId, optionIndex) => {
    try {
      const updated = await hangsService.votePoll(pollId, optionIndex, user.token);
      setPolls(prev => prev.map(p => p._id === pollId ? { ...updated, isExpired: p.isExpired } : p));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to vote');
    }
  };

  const handleDeletePoll = async (pollId) => {
    try {
      await hangsService.deletePoll(pollId, user.token);
      setPolls(prev => prev.filter(p => p._id !== pollId));
      toast.success('Poll removed');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ====== BILL HANDLERS ======
  const handleAddBill = async () => {
    if (!billAmount || parseFloat(billAmount) <= 0 || !billDescription.trim() || billParticipants.length === 0) {
      toast.error('Fill in amount, description, and select at least one person');
      return;
    }
    setIsSubmitting(true);
    try {
      const bill = await hangsService.addBill({
        amount: parseFloat(billAmount),
        description: billDescription.trim(),
        participants: billParticipants
      }, user.token);
      setBills(prev => [bill, ...prev]);

      // Refresh balances
      const billData = await hangsService.getBills(user.token);
      setBalance(billData.balance);

      setBillAmount('');
      setBillDescription('');
      setBillParticipants([]);
      setShowBillDrawer(false);
      toast.success('Bill added!');
    } catch (err) {
      toast.error('Failed to add bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettle = async (billId) => {
    try {
      const updated = await hangsService.settleBill(billId, user.token);
      setBills(prev => prev.map(b => b._id === billId ? updated : b));

      const billData = await hangsService.getBills(user.token);
      setBalance(billData.balance);

      toast.success('Settled!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to settle');
    }
  };

  const handleDeleteBill = async (billId) => {
    try {
      await hangsService.deleteBill(billId, user.token);
      setBills(prev => prev.filter(b => b._id !== billId));

      const billData = await hangsService.getBills(user.token);
      setBalance(billData.balance);

      toast.success('Bill removed');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleParticipant = (friendId) => {
    setBillParticipants(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions(prev => [...prev, { text: '', image: '' }]);
    }
  };

  const updatePollOption = (index, field, value) => {
    setPollOptions(prev => prev.map((opt, i) => i === index ? { ...opt, [field]: value } : opt));
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, i) => i !== index));
    }
  };

  // ====== DTR HANDLERS ======
  const handleClockIn = async () => {
    try {
      const updated = await hangsService.clockIn('', user.token);
      setDtr(updated);
      toast.success('Clocked in!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      const updated = await hangsService.clockOut(user.token);
      setDtr(updated);
      toast.success('Clocked out!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clock out');
    }
  };

  const handleAddManual = async (entryData) => {
    try {
      const updated = await hangsService.addManualEntry(entryData, user.token);
      setDtr(updated);
      toast.success('Entry added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add entry');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      const updated = await hangsService.deleteEntry(entryId, user.token);
      setDtr(updated);
      toast.success('Entry removed');
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const handleUpdateTarget = async (targetHours) => {
    try {
      const updated = await hangsService.updateTarget(targetHours, user.token);
      setDtr(updated);
      toast.success(`Target set to ${targetHours} hours`);
    } catch (err) {
      toast.error('Failed to update target');
    }
  };

  const handleUpdateInitialHours = async (initialHours) => {
    try {
      const updated = await hangsService.updateInitialHours(initialHours, user.token);
      setDtr(updated);
      toast.success(`Prior hours set to ${initialHours}`);
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  // Still checking followers
  if (hasFollowers === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  // No followers — show locked state
  if (!hasFollowers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-4">
        <div className="bg-muted/50 rounded-full p-6">
          <PartyPopper size={48} className="text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Your Circle is Empty</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Hangs is where your friend group plans together — polls, bucket lists, and splitting bills. Get some friends to follow you first!
        </p>
        <Button onClick={() => navigate('/search')} className="gap-2 mt-2">
          <Search size={16} />
          Find Friends
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const activePolls = polls.filter(p => !p.isExpired);
  const endedPolls = polls.filter(p => p.isExpired);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Hangs</h1>
      </div>

      {/* ====== ACTIVE POLLS ====== */}
      <section>
        <button
          onClick={() => setPollsOpen(!pollsOpen)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider">Active Polls</h2>
            {activePolls.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{activePolls.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setShowPollDrawer(true); }}>
              <Plus size={16} />
            </Button>
            {pollsOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>
        {pollsOpen && (
          <div className="space-y-3">
            {activePolls.length === 0 && endedPolls.length === 0 ? (
              <Card className="p-6 text-center border-dashed border-border/50 bg-card/30">
                <BarChart3 size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No active polls</p>
                <p className="text-sm text-muted-foreground mt-1">Create one to get decisions rolling!</p>
              </Card>
            ) : (
              <>
                {activePolls.map(poll => (
                  <PollCard key={poll._id} poll={poll} currentUserId={user._id} onVote={handleVotePoll} onDelete={handleDeletePoll} />
                ))}
                {endedPolls.map(poll => (
                  <PollCard key={poll._id} poll={poll} currentUserId={user._id} onVote={handleVotePoll} onDelete={handleDeletePoll} />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* ====== BUCKET LIST ====== */}
      <section>
        <button
          onClick={() => setBucketOpen(!bucketOpen)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider">Bucket List</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setShowBucketDrawer(true); }}>
              <Plus size={16} />
            </Button>
            {bucketOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>
        {bucketOpen && (
          <div className="space-y-2">
            {bucketItems.length === 0 ? (
              <Card className="p-6 text-center border-dashed border-border/50 bg-card/30">
                <Sparkles size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Bucket list is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Add something you'd love to do!</p>
              </Card>
            ) : (
              bucketItems.map(item => (
                <BucketCard
                  key={item._id}
                  item={item}
                  currentUserId={user._id}
                  onToggleImIn={handleToggleImIn}
                  onDelete={handleDeleteBucket}
                />
              ))
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* ====== LEDGER ====== */}
      <section>
        <button
          onClick={() => setLedgerOpen(!ledgerOpen)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-emerald-400" />
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider">Ledger</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setShowBillDrawer(true); fetchFriends(); }}>
              <Plus size={16} />
            </Button>
            {ledgerOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </button>
        {ledgerOpen && (
          <LedgerSection
            bills={bills}
            balance={balance}
            currentUserId={user._id}
            onSettle={handleSettle}
            onDelete={handleDeleteBill}
          />
        )}
      </section>

      <Separator />

      {/* ====== DTR ====== */}
      <section>
        <button
          onClick={() => setDtrOpen(!dtrOpen)}
          className="flex items-center justify-between w-full mb-3"
        >
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-violet-400" />
            <h2 className="text-base font-bold text-foreground uppercase tracking-wider">DTR</h2>
            <span className="text-xs text-muted-foreground">Time Record</span>
          </div>
          {dtrOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        {dtrOpen && (
          <DTRSection
            dtr={dtr}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onAddManual={handleAddManual}
            onDeleteEntry={handleDeleteEntry}
            onUpdateTarget={handleUpdateTarget}
            onUpdateInitialHours={handleUpdateInitialHours}
          />
        )}
      </section>

      {/* ====== DRAWERS ====== */}

      {/* Create Bucket Item Drawer */}
      {showBucketDrawer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBucketDrawer(false)}>
          <div
            className="w-full max-w-[500px] bg-background border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Add to Bucket List</h3>
              <button onClick={() => setShowBucketDrawer(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <Input
              placeholder="Beach trip, Karaoke night, Road trip..."
              value={bucketTitle}
              onChange={(e) => setBucketTitle(e.target.value)}
              className="mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBucket()}
            />
            <Button onClick={handleCreateBucket} disabled={!bucketTitle.trim() || isSubmitting} className="w-full gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Add to Bucket List
            </Button>
          </div>
        </div>
      )}

      {/* Create Poll Drawer */}
      {showPollDrawer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowPollDrawer(false)}>
          <div
            className="w-full max-w-[500px] bg-background border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Create a Poll</h3>
              <button onClick={() => setShowPollDrawer(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <Input
              placeholder="Where should we eat?"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="mb-4"
              autoFocus
            />

            <div className="space-y-3 mb-4">
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${idx + 1}`}
                    value={opt.text}
                    onChange={(e) => updatePollOption(idx, 'text', e.target.value)}
                    className="flex-1"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(idx)} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button variant="outline" size="sm" onClick={addPollOption} className="w-full text-xs gap-1">
                  <Plus size={12} /> Add Option
                </Button>
              )}
            </div>

            {/* Duration selector */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Duration</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 6, 12, 24, 48, 72].map(h => (
                  <button
                    key={h}
                    onClick={() => setPollDuration(h)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${pollDuration === h
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleCreatePoll} disabled={!pollQuestion.trim() || pollOptions.filter(o => o.text.trim()).length < 2 || isSubmitting} className="w-full gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
              Create Poll
            </Button>
          </div>
        </div>
      )}

      {/* Add Bill Drawer */}
      {showBillDrawer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowBillDrawer(false)}>
          <div
            className="w-full max-w-[500px] bg-background border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Add a Bill</h3>
              <button onClick={() => setShowBillDrawer(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (₱)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">What was it for?</label>
                <Input
                  placeholder="Tacos, Coffee, Pizza..."
                  value={billDescription}
                  onChange={(e) => setBillDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Participant selector */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Who was there? (Tap to Select)</p>
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground">Loading friends...</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {friends.map(friend => {
                    const isSelected = billParticipants.includes(friend._id);
                    return (
                      <button
                        key={friend._id}
                        onClick={() => toggleParticipant(friend._id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted text-muted-foreground border-border hover:border-primary/30'
                          }`}
                      >
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={friend.profilePicture} />
                          <AvatarFallback className="text-[7px]">
                            {getInitials(friend)}
                          </AvatarFallback>
                        </Avatar>
                        {formatFullName(friend)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button onClick={handleAddBill} disabled={!billAmount || !billDescription.trim() || billParticipants.length === 0 || isSubmitting} className="w-full gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
              Add Bill
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hangs;
