import React, { useState } from 'react';
import {
  Clock, Play, Square, Plus, Trash2, Settings, CalendarDays
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';

const DTRSection = ({
  dtr,
  onClockIn, onClockOut,
  onAddManual, onDeleteEntry, onUpdateTarget, onUpdateInitialHours
}) => {
  const [showManualForm, setShowManualForm] = useState(false);
  const [showTargetEdit, setShowTargetEdit] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualTimeIn, setManualTimeIn] = useState('');
  const [manualTimeOut, setManualTimeOut] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [newInitialHours, setNewInitialHours] = useState('');

  if (!dtr) return null;

  const trackedHours = dtr.entries?.reduce((sum, e) => sum + (e.hoursRendered || 0), 0) || 0;
  const initialHours = dtr.initialHours || 0;
  const totalHours = trackedHours + initialHours;
  const target = dtr.targetHours || 600;
  const pct = Math.min((totalHours / target) * 100, 100);
  const isClockedIn = dtr.entries?.some(e => !e.timeOut);

  // Color coding based on progress
  const getColor = (percent) => {
    if (percent >= 100) return { ring: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-500', label: 'Complete! 🎉' };
    if (percent >= 75) return { ring: '#3b82f6', bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Almost there!' };
    if (percent >= 50) return { ring: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Halfway!' };
    if (percent >= 25) return { ring: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'Keep going' };
    return { ring: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-500', label: 'Just started' };
  };

  const color = getColor(pct);

  // SVG ring calculations
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const handleManualSubmit = () => {
    if (!manualDate || !manualTimeIn || !manualTimeOut) return;
    const timeIn = new Date(`${manualDate}T${manualTimeIn}`);
    const timeOut = new Date(`${manualDate}T${manualTimeOut}`);
    onAddManual({ date: manualDate, timeIn, timeOut, notes: manualNotes });
    setManualDate('');
    setManualTimeIn('');
    setManualTimeOut('');
    setManualNotes('');
    setShowManualForm(false);
  };

  const handleTargetSubmit = () => {
    const val = parseInt(newTarget);
    if (val > 0) {
      onUpdateTarget(val);
      setNewTarget('');
    }
  };

  const handleInitialHoursSubmit = () => {
    const val = parseFloat(newInitialHours);
    if (val >= 0) {
      onUpdateInitialHours(val);
      setNewInitialHours('');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="space-y-4">
      {/* Progress Ring Card */}
      <Card className={`p-4 sm:p-5 border-border/50 ${color.bg}`}>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
          {/* SVG Ring — scales with container */}
          <div className="relative shrink-0">
            <svg className="w-[110px] h-[110px] sm:w-[136px] sm:h-[136px]" viewBox="0 0 136 136">
              {/* Background ring */}
              <circle
                cx="68" cy="68" r={radius}
                fill="none" stroke="currentColor"
                strokeWidth="8" opacity="0.1"
                className="text-muted-foreground"
              />
              {/* Progress ring */}
              <circle
                cx="68" cy="68" r={radius}
                fill="none" stroke={color.ring}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 68 68)"
                className="transition-all duration-700"
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl sm:text-2xl font-bold ${color.text}`}>{Math.round(pct)}%</span>
              <span className="text-xs text-muted-foreground font-medium">{totalHours.toFixed(1)}h</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0 text-center sm:text-left w-full">
            <p className={`text-base font-bold ${color.text}`}>{color.label}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {totalHours.toFixed(1)} / {target} hours
            </p>
            <p className="text-sm text-muted-foreground">
              {Math.max(0, target - totalHours).toFixed(1)} hours remaining
            </p>
            {initialHours > 0 && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                ({initialHours.toFixed(1)}h prior + {trackedHours.toFixed(1)}h tracked)
              </p>
            )}

            {/* Settings toggle */}
            <button
              onClick={() => { setShowSettings(!showSettings); setNewTarget(target.toString()); setNewInitialHours(initialHours.toString()); }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-3 py-2.5 px-4 rounded-full border border-border/50 hover:border-primary/30 transition-all active:scale-95"
            >
              <Settings size={16} /> Settings
            </button>
          </div>
        </div>

        {/* Settings Panel — full width below the ring row */}
        {showSettings && (
          <div className="space-y-5 mt-4 pt-4 border-t border-border/30">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Hours</label>
              <Input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="h-12 text-base w-full"
                min="1"
                placeholder="600"
              />
              <Button onClick={handleTargetSubmit} className="w-full h-11 text-sm">Set Target</Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Prior Hours Rendered</label>
              <Input
                type="number"
                value={newInitialHours}
                onChange={(e) => setNewInitialHours(e.target.value)}
                className="h-12 text-base w-full"
                min="0"
                step="0.5"
                placeholder="0"
              />
              <Button onClick={handleInitialHoursSubmit} className="w-full h-11 text-sm">Set Prior Hours</Button>
              <p className="text-xs text-muted-foreground/60">Hours already completed before using this tracker</p>
            </div>
          </div>
        )}
      </Card>

      {/* Clock In/Out + Actions */}
      <div className="flex gap-2">
        {isClockedIn ? (
          <Button
            onClick={onClockOut}
            variant="outline"
            className="flex-1 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <Square size={16} className="fill-current" />
            Clock Out
          </Button>
        ) : (
          <Button onClick={onClockIn} className="flex-1 gap-2">
            <Play size={16} className="fill-current" />
            Clock In
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setShowManualForm(!showManualForm)}
          className="gap-1.5"
        >
          <CalendarDays size={16} />
          Manual
        </Button>
      </div>

      {/* Live Clock-In Timer */}
      {isClockedIn && (() => {
        const openEntry = dtr.entries.find(e => !e.timeOut);
        return (
          <Card className="p-3 border-green-500/30 bg-green-500/5 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span className="text-sm font-medium text-green-500">Clocked in since {formatTime(openEntry.timeIn)}</span>
            </div>
          </Card>
        );
      })()}

      {/* Manual Entry Form */}
      {showManualForm && (
        <Card className="p-4 border-border/50 bg-card/50 space-y-4">
          <h4 className="text-sm font-bold text-foreground">Add Manual Entry</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="h-10 text-sm" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Time In</label>
              <Input type="time" value={manualTimeIn} onChange={(e) => setManualTimeIn(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Time Out</label>
              <Input type="time" value={manualTimeOut} onChange={(e) => setManualTimeOut(e.target.value)} className="h-10 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
            <Input
              placeholder="What did you work on?"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleManualSubmit} disabled={!manualDate || !manualTimeIn || !manualTimeOut} className="flex-1 text-sm gap-1.5">
              <Plus size={14} /> Add Entry
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowManualForm(false)} className="text-sm">Cancel</Button>
          </div>
        </Card>
      )}

      <Separator />

      {/* Entry Log */}
      <div>
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Time Log</h4>
        {(!dtr.entries || dtr.entries.length === 0) ? (
          <div className="text-center py-6">
            <Clock size={28} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No entries yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...dtr.entries]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/30 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{formatDate(entry.date)}</span>
                      {!entry.timeOut && (
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-bold animate-pulse">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(entry.timeIn)} → {entry.timeOut ? formatTime(entry.timeOut) : '...'}
                      </span>
                      {entry.hoursRendered > 0 && (
                        <span className="text-xs font-bold text-primary">{entry.hoursRendered}h</span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteEntry(entry._id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DTRSection;
