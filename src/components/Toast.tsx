'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from '../types';
import { friendlyError } from './AsyncButton';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string };

let pushToast: ((t: Omit<Toast, 'id'>) => void) | null = null;

/** Public helpers — call from anywhere. */
export const notify = {
  success: (msg: string) => pushToast?.({ kind: 'success', message: msg }),
  error: (err: any) => pushToast?.({ kind: 'error', message: friendlyError(err) }),
  info: (msg: string) => pushToast?.({ kind: 'info', message: msg }),
};

export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    pushToast = (t) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), t.kind === 'error' ? 5500 : 3500);
    };
    // Catch otherwise unhandled async errors so users always get a hint.
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = friendlyError(e.reason);
      // Skip the noisy auth-redirect "user is not authenticated" cases.
      if (/not authenticated|JWT/i.test(msg)) return;
      pushToast?.({ kind: 'error', message: msg });
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      pushToast = null;
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, [remove]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            onClick={() => remove(t.id)}
            className={`pointer-events-auto cursor-pointer flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium border ${
              t.kind === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : t.kind === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {t.kind === 'error' && <Icons.Warning size={18} className="shrink-0 mt-0.5" />}
            {t.kind === 'success' && <Icons.CheckCircle size={18} className="shrink-0 mt-0.5" />}
            {t.kind === 'info' && <Icons.Info size={18} className="shrink-0 mt-0.5" />}
            <span className="leading-snug">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
