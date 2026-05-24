import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isSuccess = type === 'success';

  return (
    <div
      id="toast-notification"
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 animate-slide-in max-w-sm ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-850'
      }`}
    >
      {isSuccess ? (
        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
      )}
      <span className="text-sm font-medium tracking-wide">{message}</span>
      <button
        id="toast-close-btn"
        onClick={onClose}
        className={`p-1 rounded-full text-slate-400 hover:text-slate-600 focus:outline-none transition-colors ml-2`}
        aria-label="Close Notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
