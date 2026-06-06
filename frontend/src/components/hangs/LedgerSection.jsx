import React from 'react';
import { Wallet, CheckCircle2, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { formatFullName, getInitials } from '../../lib/utils';

const LedgerSection = ({ bills, balance, currentUserId, onSettle, onDelete }) => {
  const net = (balance?.youAreOwed || 0) - (balance?.youOwe || 0);

  return (
    <div className="space-y-4">
      {/* Balance Summary */}
      <Card className={`p-4 border-border/50 ${net >= 0 ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${net >= 0 ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}`}>
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Your Balance</p>
            <p className={`text-lg font-bold ${net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {net >= 0 ? '+' : '-'}₱{Math.abs(net).toFixed(2)}
            </p>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-1.5">
            <ArrowDownLeft size={14} className="text-red-400" />
            <span className="text-muted-foreground">You owe</span>
            <span className="font-semibold text-red-400">₱{(balance?.youOwe || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpRight size={14} className="text-green-400" />
            <span className="text-muted-foreground">Owed to you</span>
            <span className="font-semibold text-green-400">₱{(balance?.youAreOwed || 0).toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Bill List */}
      {bills.length === 0 ? (
        <div className="text-center text-muted-foreground py-6">
          <Wallet size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No bills yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.map(bill => {
            const isPayer = bill.payer?._id === currentUserId;
            const isSettled = bill.settled?.some(s => s._id === currentUserId);
            const splitAmount = bill.amount / ((bill.participants?.length || 0) + 1);
            const allSettled = bill.participants?.every(p =>
              bill.settled?.some(s => s._id === p._id)
            );

            return (
              <Card key={bill._id} className={`p-3 border-border/50 bg-card/50 ${allSettled ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-foreground">{bill.description}</span>
                      {allSettled && (
                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full font-bold">All Settled</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={bill.payer?.profilePicture} />
                        <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                          {getInitials(bill.payer)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {isPayer ? 'You' : formatFullName(bill.payer)} paid <span className="font-semibold text-foreground">₱{bill.amount.toFixed(2)}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Split: ₱{splitAmount.toFixed(2)} each · {bill.participants?.length + 1} people
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isPayer && !isSettled && !allSettled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSettle(bill._id)}
                        className="text-sm h-8 gap-1.5 text-green-500 border-green-500/30 hover:bg-green-500/10"
                      >
                        <CheckCircle2 size={14} />
                        Settle
                      </Button>
                    )}
                    {!isPayer && isSettled && (
                      <span className="text-xs text-green-500 font-medium flex items-center gap-0.5">
                        <CheckCircle2 size={12} /> Settled
                      </span>
                    )}
                    {isPayer && (
                      <button onClick={() => onDelete(bill._id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-1.5 mt-2">
                  {bill.participants?.map(p => {
                    const pSettled = bill.settled?.some(s => s._id === p._id);
                    return (
                      <div key={p._id} className="relative">
                        <Avatar className={`w-6 h-6 border ${pSettled ? 'border-green-500' : 'border-border'}`}>
                          <AvatarImage src={p.profilePicture} />
                          <AvatarFallback className="text-[8px] bg-muted">
                            {getInitials(p)}
                          </AvatarFallback>
                        </Avatar>
                        {pSettled && (
                          <CheckCircle2 size={10} className="absolute -bottom-0.5 -right-0.5 text-green-500 fill-background" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LedgerSection;
