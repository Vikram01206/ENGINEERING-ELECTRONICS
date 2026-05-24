import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel'
}: ConfirmationDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus on the cancel button as a safe default operation for dangerous commands
      cancelBtnRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="confirmation-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      <div
        id="confirmation-modal-container"
        className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Visual Header with Warning Accent */}
        <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center gap-3">
          <div className="bg-rose-100 p-2 rounded-full text-crimson">
            <AlertTriangle className="w-5 h-5 text-crimson" />
          </div>
          <h3
            id="confirm-modal-title"
            className="text-lg font-serif font-semibold text-slate-800"
          >
            {title}
          </h3>
        </div>

        {/* Content body */}
        <div className="px-6 py-4 text-slate-600 text-sm leading-relaxed">
          {message}
        </div>

        {/* Footer controls */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            id="confirm-modal-cancel"
            ref={cancelBtnRef}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            id="confirm-modal-action"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-crimson hover:bg-red-800 rounded-md transition-all shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
