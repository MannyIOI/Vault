'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../types';

/** Extract a short, human-friendly message from any error shape. */
export function friendlyError(err: any): string {
  if (!err) return 'Something went wrong';
  const raw = err?.message ?? String(err);
  // Errors thrown by handleDbError are JSON-stringified DbErrorInfo objects.
  if (typeof raw === 'string' && raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const inner: string = parsed?.error || raw;
      // Translate common Postgres / Supabase failure modes.
      if (/row-level security/i.test(inner)) return "You don't have permission to do that.";
      if (/duplicate key|unique constraint/i.test(inner)) return 'That entry already exists.';
      if (/foreign key|violates.*constraint/i.test(inner)) return 'A required reference is missing.';
      if (/not.*null|null value/i.test(inner)) return 'A required field is missing.';
      if (/network|fetch failed|Failed to fetch/i.test(inner)) return 'Network problem — please retry.';
      // Strip "Code | code" suffix and trailing pipes.
      const short = inner.split('|')[0].trim();
      return short.length > 120 ? short.slice(0, 117) + '…' : short;
    } catch { /* fall through */ }
  }
  return raw.length > 120 ? raw.slice(0, 117) + '…' : raw;
}

type AsyncButtonProps = {
  onClick: () => Promise<any> | any;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  type?: 'button' | 'submit';
  successDurationMs?: number;
  icon?: React.ReactNode;
};

/**
 * Drop-in replacement for <button> that shows visible loading and success
 * states so users always know whether their action succeeded.
 */
export const AsyncButton: React.FC<AsyncButtonProps> = ({
  onClick,
  children,
  className = '',
  disabled,
  loadingLabel,
  successLabel,
  type = 'button',
  successDurationMs = 1600,
  icon,
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (state === 'loading' || disabled) return;
    setState('loading');
    setErrMsg(null);
    try {
      await onClick();
      if (!mountedRef.current) return;
      setState('success');
      setTimeout(() => { if (mountedRef.current) setState('idle'); }, successDurationMs);
    } catch (err: any) {
      if (!mountedRef.current) return;
      setState('error');
      setErrMsg(friendlyError(err));
      setTimeout(() => { if (mountedRef.current) { setState('idle'); setErrMsg(null); } }, 3200);
    }
  };

  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  return (
    <button
      type={type}
      onClick={handle}
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center gap-2 transition-all ${className} ${
        isSuccess ? '!bg-emerald-600 !text-white' : ''
      } ${isError ? '!bg-red-600 !text-white' : ''} ${
        isLoading || disabled ? 'opacity-80 cursor-not-allowed' : ''
      }`}
    >
      {isLoading && (
        <svg className="animate-spin -ml-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {isSuccess && <Icons.CheckCircle size={14} />}
      {isError && <Icons.Warning size={14} />}
      {!isLoading && !isSuccess && !isError && icon}
      <span>
        {isLoading ? (loadingLabel || 'Working…')
          : isSuccess ? (successLabel || 'Done')
          : isError ? (errMsg || 'Failed')
          : children}
      </span>
    </button>
  );
};
