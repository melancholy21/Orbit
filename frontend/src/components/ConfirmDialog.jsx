import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';

const ConfirmDialog = ({
  isOpen,
  title = 'Are you sure?',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onCancel}
      />
      
      {/* Dialog Box */}
      <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl border border-border bg-card p-6 text-left align-middle shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl shrink-0 ${isDestructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
            {isDestructive ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground leading-snug">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground h-9 px-4 rounded-xl cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={onConfirm}
            className="text-xs h-9 px-4 rounded-xl font-semibold shadow-sm cursor-pointer"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
