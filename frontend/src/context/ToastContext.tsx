import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isWarning = toast.type === 'warning';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-lg border bg-white shadow-sm flex items-start gap-3 transition-all ${
                isWarning
                  ? 'border-amber-400 bg-amber-50/40 text-slate-900'
                  : 'border-slate-300 text-slate-900'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isWarning ? (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                ) : toast.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-slate-700" />
                ) : toast.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-indigo-700" />
                ) : (
                  <Info className="w-5 h-5 text-indigo-700" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900">{toast.title}</div>
                {toast.message && (
                  <div className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">
                    {toast.message}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-1 -mr-1 rounded hover:bg-slate-100"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
