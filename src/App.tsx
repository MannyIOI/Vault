'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons, Screen, Transaction } from './types';
import {
  auth,
  db,
  loginWithEmail,
  signUpWithEmail,
  logout,
  handleDbError,
  OperationType,
  Timestamp,
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  onAuthStateChanged,
  clearOrgCache,
  type User,
} from './lib/db';



import { QRScanner } from './components/QRScanner';
import { MoneyInput } from './components/MoneyInput';
import { StoreDropdown } from './components/StoreDropdown';
import { Sidebar as NewSidebar } from './components/Sidebar';
import { AsyncButton } from './components/AsyncButton';
import { ToastHost, notify } from './components/Toast';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { BankScreen } from './components/BankScreen';
import { WarehouseScreen } from './components/WarehouseScreen';
import { EmployeeScreen } from './components/EmployeeScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { BankAccount, BankTransaction, Warehouse, InventoryItem, Loan, Contact, Contract } from './types';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl">
            <Icons.Warning size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-6">
              {this.state.error?.message?.startsWith('{') 
                ? "A database error occurred. Please check your permissions." 
                : this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

// --- Shared Components ---


// --- TopBar & Sidebar ---

const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
};

const TopBar = ({ title, showMenu = true, onMenuClick, onNotificationsClick, userData }: { title: string, showMenu?: boolean, onMenuClick?: () => void, onNotificationsClick?: () => void, userData: any }) => {
  const isOnline = useOnlineStatus();
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-primary text-white">
      <div className="flex items-center gap-3">
        {showMenu && <Icons.Menu size={24} onClick={onMenuClick} className="cursor-pointer hover:opacity-80" />}
        <div className="flex flex-col">
          <h1 className="font-headline font-bold text-xl tracking-tight leading-none">{title}</h1>
          {!isOnline && (
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Offline Mode
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Icons.Notifications size={24} onClick={onNotificationsClick} className="cursor-pointer hover:opacity-80" />
        <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-slate-700">
          <img src={userData?.storeLogo || "https://picsum.photos/seed/store/100/100"} alt="Store Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      </div>
    </header>
  );
};

const Sidebar = ({ isOpen, onClose, setScreen, onLogout, userData }: { isOpen: boolean, onClose: () => void, setScreen: (s: Screen) => void, onLogout: () => void, userData: any }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 h-full w-80 bg-primary text-white z-[70] shadow-2xl flex flex-col"
        >
          <div className="p-8 border-b border-white/10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-headline font-bold tracking-tight">EthioVault</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Icons.Close size={24} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-slate-700">
                <img src={userData?.photoURL || "https://picsum.photos/seed/clerk/100/100"} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <p className="font-headline font-bold">{userData?.displayName || 'Unknown'}</p>
                <p className="text-xs text-slate-400">{userData?.role === 'admin' ? 'Administrator' : 'Sales'}</p>
              </div>
            </div>
          </div>
          <div className="flex-grow py-6 overflow-y-auto no-scrollbar">
            <div className="px-4 space-y-2">
              {[
                { screen: 'DASHBOARD' as Screen, icon: 'Dashboard', label: 'Dashboard' },
                { screen: 'VAULT' as Screen, icon: 'Vault', label: 'Stock' },
                { screen: 'NETWORK' as Screen, icon: 'Network', label: 'Network' },
                { screen: 'LEDGER' as Screen, icon: 'Ledger', label: 'Ledger' },
                { screen: 'EXPENSE' as Screen, icon: 'Receipt', label: 'Expenses' },
                { screen: 'RECONCILE' as Screen, icon: 'CheckCircle', label: 'Reconciliation' },
                { screen: 'AUDIT' as Screen, icon: 'History', label: 'Audit Logs' },
                { screen: 'PROFILE' as Screen, icon: 'User', label: 'Profile' },
              ].filter(item => {
                if (userData?.role !== 'admin' && ['AUDIT'].includes(item.screen)) return false;
                return true;
              }).map((item) => {
                const Icon = Icons[item.icon as keyof typeof Icons];
                return (
                  <button
                    key={item.label}
                    onClick={() => { setScreen(item.screen); onClose(); }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-8 border-t border-white/10">
            <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors">
              <Icons.LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const NotificationsOverlay = ({ isOpen, onClose, notifications, setScreen }: { isOpen: boolean, onClose: () => void, notifications: any[], setScreen: (s: Screen) => void }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/20 z-[80] backdrop-blur-[2px] no-print"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="fixed top-20 right-6 w-80 bg-white rounded-2xl shadow-2xl z-[90] overflow-hidden border border-slate-100 no-print"
        >
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-headline font-bold text-sm">Notifications</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Icons.Close size={16} /></button>
          </div>
          <div className="max-h-96 overflow-y-auto no-scrollbar">
            {notifications.length > 0 ? notifications.map((n) => (
              <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-xs text-on-surface">{n.title}</h4>
                  <span className="text-[10px] text-slate-400">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400 text-xs">No notifications</div>
            )}
          </div>
          <button 
            onClick={() => { setScreen('NOTIFICATIONS'); onClose(); }}
            className="w-full py-3 text-xs font-bold text-primary hover:bg-slate-50 transition-colors"
          >
            View All Notifications
          </button>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const ItemHistoryOverlay = ({ item, transactions, onClose, onReturn, onSettle, onToggleMaintenance }: { item: any, transactions: any[], onClose: () => void, onReturn: (item: any) => void, onSettle: (item: any, amount: number) => void, onToggleMaintenance?: (id: string, value: boolean) => void }) => {
  const [isSettling, setIsSettling] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');

  const history = item 
    ? transactions.filter(tx => tx.imei === item.imei).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm no-print"
          />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] z-[110] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] print-area"
            >
              <div className="print-only p-8 border-b-2 border-slate-900 mb-6">
                <h1 className="text-3xl font-headline font-bold">EthioVault Inventory Report</h1>
                <p className="text-slate-500">Generated on {new Date().toLocaleString()}</p>
              </div>
              <div className="p-8 bg-primary text-white print:bg-white print:text-slate-900 print:border-b print:border-slate-200">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-headline font-bold">{item.name}</h3>
                    <p className="text-slate-400 font-mono text-sm mt-1 print:text-slate-600">IMEI: {item.imei}</p>
                  </div>
                  <button onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors no-print">
                    <Icons.Close size={24} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl print:bg-slate-50 print:border print:border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 print:text-slate-500">Current Status</p>
                    <p className={`font-headline font-bold ${item.status === 'IN_STOCK' ? 'text-emerald-400 print:text-emerald-600' : 'text-amber-400 print:text-amber-600'}`}>
                      {(item.status || 'UNKNOWN').replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl print:bg-slate-50 print:border print:border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1 print:text-slate-500">Valuation</p>
                    <p className="font-headline font-bold print:text-slate-900">{Number(item.valuation || 0).toLocaleString()} ETB</p>
                  </div>
                </div>
                {onToggleMaintenance && (
                  <button
                    onClick={() => onToggleMaintenance(item.id, !item.underMaintenance)}
                    className={`mt-4 w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all no-print ${
                      item.underMaintenance
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {item.underMaintenance ? '✓ Currently Under Maintenance — Mark as Returned to Service' : 'Mark as Under Maintenance'}
                  </button>
                )}
              </div>
            <div className="flex-grow overflow-y-auto p-8 no-scrollbar">
              {item.status === 'LENT' && (
                <div className="mb-8 space-y-4">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-600 tracking-widest">Lent To</p>
                      <p className="font-headline font-bold text-amber-900">{item.lentTo || 'Unknown Branch'}</p>
                    </div>
                    <div className="flex gap-2 no-print">
                      <button 
                        onClick={() => onReturn(item)}
                        className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                      >
                        Mark as Returned
                      </button>
                      <button 
                        onClick={() => setIsSettling(!isSettling)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                      >
                        Settle with Cash
                      </button>
                    </div>
                  </div>
                  
                  {isSettling && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4 no-print"
                    >
                      <p className="text-sm font-bold text-emerald-900">Confirm Cash Settlement</p>
                      <p className="text-xs text-emerald-700">The recipient has sold the item and is returning cash instead of the device.</p>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-emerald-600">Amount Received (ETB)</label>
                        <MoneyInput 
                          value={settleAmount} 
                          onChange={setSettleAmount} 
                          className="w-full bg-white border-none rounded-xl py-3 px-4 font-headline font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-200"
                          placeholder={item.valuation.toLocaleString()}
                        />
                      </div>
                      <button 
                        onClick={() => onSettle(item, Number(settleAmount.replace(/,/g, '')) || item.valuation)}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-700 transition-all"
                      >
                        Confirm Settlement
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
              <h4 className="font-headline font-bold text-lg mb-6 flex items-center gap-2">
                <Icons.History size={20} className="text-primary" /> Item Lifecycle
              </h4>
              <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {history.map((tx, idx) => (
                  <div key={tx.id} className="relative pl-12">
                    <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                      tx.type === 'PURCHASE' ? 'bg-blue-500 text-white' :
                      tx.type === 'SALE' ? 'bg-emerald-500 text-white' :
                      tx.type === 'LENT' ? 'bg-amber-500 text-white' : 
                      tx.type === 'RETURNED' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                    }`}>
                      {tx.type === 'PURCHASE' ? <Icons.Package size={16} /> :
                       tx.type === 'SALE' ? <Icons.ShoppingCart size={16} /> :
                       tx.type === 'LENT' ? <Icons.LendPhone size={16} /> : 
                       tx.type === 'RETURNED' ? <Icons.CheckCircle size={16} /> : <Icons.Receipt size={16} />}
                    </div>
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-bold text-on-surface">{tx.type}</h5>
                        <span className="text-xs text-slate-400">{tx.timestamp.split(' ')[0]}</span>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {tx.type === 'PURCHASE' ? `Acquired for ${Math.abs(tx.amount).toLocaleString()} ETB` :
                         tx.type === 'LENT' ? `Lent to ${tx.location || 'External Partner'}` :
                         tx.type === 'RETURNED' ? `Returned to stock from ${tx.location || 'Lending'}` :
                         tx.type === 'SALE' ? `Sold for ${tx.amount.toLocaleString()} ETB` :
                         `Transaction logged by ${tx.clerk}`}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded">Sales: {tx.clerk}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          tx.status === 'SETTLED' || tx.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                        }`}>{tx.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <Icons.Info size={40} className="mx-auto mb-4 opacity-20" />
                    <p>No transaction history found for this item.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50 no-print">
              <button onClick={() => window.print()} className="w-full py-4 bg-primary text-white rounded-2xl font-headline font-bold shadow-lg hover:opacity-90 transition-all">
                Print Item Report
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- Screens ---

const LoginScreen = ({ onLogin }: { onLogin: (email: string, password: string, mode: 'signin' | 'signup', displayName?: string) => Promise<void> }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSignupSuccess(false);
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password, mode, displayName.trim() || undefined);
      if (mode === 'signup') {
        setSignupSuccess(true);
        setMode('signin');
        setPassword('');
        setDisplayName('');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-primary">
      <header className="fixed top-0 w-full z-50 bg-slate-900/50 backdrop-blur-md flex justify-between items-center px-6 py-4">
        <div className="text-xl font-bold text-white tracking-widest uppercase font-headline">Transaction History</div>
        <div className="flex items-center gap-3">
          <Icons.Security size={20} className="text-white" />
          <span className="text-white/80 font-label text-[10px] uppercase tracking-widest">Secure Access</span>
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 p-10">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary">
            <Icons.Shield size={40} />
          </div>
          <h1 className="text-3xl font-bold font-headline text-primary mb-2 text-center">EthioVault</h1>
          <p className="text-slate-500 text-sm mb-8 text-center">
            {mode === 'signin' ? 'Sign in to your account.' : 'Create a new account.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100"
            >
              {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setError(null); setSignupSuccess(false); setMode(mode === 'signin' ? 'signup' : 'signin'); }}
            className="mt-6 w-full text-sm text-slate-500 hover:text-primary transition"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          <p className="mt-6 text-[10px] text-slate-400 uppercase tracking-widest font-bold text-center">
            Authorized Personnel Only
          </p>
        </div>
      </main>
      {signupSuccess && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => setSignupSuccess(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Icons.CheckCircle size={32} />
            </div>
            <h2 className="font-headline text-2xl font-bold text-primary mb-2">Account Created</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your account was created successfully. Please sign in to continue.
            </p>
            <button
              type="button"
              onClick={() => setSignupSuccess(false)}
              className="w-full bg-primary text-white py-3 rounded-2xl font-headline font-bold shadow-lg active:scale-95 transition-all"
            >
              Continue to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileScreen = ({ onBack, user, userData, onUpdate, canInstall, onInstall }: { onBack: () => void, user: User | null, userData: any, onUpdate: (data: any) => void, canInstall: boolean, onInstall: () => void }) => {
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photoURL, setPhotoURL] = useState(userData?.photoURL || '');
  const [storeLogo, setStoreLogo] = useState(userData?.storeLogo || '');

  const handleSave = () => {
    onUpdate({ displayName, email, photoURL, storeLogo });
    onBack();
  };

  const isAdmin = userData?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#F7F9FB] pb-32">
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <section className="py-8">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={onBack} className="p-2 bg-white rounded-lg shadow-sm text-slate-600">
              <Icons.Close size={20} />
            </button>
            <span className="font-label text-[0.75rem] font-bold uppercase tracking-[0.2em] text-primary">Profile Settings</span>
          </div>
          <h2 className="font-headline text-5xl font-bold leading-tight mt-2 text-primary tracking-tighter">Edit Profile</h2>
        </section>
        <div className="bg-white rounded-xl p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
            />
          </div>
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
            />
          </div>
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Profile Picture URL</label>
            <input 
              type="text" 
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
            />
          </div>

          {isAdmin && (
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="space-y-2">
                <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Store Logo URL (Admin Only)</label>
                <input 
                  type="text" 
                  value={storeLogo}
                  onChange={(e) => setStoreLogo(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                />
              </div>
              <button 
                onClick={() => { onBack(); (window as any).setScreen('INVITE'); }}
                className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-xl font-headline font-bold text-sm tracking-wide hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
              >
                <Icons.Security size={20} /> Invite Sales
              </button>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">System & Installation</h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              To install this app, you must first open it in a new tab. Then use your browser's menu to "Add to Home Screen".
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-headline font-bold text-sm tracking-wide hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                <Icons.ArrowUpRight size={20} /> Open in New Tab
              </button>
              <button 
                onClick={onInstall}
                disabled={!canInstall}
                className={`w-full py-4 rounded-xl font-headline font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${canInstall ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}
              >
                <Icons.Package size={20} /> {canInstall ? 'Add to Homescreen' : 'App is Installed'}
              </button>
            </div>
          </div>

          <button onClick={handleSave} className="w-full py-5 bg-primary text-white rounded-xl font-headline font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3">
            <Icons.CheckCircle size={24} /> Save Changes
          </button>
        </div>
      </main>
    </div>
  );
};

const TransactionDetailsOverlay = ({ transaction, onClose, onDelete, isAdmin }: { transaction: any, onClose: () => void, onDelete: (id: string) => void, isAdmin: boolean }) => {
  if (!transaction) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-[120] backdrop-blur-sm no-print"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] z-[130] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-8 bg-primary text-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-headline font-bold">{transaction.item}</h3>
              <p className="text-slate-400 font-mono text-sm mt-1">ID: {transaction.id}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              <Icons.Close size={24} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Type</p>
              <p className="font-headline font-bold text-emerald-400">{transaction.type}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Amount</p>
              <p className="font-headline font-bold">{transaction.amount.toLocaleString()} ETB</p>
            </div>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-8 space-y-6 no-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Sales</p>
              <p className="font-headline font-bold text-on-surface">{transaction.clerk}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Timestamp</p>
              <p className="font-headline font-bold text-on-surface">{new Date(transaction.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Status</p>
              <p className="font-headline font-bold text-on-surface">{transaction.status}</p>
            </div>
            {transaction.imei && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">IMEI</p>
                <p className="font-headline font-bold text-on-surface">{transaction.imei}</p>
              </div>
            )}
            {transaction.location && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Location</p>
                <p className="font-headline font-bold text-on-surface">{transaction.location}</p>
              </div>
            )}
          </div>
          
          {isAdmin && (
            <div className="pt-8 border-t border-slate-100">
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
                    onDelete(transaction.id);
                    onClose();
                  }
                }}
                className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-headline font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <Icons.Close size={20} /> Delete Transaction
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const VaultDashboardScreen = ({ setScreen, transactions, metrics, onTransactionClick }: { setScreen: (s: Screen) => void, transactions: any[], metrics: any, onTransactionClick: (tx: any) => void }) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <Icons.Smartphone size={20} />;
      case 'PURCHASE': return <Icons.Package size={20} />;
      case 'LENT': return <Icons.ArrowLeftRight size={20} />;
      case 'EXPENSE': return <Icons.Receipt size={20} />;
      case 'TRANSFER': return <Icons.Send size={20} />;
      case 'RETURNED': return <Icons.History size={20} />;
      default: return <Icons.Receipt size={20} />;
    }
  };

  return (
  <div className="min-h-screen bg-[#F7F9FB] pt-24 pb-32 px-4">
    <main className="max-w-lg mx-auto space-y-8">
      <section className="grid grid-cols-2 gap-3">
        <div className="col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-50">
          <p className="text-slate-400 font-label text-xs uppercase tracking-wider mb-1">Cash on Hand</p>
          <h2 className="font-headline font-extrabold text-3xl text-emerald-600">
            <span className="text-lg font-medium opacity-60 mr-1">ETB</span>{metrics.cashOnHand.toLocaleString()}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50">
          <p className="text-slate-400 font-label text-[10px] uppercase tracking-wider mb-1">Inventory Value</p>
          <p className="font-headline font-bold text-lg text-on-surface">{metrics.inventoryValue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-50">
          <p className="text-slate-400 font-label text-[10px] uppercase tracking-wider mb-1">Receivable</p>
          <p className="font-headline font-bold text-lg text-emerald-600">{metrics.receivable.toLocaleString()}</p>
        </div>
        <div 
          onClick={() => setScreen('DEBTS')}
          className="col-span-2 bg-red-50 p-5 rounded-3xl flex justify-between items-center cursor-pointer hover:bg-red-100 transition-colors"
        >
          <div>
            <p className="text-red-700 font-label text-[10px] uppercase tracking-wider mb-1">Payable</p>
            <p className="font-headline font-bold text-xl text-red-600">{metrics.payable.toLocaleString()} ETB</p>
          </div>
          <Icons.TrendingDown size={32} className="text-red-600 opacity-20" />
        </div>
      </section>

      <section>
        <h3 className="font-headline font-semibold text-lg mb-4 px-2">Quick Actions</h3>
        <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2 px-1">
          <button onClick={() => setScreen('SALE')} className="flex-shrink-0 flex flex-col items-center gap-2 bg-primary text-white p-4 rounded-xl min-w-[100px] hover:opacity-90 transition-all active:scale-95">
            <Icons.NewSale size={24} />
            <span className="font-label text-xs font-medium">New Sale</span>
          </button>
          <button onClick={() => setScreen('PURCHASE')} className="flex-shrink-0 flex flex-col items-center gap-2 bg-slate-200 text-on-surface p-4 rounded-xl min-w-[100px] hover:bg-slate-300 transition-all active:scale-95">
            <Icons.LogPurchase size={24} />
            <span className="font-label text-xs font-medium">Log Purchase</span>
          </button>
          <button onClick={() => setScreen('LEND')} className="flex-shrink-0 flex flex-col items-center gap-2 bg-secondary-100 text-secondary-700 p-4 rounded-xl min-w-[100px] hover:opacity-90 transition-all active:scale-95">
            <Icons.LendPhone size={24} />
            <span className="font-label text-xs font-medium">Lend Phone</span>
          </button>
          <button onClick={() => setScreen('RECONCILE')} className="flex-shrink-0 flex flex-col items-center gap-2 bg-emerald-100 text-emerald-800 p-4 rounded-xl min-w-[100px] hover:opacity-90 transition-all active:scale-95">
            <Icons.CheckCircle size={24} />
            <span className="font-label text-xs font-medium">Reconcile</span>
          </button>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex justify-between items-end mb-4 px-2">
          <h3 className="font-headline font-semibold text-lg">Recent Activity</h3>
          <button onClick={() => setScreen('LEDGER')} className="text-primary-container font-label text-xs font-bold">VIEW HISTORY</button>
        </div>
        <div className="space-y-3">
          {transactions.slice(0, 3).map((tx: any) => (
            <div 
              key={tx.id} 
              onClick={() => onTransactionClick(tx)}
              className="bg-white p-4 rounded-xl flex items-center justify-between group shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.amount >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {getTransactionIcon(tx.type)}
                </div>
                <div>
                  <h4 className="font-body font-bold text-sm text-on-surface">{tx.item}</h4>
                  <p className="font-label text-[10px] text-slate-400 uppercase tracking-wider">{tx.clerk} • {tx.timestamp.split(' ')[1]}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-headline font-bold text-sm ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                </p>
                <p className="font-label text-[10px] text-slate-400 uppercase">ETB</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
    <button onClick={() => setScreen('PURCHASE')} className="fixed bottom-24 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform z-50">
      <Icons.Plus size={32} />
    </button>
  </div>
  );
};

const VaultScreen = ({ inventory, onItemClick, onMoveItem, warehouses, onOpenSidebar, initialWarehouseId = 'ALL', userData, onApproveItem, onLogPurchase, onToggleMaintenance }: { inventory: any[], onItemClick: (item: any) => void, onMoveItem: (id: string, wId: string) => void, warehouses: Warehouse[], onOpenSidebar: () => void, initialWarehouseId?: string, userData?: any, onApproveItem?: (id: string) => void, onLogPurchase?: () => void, onToggleMaintenance?: (id: string, value: boolean) => void }) => {
  const [filter, setFilter] = useState('ALL ITEMS');
  const [statusFilter, setStatusFilter] = useState('ALL STATUS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(initialWarehouseId);

  useEffect(() => {
    if (initialWarehouseId !== 'ALL') {
      setSelectedWarehouseId(initialWarehouseId);
    }
  }, [initialWarehouseId]);

  const [movingItem, setMovingItem] = useState<any | null>(null);

  const filteredInventory = inventory.filter(item => {
    const matchesFilter = filter === 'ALL ITEMS' || item.category === filter;
    const matchesStatus =
      statusFilter === 'ALL STATUS' ? true :
      statusFilter === 'MAINTENANCE' ? !!item.underMaintenance :
      item.status === statusFilter;
    const matchesSearch = (item.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                         (item.imei?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesWarehouse = selectedWarehouseId === 'ALL' || item.warehouseId === selectedWarehouseId;
    return matchesFilter && matchesSearch && matchesStatus && matchesWarehouse;
  });

  const totalValue = filteredInventory.reduce((sum, item) => item.status === 'IN_STOCK' ? sum + (item.valuation || 0) : sum, 0);
  
  const isManagerForCurrentWarehouse = userData?.role === 'warehouse_manager' && (selectedWarehouseId === userData?.warehouseId);
  const isAdmin = userData?.role === 'admin';
  const canApprove = (isAdmin || isManagerForCurrentWarehouse);

  const pendingItems = inventory.filter(i => i.status === 'PENDING_APPROVAL' && (isAdmin || i.warehouseId === userData?.warehouseId));

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {isScanning && <QRScanner onScan={(text) => setSearchQuery(text)} onClose={() => setIsScanning(false)} />}
      <div className="pt-16 sm:pt-20 px-4 sm:px-6 pb-8 sm:pb-12 bg-white border-b border-slate-100 rounded-b-[2rem] sm:rounded-b-[3rem] shadow-sm relative overflow-hidden">
        {/* Background Decorative Pattern */}
        <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-[0.03] pointer-events-none">
          <Icons.Store size={180} className="sm:size-[280px] rotate-12 text-primary" />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 relative z-10">
           <div className="flex items-center gap-3 sm:gap-4">
             <button 
               onClick={onOpenSidebar}
               className="lg:hidden w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all shadow-inner"
             >
               <Icons.Menu size={18} />
             </button>
             <div>
               <h2 className="text-xl sm:text-3xl font-headline font-bold text-primary tracking-tight">Stock Explorer</h2>
               <p className="text-slate-400 text-[10px] sm:text-xs font-medium uppercase tracking-[0.2em] mt-0.5 sm:mt-1">All Store Items</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
              {onLogPurchase && (
                <button
                  onClick={onLogPurchase}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-[14px] text-xs font-bold shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Icons.Plus size={14} />
                  <span>Log Purchase</span>
                </button>
              )}
              <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl sm:rounded-[14px] shadow-inner">
                <button 
                  onClick={() => setViewMode('LIST')}
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white text-primary shadow-sm scale-105' : 'text-slate-400 hover:bg-white/50'}`}
                >
                  <Icons.Ledger size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('GRID')}
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-white text-primary shadow-sm scale-105' : 'text-slate-400 hover:bg-white/50'}`}
                >
                  <Icons.DashboardGrid size={16} />
                </button>
              </div>
           </div>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-3 relative z-10">
          <div className="relative flex-1">
            <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 sm:py-4.5 pl-12 sm:pl-14 pr-4 text-sm sm:text-base text-on-surface placeholder:text-slate-300 focus:ring-2 focus:ring-primary/5 transition-all outline-none" 
              placeholder="Search IMEI, Model or Serial..." 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsScanning(true)} className="bg-primary text-white p-4 sm:p-4.5 rounded-2xl shadow-xl shadow-primary/10 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center">
            <Icons.Search size={20} />
          </button>
        </div>

        <div className="mt-6 sm:mt-8 relative z-10">
           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-6 px-6 sm:mx-0 sm:px-0">
                {['ALL ITEMS', 'PHONES', 'TABLETS', 'ACCESSORIES'].map((f) => (
                  <button 
                    key={f} 
                    onClick={() => setFilter(f)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-[0.1em] transition-all ${
                      filter === f ? 'bg-primary text-white shadow-lg translate-y-[-2px]' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full lg:w-auto">
                 <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-1 lg:flex-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer hover:bg-slate-100 transition-all min-w-[120px]"
                 >
                    <option value="ALL STATUS">ALL STATUS</option>
                    <option value="IN_STOCK">IN STOCK</option>
                    <option value="LENT">LENT</option>
                    <option value="SOLD">SOLD</option>
                    <option value="IN_TRANSIT">IN TRANSIT</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                 </select>

                 <select 
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="flex-1 lg:flex-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer hover:bg-slate-100 transition-all min-w-[120px]"
                 >
                    <option value="ALL">ALL WAREHOUSES</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                    ))}
                 </select>
              </div>
           </div>
      </div>
      </div>

      <main className="px-6 py-10 max-w-7xl mx-auto space-y-12">
        {pendingItems.length > 0 && canApprove && (
          <section className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white">
                <Icons.CheckCircle size={20} />
              </div>
              <div>
                <h3 className="font-headline font-bold text-amber-900">Pending Approvals</h3>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">{pendingItems.length} Items waiting for authorization</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingItems.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-3xl border border-amber-100 flex items-center justify-between group shadow-sm">
                  <div>
                    <h4 className="font-headline font-bold text-slate-800 text-sm">{item.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.imei}</p>
                  </div>
                  <button 
                    onClick={() => onApproveItem?.(item.id)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
           <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Store Stock</p>
            </div>
            <h2 className="font-headline font-bold text-3xl sm:text-4xl text-on-surface tracking-tighter truncate">Store Items</h2>
          </div>
          <div className="text-left sm:text-right bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 w-full sm:w-auto shrink-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">Aggregate Valuation</p>
            <p className="font-headline font-black text-2xl sm:text-3xl text-primary leading-none break-words">{(totalValue || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ETB</span></p>
          </div>
        </div>

        {filteredInventory.length > 0 ? (
          <div className={viewMode === 'GRID' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8" : "bg-white rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50"}>
            {filteredInventory.map(item => (
              <div 
                key={item.id} 
                onClick={() => onItemClick(item)}
                className={`group transition-all cursor-pointer ${
                  viewMode === 'GRID' 
                    ? 'bg-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 border border-slate-100 relative overflow-hidden' 
                    : 'p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 gap-4'
                }`}
              >
                {viewMode === 'GRID' && (
                  <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                     {item.category === 'PHONES' ? <Icons.Smartphone size={80} className="sm:size-[120px]" /> : <Icons.Package size={80} className="sm:size-[120px]" />}
                  </div>
                )}

                <div className={`flex gap-4 sm:gap-6 ${viewMode === 'LIST' ? 'items-center' : 'flex-col'}`}>
                  <div className={`rounded-2xl sm:rounded-3xl flex items-center justify-center transition-colors shadow-inner shrink-0 ${
                    item.status === 'IN_STOCK' ? 'bg-emerald-50 text-emerald-600' : 
                    item.status === 'SOLD' ? 'bg-slate-100 text-slate-400' : 
                    item.status === 'LENT' ? 'bg-amber-50 text-amber-600' : 
                    item.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'
                  } ${viewMode === 'LIST' ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-20 h-20'}`}>
                    {item.category === 'PHONES' ? <Icons.Smartphone size={viewMode === 'LIST' ? 20 : 32} /> : 
                     item.category === 'TABLETS' ? <Icons.Laptop size={viewMode === 'LIST' ? 20 : 32} /> : 
                     <Icons.Package size={viewMode === 'LIST' ? 20 : 32} />}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    <h3 className={`font-headline font-bold text-on-surface group-hover:text-primary transition-colors truncate ${viewMode === 'LIST' ? 'text-base sm:text-lg' : 'text-xl'}`}>{item.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase truncate max-w-[120px]">IMEI: {item.imei}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200 hidden sm:block" />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'IN_STOCK' ? 'text-emerald-500' :
                        item.status === 'SOLD' ? 'text-slate-400' :
                        item.status === 'PENDING_APPROVAL' ? 'text-amber-600 animate-pulse' :
                        'text-amber-500'
                      }`}>{item.status.replace('_', ' ')}</span>
                      {item.underMaintenance && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                          ⚠ Maintenance
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`${viewMode === 'GRID' ? 'mt-8 pt-8 border-t border-slate-50 flex items-center justify-between' : 'flex items-center justify-between sm:justify-end gap-6 sm:gap-12 w-full sm:w-auto'}`}>
                  <div className={viewMode === 'GRID' ? '' : 'text-left min-w-0 sm:min-w-[140px]'}>
                    <div className="flex items-center gap-2 mb-1">
                       <Icons.Vault size={12} className="text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[80px] sm:max-w-none">{warehouses.find(w => w.id === item.warehouseId)?.name || 'CENTRAL HUB'}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 font-medium">Updated just now</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Asset Value</p>
                    <p className="font-headline font-bold text-base sm:text-lg text-primary">{(item.valuation || 0).toLocaleString()} <span className="text-xs">ETB</span></p>
                  </div>
                  {viewMode === 'LIST' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovingItem(item);
                      }}
                      className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-primary hidden sm:block"
                    >
                      <Icons.ArrowLeftRight size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icons.Search size={40} className="text-slate-200" />
             </div>
             <h3 className="text-xl font-headline font-bold text-slate-400">No assets matching criteria</h3>
             <p className="text-slate-400 mt-2 max-w-xs mx-auto text-sm">Adjust your filters or try a different search query to locate items.</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {movingItem && (
          <div className="fixed inset-0 bg-primary/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Change Warehouse</h3>
                <button onClick={() => setMovingItem(null)} className="p-2 text-slate-400 hover:text-on-surface">
                  <Icons.Close size={24} />
                </button>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl mb-8 flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary">
                    <Icons.Smartphone size={24} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Currently in</p>
                    <p className="font-headline font-bold text-on-surface">{warehouses.find(w => w.id === movingItem.warehouseId)?.name || 'Central Hub'}</p>
                 </div>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                {warehouses.map(w => (
                  <button 
                    key={w.id}
                    onClick={() => {
                      onMoveItem(movingItem.id, w.id);
                      setMovingItem(null);
                    }}
                    disabled={w.id === movingItem.warehouseId}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                      w.id === movingItem.warehouseId 
                        ? 'border-emerald-500 bg-emerald-50 cursor-default' 
                        : 'border-slate-100 hover:border-primary/20 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                       <p className={`font-bold transition-colors ${w.id === movingItem.warehouseId ? 'text-emerald-700' : 'text-on-surface group-hover:text-primary'}`}>{w.name}</p>
                       <p className="text-xs text-slate-400">{w.location}</p>
                    </div>
                    {w.id === movingItem.warehouseId ? (
                      <Icons.CheckCircle className="text-emerald-500" size={20} />
                    ) : (
                      <Icons.ArrowRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button onClick={() => onItemClick({ isNew: true })} className="fixed bottom-24 right-6 w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-50">
        <Icons.Plus size={32} />
      </button>
    </div>
  );
};

const SalesHistoryScreen = ({ transactions, onOpenSidebar, onSetScreen, onSetTransaction }: { transactions: Transaction[], onOpenSidebar: () => void, onSetScreen: (s: Screen) => void, onSetTransaction: (t: Transaction) => void }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'EXPENSE' | 'LOAN' | 'REPAYMENT' | 'LENT' | 'RETURNED' | 'TRANSFER'>('ALL');

  const moneyTypes = ['SALE','PURCHASE','EXPENSE','LOAN','REPAYMENT','LENT','RETURNED','BORROWED','TRANSFER'] as const;
  const filtered = transactions.filter(t =>
    moneyTypes.includes(t.type as any) &&
    (typeFilter === 'ALL' || t.type === typeFilter) &&
    (
      (t.item?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (t.imei || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.clerk || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const styleFor = (type: string) => {
    switch (type) {
      case 'SALE':       return { color: 'text-emerald-600', dot: 'bg-emerald-500', icon: <Icons.Smartphone size={24} />, label: 'Sale',           sign: '+' };
      case 'PURCHASE':   return { color: 'text-blue-600',    dot: 'bg-blue-500',    icon: <Icons.Package size={24} />,    label: 'Purchase',       sign: '-' };
      case 'EXPENSE':    return { color: 'text-red-600',     dot: 'bg-red-500',     icon: <Icons.Receipt size={24} />,    label: 'Expense',        sign: '-' };
      case 'LOAN':       return { color: 'text-amber-600',   dot: 'bg-amber-500',   icon: <Icons.ArrowLeftRight size={24} />, label: 'Loan',       sign: ''  };
      case 'REPAYMENT':  return { color: 'text-tertiary-600',  dot: 'bg-tertiary-500',  icon: <Icons.History size={24} />,    label: 'Repayment',      sign: ''  };
      case 'LENT':       return { color: 'text-amber-600',   dot: 'bg-amber-500',   icon: <Icons.LendPhone size={24} />,  label: 'Item Lent',      sign: ''  };
      case 'RETURNED':   return { color: 'text-emerald-600', dot: 'bg-emerald-500', icon: <Icons.CheckCircle size={24} />, label: 'Item Returned', sign: '+' };
      case 'BORROWED':   return { color: 'text-blue-600',    dot: 'bg-blue-500',    icon: <Icons.ArrowLeftRight size={24} />, label: 'Borrowed',   sign: '+' };
      case 'TRANSFER':   return { color: 'text-slate-600',   dot: 'bg-slate-500',   icon: <Icons.Send size={24} />,       label: 'Transfer',       sign: ''  };
      default:           return { color: 'text-slate-600',   dot: 'bg-slate-500',   icon: <Icons.Receipt size={24} />,    label: type,             sign: ''  };
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
         <div className="flex items-center gap-6">
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all font-bold"
            >
              <Icons.Menu size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Money Records</p>
              </div>
              <h2 className="text-4xl font-headline font-bold tracking-tighter text-primary">All Transactions</h2>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <div className="relative group">
              <Icons.Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search item, IMEI, person, sales…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-emerald-500/10 transition-all min-w-[280px] outline-none"
              />
            </div>
            <button onClick={() => onSetScreen('SALE')} className="flex items-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 hover:opacity-90 active:scale-95 transition-all">
               <Icons.Plus size={20} />
               <span>New Sale</span>
            </button>
         </div>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
        {(['ALL','SALE','PURCHASE','EXPENSE','LOAN','REPAYMENT','LENT','RETURNED','TRANSFER'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shrink-0 ${
              typeFilter === t ? 'bg-primary text-white shadow-md' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t === 'ALL' ? 'All' : t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
         <div className="p-8 border-b border-slate-50 flex justify-between items-center flex-wrap gap-4">
            <h3 className="font-headline font-bold text-on-surface">Transaction History · {filtered.length}</h3>
            <div className="flex items-center gap-4 flex-wrap">
              {(['SALE','PURCHASE','EXPENSE','LOAN','LENT'] as const).map(t => {
                const s = styleFor(t);
                return (
                  <div key={t} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                  </div>
                );
              })}
            </div>
         </div>
         <div className="p-4 sm:p-8">
            {filtered.length > 0 ? (
              <div className="space-y-4">
                {filtered.map(tx => {
                  const s = styleFor(tx.type);
                  const counterparty = tx.location || (tx as any).branch || '';
                  return (
                    <div key={tx.id} onClick={() => onSetTransaction(tx)} className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between hover:bg-white hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer border border-transparent hover:border-slate-100 group">
                       <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-slate-50 ${s.color}`}>
                             {s.icon}
                          </div>
                          <div>
                             <h4 className="font-headline font-bold text-on-surface">{tx.item}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                               {s.label}
                               {counterparty && ` · ${counterparty}`}
                               {` · ${tx.clerk}`}
                               {` · ${new Date(tx.timestamp).toLocaleString()}`}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={`text-lg font-headline font-bold ${s.color}`}>
                            {tx.amount > 0 ? s.sign : ''}{Math.abs(tx.amount).toLocaleString()} ETB
                          </p>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{tx.status || 'Completed'}</p>
                       </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400">
                 <Icons.Sales size={48} className="mx-auto mb-4 opacity-10" />
                 <p className="font-headline font-bold">No records found matching your search</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

const NetworkOverviewScreen = ({ transactions, warehouses, metrics, onOpenSidebar, onSetScreen }: { transactions: Transaction[], warehouses: Warehouse[], metrics: any, onOpenSidebar: () => void, onSetScreen: (s: Screen) => void }) => {
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('ALL');
  
  const filtered = transactions.filter(tx => 
    (tx.type === 'TRANSFER' || tx.type === 'LENT') &&
    ((tx.item?.toLowerCase() || '').includes(search.toLowerCase()) || (tx.imei || '').toLowerCase().includes(search.toLowerCase())) &&
    (warehouseId === 'ALL' || tx.source === warehouseId || tx.location === warehouseId)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={onOpenSidebar} className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 font-bold">
            <Icons.Menu size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Status Hub</p>
            </div>
            <h2 className="font-headline text-3xl font-bold text-primary tracking-tighter">Network Overview</h2>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative group flex-grow sm:flex-none sm:w-48">
              <Icons.Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search item/IMEI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-emerald-500/10 outline-none w-full"
              />
           </div>
           <select 
             value={warehouseId}
             onChange={(e) => setWarehouseId(e.target.value)}
             className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold shadow-sm outline-none cursor-pointer"
           >
             <option value="ALL">ALL WAREHOUSES</option>
             {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
           </select>
        </div>
      </header>
      
      <main>
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
         <div className="relative group flex-grow">
            <Icons.Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search item/IMEI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-emerald-500/10 outline-none w-full transition-all"
            />
         </div>
         <select 
           value={warehouseId}
           onChange={(e) => setWarehouseId(e.target.value)}
           className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold shadow-sm outline-none cursor-pointer min-w-[180px]"
         >
           <option value="ALL">ALL WAREHOUSES</option>
           {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
         </select>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-10">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full text-[10px]">RECEIVABLE</span>
              <Icons.ArrowUpRight className="text-emerald-600" size={24} />
            </div>
            <div>
              <div className="font-headline text-3xl font-bold text-on-surface">
                <span className="text-emerald-600">ETB</span> {metrics.receivable.toLocaleString()}
              </div>
              <p className="text-slate-500 text-xs mt-1">Assets currently deployed</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-700 uppercase tracking-wider bg-amber-50 px-3 py-1 rounded-full text-[10px]">PAYABLE</span>
              <Icons.ArrowDownLeft className="text-amber-600" size={24} />
            </div>
            <div>
              <div className="font-headline text-3xl font-bold text-on-surface">
                <span className="text-amber-600">ETB</span> {metrics.payable.toLocaleString()}
              </div>
              <p className="text-slate-500 text-xs mt-1">Assets currently inbound</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <button onClick={() => onSetScreen('TRANSFER')} className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-opacity">
          <Icons.Plus size={20} /> Log Network Transfer
        </button>
        <div className="space-y-4 pb-20">
          <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-slate-400 ml-1 italic">Movement History</h3>
          {filtered.length > 0 ? filtered.map((act, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl flex items-center justify-between shadow-sm hover:bg-slate-50 transition-colors group border border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-primary">
                  <Icons.Smartphone size={24} />
                </div>
                <div>
                  <h4 className="font-headline font-semibold text-on-surface group-hover:text-primary transition-colors">{act.item}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-slate-400 text-[10px] flex items-center gap-1 font-medium"><Icons.Store size={12} /> {act.location || act.source || 'Storage'}</span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tight">{act.timestamp.split(' ')[1]}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${act.type === 'LENT' || act.direction === 'SEND' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {act.type === 'LENT' ? 'LEND' : act.direction}
                </div>
                <div className="font-headline font-bold text-on-surface">ETB {Math.abs(act.amount || 0).toLocaleString()}</div>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-bold">
               No movements found matching your filters
            </div>
          )}
        </div>
      </div>
    </main>
  </div>
  );
};

const LedgerScreen = ({
  loans,
  contacts,
  onOpenSidebar,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSettleLoan,
  onAddLoan,
  bankAccounts,
}: {
  loans: Loan[];
  contacts: Contact[];
  onOpenSidebar: () => void;
  onAddContact: (c: Partial<Contact>) => Promise<Contact | null>;
  onUpdateContact: (id: string, patch: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onSettleLoan: (loan: Loan, amount?: number) => void;
  onAddLoan: (loan: Partial<Loan>) => void;
  bankAccounts: BankAccount[];
}) => {
  const [tab, setTab] = useState<'Summary' | 'Contacts' | 'Adjustments'>('Summary');
  const [contactSearch, setContactSearch] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [contactDraft, setContactDraft] = useState<Partial<Contact>>({ name: '', type: 'BOTH' });
  const [adjustDraft, setAdjustDraft] = useState<Partial<Loan>>({ type: 'RECEIVED', counterparty: '', amount: 0, notes: '' });

  // Resolve a "contact key" for every loan. If a loan has contact_id we use it;
  // otherwise we fall back to the free-text counterparty so legacy data still
  // groups sensibly.
  const keyFor = (l: Loan) => l.contactId || `name:${(l.counterparty || 'Unknown').trim().toLowerCase()}`;
  const labelFor = (l: Loan) => {
    if (l.contactId) {
      const c = contacts.find(c => c.id === l.contactId);
      if (c) return c.name;
    }
    return l.counterparty || 'Unknown';
  };

  const outstandingLoans = loans.filter(l => l.status === 'OUTSTANDING');
  const settledLoans = loans.filter(l => l.status === 'SETTLED');

  // Aggregate by contact key
  const aggregate = (filterType: Loan['type']) => {
    const map = new Map<string, { label: string; total: number; contactId?: string }>();
    outstandingLoans.filter(l => l.type === filterType).forEach(l => {
      const k = keyFor(l);
      const cur = map.get(k) || { label: labelFor(l), total: 0, contactId: l.contactId };
      cur.total += Number(l.amount || 0);
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  // GIVEN = we lent → receivable. RECEIVED = we owe → payable.
  const receivablesByContact = aggregate('GIVEN');
  const payablesByContact = aggregate('RECEIVED');

  const totalReceivables = receivablesByContact.reduce((s, x) => s + x.total, 0);
  const totalPayables = payablesByContact.reduce((s, x) => s + x.total, 0);
  const netPosition = totalReceivables - totalPayables;
  const collectedAmount = settledLoans.filter(l => l.type === 'GIVEN').reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalGivenEver = collectedAmount + totalReceivables;
  const collectionRate = totalGivenEver > 0 ? (collectedAmount / totalGivenEver) * 100 : 0;

  const customersCount = receivablesByContact.length;
  const vendorsCount = payablesByContact.length;

  const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: max > 0 ? `${Math.max(2, (value / max) * 100)}%` : '0%' }} />
    </div>
  );

  const TopList = ({
    title,
    subtitle,
    items,
    color,
    accent,
  }: {
    title: string;
    subtitle: string;
    items: { label: string; total: number }[];
    color: 'red' | 'green';
    accent: string;
  }) => {
    const max = items[0]?.total || 0;
    const top = items.slice(0, 10);
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Icons.Store size={18} className={color === 'red' ? 'text-red-500' : 'text-emerald-500'} />
          <h3 className="font-headline font-bold text-on-surface">{title}</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">{subtitle}</p>
        {top.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No entries yet</div>
        ) : (
          <ul className="space-y-4">
            {top.map((it, i) => (
              <li key={i}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="font-bold text-sm text-on-surface truncate pr-3">{it.label}</span>
                  <span className={`font-bold text-sm shrink-0 ${color === 'red' ? 'text-red-600' : 'text-emerald-600'}`}>
                    ETB {it.total.toLocaleString()}
                  </span>
                </div>
                <Bar value={it.total} max={max} color={accent} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Per-contact balances for the Contacts tab
  const balanceFor = (contactId: string) => {
    const rs = outstandingLoans.filter(l => l.contactId === contactId);
    const receivable = rs.filter(l => l.type === 'GIVEN').reduce((s, l) => s + Number(l.amount || 0), 0);
    const payable = rs.filter(l => l.type === 'RECEIVED').reduce((s, l) => s + Number(l.amount || 0), 0);
    return { receivable, payable, net: receivable - payable };
  };

  const filteredContacts = contacts
    .filter(c => !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Adjustments tab: chronological list of every loan/repayment row.
  const adjustments = [...loans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openNewContact = () => {
    setEditingContact(null);
    setContactDraft({ name: '', type: 'BOTH' });
    setShowContactModal(true);
  };
  const openEditContact = (c: Contact) => {
    setEditingContact(c);
    setContactDraft({ name: c.name, type: c.type, phone: c.phone, email: c.email, notes: c.notes });
    setShowContactModal(true);
  };
  const submitContact = async () => {
    if (!contactDraft.name?.trim()) return;
    if (editingContact) {
      await onUpdateContact(editingContact.id, contactDraft);
    } else {
      await onAddContact(contactDraft);
    }
    setShowContactModal(false);
  };

  return (
    <div className="flex-1 bg-[#F7F9FB] min-h-screen p-4 lg:p-8 pb-32">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <Icons.Menu size={20} />
          </button>
          <div className="hidden lg:flex w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 items-center justify-center text-slate-400">
            <Icons.Ledger size={20} />
          </div>
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Ledger</h2>
            <p className="text-xs text-slate-400 font-medium">Manage payables and receivables</p>
          </div>
        </div>
        <div className="flex bg-white rounded-xl border border-slate-100 shadow-sm p-1">
          {(['Summary', 'Contacts', 'Adjustments'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t ? 'bg-slate-100 text-on-surface' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {tab === 'Summary' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 font-medium">
                <Icons.ArrowDownLeft size={16} className="text-red-500" /> Total Payables
              </div>
              <p className="font-headline font-bold text-2xl text-red-600">ETB {totalPayables.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{vendorsCount} vendor{vendorsCount === 1 ? '' : 's'}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 font-medium">
                <Icons.ArrowUpRight size={16} className="text-emerald-500" /> Total Receivables
              </div>
              <p className="font-headline font-bold text-2xl text-emerald-600">ETB {totalReceivables.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{customersCount} customer{customersCount === 1 ? '' : 's'}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 font-medium">
                <Icons.Wallet size={16} className="text-blue-500" /> Net Position
              </div>
              <p className={`font-headline font-bold text-2xl ${netPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ETB {netPosition.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">{netPosition >= 0 ? 'Positive' : 'Negative'}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 font-medium">
                <Icons.Cash size={16} className="text-purple-500" /> Collection Rate
              </div>
              <p className="font-headline font-bold text-2xl text-purple-600">{collectionRate.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-1">ETB {collectedAmount.toLocaleString()} collected</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopList
              title="Top 10 Vendors (Payables)"
              subtitle="Vendors you owe the most"
              items={payablesByContact}
              color="red"
              accent="bg-red-400"
            />
            <TopList
              title="Top 10 Customers (Receivables)"
              subtitle="Customers who owe you the most"
              items={receivablesByContact}
              color="green"
              accent="bg-emerald-400"
            />
          </div>
        </>
      )}

      {tab === 'Contacts' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
            <div>
              <h3 className="font-headline font-bold text-on-surface">Contacts</h3>
              <p className="text-xs text-slate-400 mt-0.5">{contacts.length} total</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <button
                onClick={openNewContact}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90"
              >
                <Icons.Plus size={14} /> New Contact
              </button>
            </div>
          </div>
          {filteredContacts.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Icons.User size={40} className="mx-auto opacity-20 mb-3" />
              <p className="text-sm">No contacts yet. Add one to start tracking payables and receivables.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filteredContacts.map(c => {
                const b = balanceFor(c.id);
                return (
                  <li key={c.id} className="py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-on-surface truncate">{c.name}</p>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">{c.type}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {c.phone || c.email || 'No contact info'}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Receivable</p>
                        <p className="font-bold text-sm text-emerald-600">{b.receivable.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Payable</p>
                        <p className="font-bold text-sm text-red-600">{b.payable.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditContact(c)} className="p-2 rounded-lg hover:bg-slate-50 text-slate-400" title="Edit">
                          <Icons.MoreVertical size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete contact "${c.name}"?`)) onDeleteContact(c.id); }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-400"
                          title="Delete"
                        >
                          <Icons.Close size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'Adjustments' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-headline font-bold text-on-surface">Adjustments</h3>
              <p className="text-xs text-slate-400 mt-0.5">All payable and receivable entries</p>
            </div>
            <button
              onClick={() => { setAdjustDraft({ type: 'RECEIVED', counterparty: '', amount: 0, notes: '' }); setShowAdjustModal(true); }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90"
            >
              <Icons.Plus size={14} /> New Adjustment
            </button>
          </div>
          {adjustments.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Icons.Receipt size={40} className="mx-auto opacity-20 mb-3" />
              <p className="text-sm">No payable or receivable entries yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {adjustments.map(l => {
                const isReceivable = l.type === 'GIVEN';
                const settled = l.status === 'SETTLED';
                return (
                  <li key={l.id} className="py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-sm truncate ${settled ? 'text-slate-400 line-through' : 'text-on-surface'}`}>{labelFor(l)}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isReceivable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {isReceivable ? 'Receivable' : 'Payable'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(l.date).toLocaleDateString()}
                        {l.dueDate ? ` · due ${new Date(l.dueDate).toLocaleDateString()}` : ''}
                        {l.notes ? ` · ${l.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className={`font-bold text-sm ${isReceivable ? 'text-emerald-600' : 'text-red-600'} ${settled ? 'line-through opacity-60' : ''}`}>
                        ETB {Number(l.amount).toLocaleString()}
                      </p>
                      {settled ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400">Settled</span>
                      ) : (
                        <button
                          onClick={() => onSettleLoan(l)}
                          className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700"
                        >
                          Mark Settled
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Contact modal */}
      <AnimatePresence>
        {showContactModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowContactModal(false)} className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[460px] bg-white rounded-3xl z-[210] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-headline font-bold text-on-surface">{editingContact ? 'Edit Contact' : 'New Contact'}</h3>
                <button onClick={() => setShowContactModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><Icons.Close size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Name *</label>
                  <input value={contactDraft.name || ''} onChange={e => setContactDraft({ ...contactDraft, name: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" placeholder="Contact name" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['VENDOR','CUSTOMER','BOTH'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setContactDraft({ ...contactDraft, type: t })}
                        className={`py-2.5 rounded-xl text-xs font-bold ${contactDraft.type === t ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Phone</label>
                    <input value={contactDraft.phone || ''} onChange={e => setContactDraft({ ...contactDraft, phone: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Email</label>
                    <input value={contactDraft.email || ''} onChange={e => setContactDraft({ ...contactDraft, email: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Notes</label>
                  <textarea value={contactDraft.notes || ''} onChange={e => setContactDraft({ ...contactDraft, notes: e.target.value })}
                    rows={2} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                </div>
                <button disabled={!contactDraft.name?.trim()} onClick={submitContact}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-bold hover:opacity-90 disabled:opacity-40">
                  {editingContact ? 'Save Changes' : 'Create Contact'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Adjustment modal — creates a new payable/receivable entry tied to a contact */}
      <AnimatePresence>
        {showAdjustModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAdjustModal(false)} className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[460px] bg-white rounded-3xl z-[210] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-headline font-bold text-on-surface">New Adjustment</h3>
                <button onClick={() => setShowAdjustModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><Icons.Close size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(['RECEIVED','GIVEN'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setAdjustDraft({ ...adjustDraft, type: t })}
                      className={`py-3 rounded-xl text-xs font-bold ${adjustDraft.type === t ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500'}`}>
                      {t === 'RECEIVED' ? 'Payable (we owe)' : 'Receivable (owed to us)'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Contact</label>
                  <select
                    value={adjustDraft.contactId || ''}
                    onChange={e => {
                      const id = e.target.value;
                      const c = contacts.find(c => c.id === id);
                      setAdjustDraft({ ...adjustDraft, contactId: id || undefined, counterparty: c?.name || adjustDraft.counterparty });
                    }}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">— Select a contact —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {contacts.length === 0 && (
                    <p className="text-[11px] text-slate-400 mt-2">No contacts yet. Add one in the Contacts tab first.</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Amount (ETB)</label>
                  <input type="number" value={adjustDraft.amount || 0} onChange={e => setAdjustDraft({ ...adjustDraft, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Bank Account</label>
                  <select value={adjustDraft.bankAccountId || ''} onChange={e => setAdjustDraft({ ...adjustDraft, bankAccountId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10">
                    <option value="">— None / Cash —</option>
                    {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.bankName} · {a.accountNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Notes</label>
                  <textarea value={adjustDraft.notes || ''} onChange={e => setAdjustDraft({ ...adjustDraft, notes: e.target.value })}
                    rows={2} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                </div>
                <button
                  disabled={!adjustDraft.contactId || !adjustDraft.amount}
                  onClick={async () => {
                    await onAddLoan(adjustDraft);
                    setShowAdjustModal(false);
                  }}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-bold hover:opacity-90 disabled:opacity-40">
                  Record Entry
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// ContactsScreen — standalone management view (separate from Ledger tab).
// Lists every contact with their outstanding receivable / payable balance and
// supports create / edit / delete.
// =============================================================================
const ContactsScreen = ({
  contacts,
  loans,
  onOpenSidebar,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
}: {
  contacts: Contact[];
  loans: Loan[];
  onOpenSidebar: () => void;
  onAddContact: (c: Partial<Contact>) => Promise<Contact | null>;
  onUpdateContact: (id: string, patch: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'VENDOR' | 'CUSTOMER' | 'BOTH'>('ALL');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<Partial<Contact>>({ name: '', type: 'BOTH' });

  const balanceFor = (contactId: string) => {
    const open = loans.filter(l => l.contactId === contactId && l.status === 'OUTSTANDING');
    const receivable = open.filter(l => l.type === 'GIVEN').reduce((s, l) => s + Number(l.amount || 0), 0);
    const payable = open.filter(l => l.type === 'RECEIVED').reduce((s, l) => s + Number(l.amount || 0), 0);
    return { receivable, payable };
  };

  const filtered = contacts
    .filter(c => typeFilter === 'ALL' || c.type === typeFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search) || (c.email || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const openNew = () => { setEditing(null); setDraft({ name: '', type: 'BOTH' }); setShowModal(true); };
  const openEdit = (c: Contact) => { setEditing(c); setDraft({ name: c.name, type: c.type, phone: c.phone, email: c.email, notes: c.notes }); setShowModal(true); };
  const submit = async () => {
    if (!draft.name?.trim()) return;
    if (editing) await onUpdateContact(editing.id, draft);
    else await onAddContact(draft);
    setShowModal(false);
  };

  return (
    <div className="flex-1 bg-[#F7F9FB] min-h-screen p-4 lg:p-8 pb-32">
      <header className="mb-8 flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
        >
          <Icons.Menu size={20} />
        </button>
        <div className="hidden lg:flex w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 items-center justify-center text-slate-400">
          <Icons.User size={20} />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold text-on-surface">Contacts</h2>
          <p className="text-xs text-slate-400 font-medium">Vendors and customers</p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="flex gap-3 flex-1">
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-on-surface text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 whitespace-nowrap"
          >
            <Icons.Plus size={14} /> Create Contact
          </button>
          <div className="relative flex-1 max-w-md">
            <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-white border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-primary/10"
        >
          <option value="ALL">All types</option>
          <option value="VENDOR">Vendors</option>
          <option value="CUSTOMER">Customers</option>
          <option value="BOTH">Both</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Icons.User size={40} className="mx-auto opacity-20 mb-3" />
            <p className="text-sm">No contacts found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Name</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Type</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Phone</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Email</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-right">Receivable</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold text-slate-500 tracking-widest text-right">Payable</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(c => {
                  const b = balanceFor(c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-bold text-sm text-on-surface">{c.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">{c.type}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{c.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{c.email || '—'}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">{b.receivable.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600 text-right">{b.payable.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400" title="Edit">
                            <Icons.MoreVertical size={14} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete contact "${c.name}"?`)) onDeleteContact(c.id); }}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-400"
                            title="Delete"
                          >
                            <Icons.Close size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[460px] bg-white rounded-3xl z-[210] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-headline font-bold text-on-surface">{editing ? 'Edit Contact' : 'New Contact'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><Icons.Close size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Name *</label>
                  <input value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" placeholder="Contact name" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['VENDOR','CUSTOMER','BOTH'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setDraft({ ...draft, type: t })}
                        className={`py-2.5 rounded-xl text-xs font-bold ${draft.type === t ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500'}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Phone</label>
                    <input value={draft.phone || ''} onChange={e => setDraft({ ...draft, phone: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Email</label>
                    <input value={draft.email || ''} onChange={e => setDraft({ ...draft, email: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Notes</label>
                  <textarea value={draft.notes || ''} onChange={e => setDraft({ ...draft, notes: e.target.value })}
                    rows={2} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                </div>
                <button disabled={!draft.name?.trim()} onClick={submit}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-headline font-bold hover:opacity-90 disabled:opacity-40">
                  {editing ? 'Save Changes' : 'Create Contact'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// ContractsScreen — agreements with a contact (vendor) supporting one-time,
// milestone, or recurring payment schedules.
// =============================================================================
const ContractsScreen = ({
  contracts,
  contacts,
  orgName,
  userName,
  onOpenSidebar,
  onAddContract,
  onDeleteContract,
}: {
  contracts: Contract[];
  contacts: Contact[];
  orgName: string;
  userName: string;
  onOpenSidebar: () => void;
  onAddContract: (c: Partial<Contract>) => Promise<Contract | null>;
  onDeleteContract: (id: string) => Promise<void>;
}) => {
  const clientLabel = [orgName, userName].filter(Boolean).join(' · ') || 'Current organization';
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'Form' | 'Images'>('Form');
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState<Partial<Contract> & { _client?: string }>({
    name: '',
    amount: 0,
    term: 'ONE_TIME',
    startDate: today,
    endDate: '',
    status: 'APPROVED',
    currency: 'ETB',
  });
  const [recurInterval, setRecurInterval] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [recurCount, setRecurCount] = useState(12);
  const [milestones, setMilestones] = useState<{ date: string; amount: number; label: string }[]>([
    { date: today, amount: 0, label: 'Milestone 1' },
  ]);

  const filtered = contracts
    .filter(c => !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.vendorParty || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const submit = async () => {
    let recurrence: any = null;
    if (draft.term === 'RECURRING') recurrence = { interval: recurInterval, count: recurCount };
    else if (draft.term === 'MILESTONES') recurrence = { milestones };
    await onAddContract({ ...draft, clientParty: clientLabel, recurrence });
    setShowModal(false);
    setDraft({ name: '', amount: 0, term: 'ONE_TIME', startDate: today, endDate: '', status: 'APPROVED', currency: 'ETB' });
    setMilestones([{ date: today, amount: 0, label: 'Milestone 1' }]);
  };

  const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="flex-1 bg-[#F7F9FB] min-h-screen p-4 lg:p-8 pb-32">
      <header className="mb-8 flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
        >
          <Icons.Menu size={20} />
        </button>
        <div className="hidden lg:flex w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 items-center justify-center text-slate-400">
          <Icons.Receipt size={20} />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold text-on-surface">Contract</h2>
          <p className="text-xs text-slate-400 font-medium">Manage company contracts</p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-white border border-slate-200 text-on-surface px-5 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 whitespace-nowrap"
        >
          Create Contract <Icons.Plus size={16} />
        </button>
        <div className="relative flex-1">
          <Icons.Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contracts..."
            className="w-full bg-white border border-slate-100 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500"></th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500">Contract</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500">Party</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500">Term</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">
                  <Icons.Receipt size={40} className="mx-auto opacity-20 mb-3" />
                  No contracts yet.
                </td></tr>
              ) : filtered.map(c => {
                const termLabel = c.term === 'ONE_TIME' ? 'One-Time' : c.term === 'RECURRING' ? 'Recurring' : 'Milestones';
                const statusBadge = c.status === 'APPROVED' || c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700'
                  : c.status === 'PENDING' ? 'bg-amber-50 text-amber-700'
                  : c.status === 'CANCELLED' ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-500';
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-5"><div className="w-4 h-4 border border-slate-200 rounded-full" /></td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-sm text-on-surface">{c.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.code || '—'}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{c.vendorParty || contacts.find(x => x.id === c.contactId)?.name || '—'}</td>
                    <td className="px-6 py-5 font-bold text-sm text-on-surface whitespace-nowrap">{Number(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {c.currency || 'ETB'}</td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">{termLabel}</span>
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-500 whitespace-nowrap">
                      <div>From: {fmtDate(c.startDate)}</div>
                      <div>To: {fmtDate(c.endDate)}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge}`}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400" title="Open">
                          <Icons.ArrowUpRight size={14} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete contract "${c.name}"?`)) onDeleteContract(c.id); }}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
                          title="More"
                        >
                          <Icons.MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[600px] bg-white rounded-3xl z-[210] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-headline font-bold text-on-surface">Create Contract</h3>
                  <p className="text-xs text-slate-400 mt-1">Add a new contract and set up its payment schedule.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><Icons.Close size={20} /></button>
              </div>

              <div className="flex bg-slate-50 rounded-xl p-1 mb-5 w-fit">
                {(['Form', 'Images'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold ${tab === t ? 'bg-white text-on-surface shadow-sm' : 'text-slate-400'}`}>
                    {t} {t === 'Images' && <span className="ml-1 text-slate-300">0</span>}
                  </button>
                ))}
              </div>

              {tab === 'Form' ? (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-on-surface mb-2 block">Parties <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">Client (Paying)</label>
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 flex items-center gap-2" title="Auto-set to your organization and account">
                          <Icons.Lock size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{clientLabel}</span>
                        </div>
                      </div>
                      <div className="mt-5 p-2.5 text-slate-300">
                        <Icons.ArrowLeftRight size={14} />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 mb-1 block">Vendor (Receiving)</label>
                        <select value={draft.contactId || ''} onChange={e => {
                          const id = e.target.value;
                          const c = contacts.find(x => x.id === id);
                          setDraft({ ...draft, contactId: id || undefined, vendorParty: c?.name });
                        }}
                          className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10">
                          <option value="">Search vendor</option>
                          {contacts.filter(c => c.type !== 'CUSTOMER').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-on-surface mb-2 block">Contract Name <span className="text-red-500">*</span></label>
                      <input value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })}
                        placeholder="e.g. Office Rent"
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-on-surface mb-2 block">Total Amount <span className="text-red-500">*</span></label>
                      <input type="number" value={draft.amount || ''} onChange={e => setDraft({ ...draft, amount: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-on-surface mb-2 block">Start Date <span className="text-red-500">*</span></label>
                      <input type="date" value={draft.startDate?.slice(0, 10) || ''} onChange={e => setDraft({ ...draft, startDate: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-on-surface mb-2 block">End Date</label>
                      <input type="date" value={draft.endDate?.slice(0, 10) || ''} onChange={e => setDraft({ ...draft, endDate: e.target.value })}
                        className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-on-surface mb-2 block">Payment Schedule</label>
                    <div className="flex bg-slate-50 rounded-xl p-1 w-fit mb-3">
                      {([
                        { id: 'ONE_TIME', label: 'One-Time' },
                        { id: 'MILESTONES', label: 'Milestones' },
                        { id: 'RECURRING', label: 'Recurring Schedule' },
                      ] as const).map(t => (
                        <button key={t.id} type="button" onClick={() => setDraft({ ...draft, term: t.id })}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold ${draft.term === t.id ? 'bg-white text-on-surface shadow-sm' : 'text-slate-400'}`}>{t.label}</button>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 min-h-[100px]">
                      {draft.term === 'ONE_TIME' && (
                        <p className="text-center text-xs text-slate-400 py-6">A single payment will be scheduled on the End Date (or Start Date if none).</p>
                      )}
                      {draft.term === 'RECURRING' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Interval</label>
                            <select value={recurInterval} onChange={e => setRecurInterval(e.target.value as any)}
                              className="w-full bg-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10">
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="QUARTERLY">Quarterly</option>
                              <option value="YEARLY">Yearly</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Number of payments</label>
                            <input type="number" min={1} value={recurCount} onChange={e => setRecurCount(Number(e.target.value))}
                              className="w-full bg-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10" />
                          </div>
                        </div>
                      )}
                      {draft.term === 'MILESTONES' && (
                        <div className="space-y-2">
                          {milestones.map((m, i) => (
                            <div key={i} className="grid grid-cols-[1fr_140px_140px_auto] gap-2 items-center">
                              <input value={m.label} onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                                placeholder="Label" className="bg-white border-none rounded-lg p-2 text-xs" />
                              <input type="date" value={m.date} onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                                className="bg-white border-none rounded-lg p-2 text-xs" />
                              <input type="number" value={m.amount} onChange={e => setMilestones(ms => ms.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))}
                                placeholder="Amount" className="bg-white border-none rounded-lg p-2 text-xs" />
                              <button type="button" onClick={() => setMilestones(ms => ms.filter((_, j) => j !== i))}
                                className="p-2 text-slate-400 hover:text-red-500"><Icons.Close size={14} /></button>
                            </div>
                          ))}
                          <button type="button"
                            onClick={() => setMilestones(ms => [...ms, { date: today, amount: 0, label: `Milestone ${ms.length + 1}` }])}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-2">
                            <Icons.Plus size={12} /> Add milestone
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                    <button
                      disabled={!draft.name?.trim() || !draft.contactId || !draft.amount}
                      onClick={submit}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold bg-on-surface text-white hover:opacity-90 disabled:opacity-40">
                      Submit Contract
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 text-sm">
                  Image attachments are not supported yet.
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const ExpenseScreen = ({ onBack, onExpense, bankAccounts, onOpenSidebar }: { onBack: () => void, onExpense: (data: any) => void, bankAccounts: BankAccount[], onOpenSidebar?: () => void }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('RENT');
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');

  const handleLog = () => {
    if (!amount || !selectedBankId) return;
    onExpense({ 
      amount: Number(amount.replace(/,/g, '')), 
      category,
      bankAccountId: selectedBankId
    });
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Expenses List</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">Record Expense</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entry Panel</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">Write down your expenses to keep your store money correct.</p>
        </section>
        <div className="bg-white rounded-xl p-8 shadow-2xl space-y-8">
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Amount (ETB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-headline text-2xl font-bold text-primary">ETB</span>
              <MoneyInput value={amount} onChange={setAmount} className="w-full bg-slate-50 border-none rounded-xl py-6 pl-20 pr-6 text-[2.5rem] font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Payment Account</label>
            <select 
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
               {bankAccounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
               ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Category</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['RENT', 'ELECTRICITY', 'INTERNET', 'STAFF LUNCH', 'STATIONARIES'].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`flex flex-col items-start p-4 rounded-xl transition-all group border-none text-left ${category === cat ? 'bg-primary text-white' : 'bg-slate-50 hover:bg-primary hover:text-white'}`}>
                  <Icons.Receipt size={20} className={`mb-2 ${category === cat ? 'text-white' : 'text-primary group-hover:text-white'}`} />
                  <span className="font-label text-[10px] font-bold uppercase tracking-wide">{cat}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleLog} className="w-full py-5 bg-primary text-white rounded-xl font-headline font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3">
            <Icons.CheckCircle size={24} /> Log Expense
          </button>
        </div>
      </main>
    </div>
  );
};

const ReconcileScreen = ({ onBack, transactions, userData, onOpenSidebar }: { onBack: () => void, transactions: Transaction[], userData: any, onOpenSidebar?: () => void }) => {
  const [cashCount, setCashCount] = useState('');
  const [inventoryCount, setInventoryCount] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Get today's transactions
  const today = new Date().toISOString().split('T')[0];
  const isClerk = userData?.role === 'clerk';
  
  const todayTxs = transactions.filter(tx => {
    const isToday = tx.timestamp.startsWith(today);
    if (isClerk) {
      return isToday && tx.clerkId === userData.uid;
    }
    return isToday;
  });

  const summary = {
    sales: todayTxs.filter(tx => tx.type === 'SALE').reduce((sum, tx) => sum + tx.amount, 0),
    expenses: todayTxs.filter(tx => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    purchases: todayTxs.filter(tx => tx.type === 'PURCHASE').reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    lends: todayTxs.filter(tx => tx.type === 'LENT').length,
    borrows: todayTxs.filter(tx => tx.type === 'BORROWED').length,
    cashLent: todayTxs.filter(tx => tx.type === 'TRANSFER' && tx.transferType === 'CASH' && tx.direction === 'SEND').reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
    cashReceived: todayTxs.filter(tx => tx.type === 'TRANSFER' && tx.transferType === 'CASH' && tx.direction === 'RECEIVE').reduce((sum, tx) => sum + tx.amount, 0),
    netCash: todayTxs.reduce((sum, tx) => {
      if (tx.type === 'TRANSFER' && tx.transferType === 'CASH') return sum + tx.amount;
      if (['SALE', 'PURCHASE', 'EXPENSE'].includes(tx.type)) return sum + tx.amount;
      return sum;
    }, 0)
  };

  const soldItems = todayTxs.filter(tx => tx.type === 'SALE');

  const handleReconcile = async () => {
    setIsApproving(true);
    try {
      await addDoc(collection(db, 'reconciliations'), {
        timestamp: new Date().toISOString(),
        clerkId: userData.uid,
        clerkName: userData.displayName,
        summary,
        physicalCash: Number(cashCount.replace(/,/g, '')),
        physicalInventory: Number(inventoryCount),
        soldItems: soldItems.map(tx => ({ item: tx.item, imei: tx.imei, amount: tx.amount }))
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'reconciliations');
      setIsApproving(false);
      return;
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        title: 'Reconciliation Submitted',
        body: `${userData.displayName} finished the daily report.`,
        timestamp: new Date().toISOString(),
        type: 'info'
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'notifications');
    }

    setIsApproving(false);
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Daily Operations</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">Daily Report</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-emerald-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Verification Panel</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">Check and approve today's sales to finish the daily record.</p>
        </section>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50 space-y-4">
            <h3 className="font-headline font-bold text-lg border-b border-slate-50 pb-3">Today's Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-widest mb-1">Total Sales</p>
                <p className="font-headline font-bold text-emerald-600">{summary.sales.toLocaleString()} ETB</p>
              </div>
              <div className="p-4 bg-red-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-red-700 tracking-widest mb-1">Total Expenses</p>
                <p className="font-headline font-bold text-red-600">{summary.expenses.toLocaleString()} ETB</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-blue-700 tracking-widest mb-1">Purchases</p>
                <p className="font-headline font-bold text-blue-600">{summary.purchases.toLocaleString()} ETB</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-amber-700 tracking-widest mb-1">Lends / Borrows</p>
                <p className="font-headline font-bold text-amber-600">{summary.lends} / {summary.borrows}</p>
              </div>
              <div className="p-4 bg-tertiary-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-tertiary-700 tracking-widest mb-1">Cash Lent</p>
                <p className="font-headline font-bold text-tertiary-600">{summary.cashLent.toLocaleString()} ETB</p>
              </div>
              <div className="p-4 bg-tertiary-50 rounded-2xl">
                <p className="text-[10px] uppercase font-bold text-tertiary-700 tracking-widest mb-1">Cash Received</p>
                <p className="font-headline font-bold text-tertiary-600">{summary.cashReceived.toLocaleString()} ETB</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
              <span className="font-label text-xs font-bold text-slate-400 uppercase">Net Cash Flow</span>
              <span className={`font-headline font-bold text-xl ${summary.netCash >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {summary.netCash.toLocaleString()} ETB
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50">
            <h3 className="font-headline font-bold text-lg mb-4">Items Sold Today</h3>
            <div className="space-y-3">
              {soldItems.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-sm text-on-surface">{tx.item}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{tx.imei || 'No IMEI'}</p>
                  </div>
                  <p className="font-headline font-bold text-emerald-600">{tx.amount.toLocaleString()} ETB</p>
                </div>
              ))}
              {soldItems.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm">No items sold today.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-2xl space-y-8">
            <div className="space-y-2">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Physical Cash Count (ETB)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-headline text-2xl font-bold text-primary">ETB</span>
                <MoneyInput value={cashCount} onChange={setCashCount} className="w-full bg-slate-50 border-none rounded-xl py-6 pl-20 pr-6 text-[2.5rem] font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Physical Inventory Count</label>
              <input type="number" value={inventoryCount} onChange={(e) => setInventoryCount(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl py-6 px-6 text-[2.5rem] font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" placeholder="0" />
            </div>
            <button 
              onClick={handleReconcile} 
              disabled={isApproving}
              className={`w-full py-5 bg-primary text-white rounded-xl font-headline font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3 ${isApproving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isApproving ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icons.CheckCircle size={24} />
              )}
              {isApproving ? 'Approving Actions...' : 'Confirm & Approve Today\'s Actions'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

const InviteScreen = ({ onBack, onInvite, invites, onOpenSidebar }: { onBack: () => void, onInvite: (email: string) => Promise<any> | void, invites: any[], onOpenSidebar?: () => void }) => {
  const [email, setEmail] = useState('');

  const handleInvite = async () => {
    if (!email) return;
    await onInvite(email);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-tertiary-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Staff Expansion</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">Invite Associate</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-tertiary-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entry Panel</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed relative z-10">Add new logins for members of staff.</p>
          <Icons.User size={80} className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
        </section>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-8 shadow-2xl space-y-6">
            <div className="space-y-2">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Sales Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                placeholder="sales@example.com" 
              />
            </div>
            <AsyncButton
              onClick={handleInvite}
              disabled={!email}
              loadingLabel="Sending Invite…"
              successLabel="Invitation Sent"
              icon={<Icons.Send size={20} />}
              className="w-full py-5 bg-primary text-white rounded-xl font-headline font-bold text-lg tracking-wide hover:opacity-90 shadow-xl"
            >
              Send Invitation
            </AsyncButton>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-50">
            <h3 className="font-headline font-bold text-lg mb-4">Recent Invitations</h3>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-sm text-on-surface">{invite.email}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sent: {(() => {
                      const t: any = invite.timestamp;
                      if (!t) return 'Unknown';
                      const d = typeof t === 'string' || typeof t === 'number'
                        ? new Date(t)
                        : (t.toDate ? t.toDate() : (t instanceof Date ? t : null));
                      return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Unknown';
                    })()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    invite.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    invite.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {invite.status}
                  </span>
                </div>
              ))}
              {invites.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm italic">No invitations sent yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const SaleScreen = ({ onBack, onSale, inventory, cart, setCart, bankAccounts, onOpenSidebar }: { onBack: () => void, onSale: (data: any) => void, inventory: any[], cart: {item: InventoryItem, salePrice: number}[], setCart: React.Dispatch<React.SetStateAction<{item: InventoryItem, salePrice: number}[]>>, bankAccounts: BankAccount[], onOpenSidebar?: () => void }) => {
  const [selectedImei, setSelectedImei] = useState('');
  const [overridePrice, setOverridePrice] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [saleResult, setSaleResult] = useState<{ ok: boolean, message: string, total?: number } | null>(null);

  const selectedItem = selectedImei ? inventory.find(i => i.imei === selectedImei) : null;

  const resolveSalePrice = (item: InventoryItem) => {
    const parsed = Number(overridePrice.replace(/,/g, ''));
    return overridePrice && !isNaN(parsed) && parsed > 0 ? parsed : item.valuation;
  };

  const addToCart = () => {
    if (!selectedItem) return;
    if (cart.find(c => c.item.id === selectedItem.id)) return;
    setCart([...cart, { item: selectedItem, salePrice: resolveSalePrice(selectedItem) }]);
    setSelectedImei('');
    setOverridePrice('');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.item.id !== id));
  };

  const updateSalePrice = (id: string, price: number) => {
    setCart(cart.map(c => c.item.id === id ? { ...c, salePrice: price } : c));
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedBankId) return;
    setIsProcessing(true);
    let failed = 0;
    let succeeded = 0;
    let lastErr: any = null;
    let totalCharged = 0;
    try {
      for (const entry of cart) {
        try {
          await onSale({
            amount: entry.salePrice,
            item: entry.item.name,
            imei: entry.item.imei,
            bankAccountId: selectedBankId
          });
          succeeded++;
          totalCharged += entry.salePrice;
        } catch (e) {
          failed++;
          lastErr = e;
        }
      }
    } finally {
      setIsProcessing(false);
    }
    if (failed === 0) {
      setCart([]);
      setSaleResult({ ok: true, message: `${succeeded} item${succeeded === 1 ? '' : 's'} sold successfully.`, total: totalCharged });
    } else {
      setSaleResult({
        ok: false,
        message: `${succeeded} succeeded, ${failed} failed. ${lastErr?.message || ''}`.trim()
      });
    }
  };

  const handleOneByOneSale = async () => {
    if (!selectedItem || !selectedBankId) return;
    setIsProcessing(true);
    const amount = resolveSalePrice(selectedItem);
    try {
      await onSale({
        amount,
        item: selectedItem.name,
        imei: selectedItem.imei,
        bankAccountId: selectedBankId
      });
      setOverridePrice('');
      setSaleResult({ ok: true, message: `Sold ${selectedItem.name} for ${amount.toLocaleString()} ETB.`, total: amount });
    } catch (e: any) {
      setSaleResult({ ok: false, message: e?.message || 'Sale failed. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = cart.reduce((sum, entry) => sum + entry.salePrice, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {isScanning && <QRScanner onScan={(text) => { setSelectedImei(text); setIsScanning(false); }} onClose={() => setIsScanning(false)} />}
      <main className="pt-24 px-6 max-w-5xl mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Checkout Point</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">New Sale Transaction</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-emerald-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pricing Panel</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed relative z-10">Process multi-item sales or single checkout with real-time inventory updates.</p>
          <Icons.Receipt size={80} className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section className="space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6">
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Select Individual Device</label>
                    <div className="flex gap-2">
                      <select 
                        value={selectedImei} 
                        onChange={(e) => setSelectedImei(e.target.value)} 
                        className="flex-1 bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option value="">Choose item by IMEI...</option>
                        {inventory.filter(i => i.status === 'IN_STOCK' && !cart.find(c => c.item.id === i.id)).map(item => (
                          <option key={item.id} value={item.imei}>{item.name} ({item.imei})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsScanning(true)}
                        className="shrink-0 w-14 bg-primary text-white rounded-xl flex items-center justify-center hover:opacity-90 transition-all"
                        title="Scan IMEI"
                      >
                        <Icons.QRCode size={20} />
                      </button>
                    </div>
                 </div>

                 {selectedItem && (
                   <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">
                        Sale Price <span className="text-slate-300 normal-case font-medium">(default: {selectedItem.valuation.toLocaleString()} ETB)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ETB</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={overridePrice}
                          onChange={(e) => setOverridePrice(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder={String(selectedItem.valuation)}
                          className="w-full bg-slate-50 border-none rounded-xl py-4 pl-14 pr-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                   </div>
                 )}
                 
                 <div className="flex gap-2">
                    <button 
                      onClick={addToCart}
                      className="flex-1 py-4 bg-slate-100 text-primary rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Icons.Plus size={18} /> Add to Cart
                    </button>
                    <button 
                      onClick={handleOneByOneSale}
                      disabled={isProcessing || !selectedImei}
                      className="flex-1 py-4 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Icons.CheckCircle size={18} /> Direct Sell
                    </button>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                 <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Payment Destination Account</label>
                 <select 
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full bg-emerald-50 text-emerald-800 border-none rounded-xl py-4 px-4 font-headline font-bold focus:ring-2 focus:ring-emerald-200 transition-all"
                 >
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber} ({acc.balance.toLocaleString()} ETB)</option>
                    ))}
                 </select>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col h-full min-h-[500px]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-headline font-bold text-primary">Shopping Cart</h3>
                <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">{cart.length}</span>
             </div>
             
             <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
                {cart.map(entry => (
                  <div key={entry.item.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center group">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                           <Icons.Smartphone size={20} className="text-primary" />
                        </div>
                        <div>
                           <p className="font-bold text-sm">{entry.item.name}</p>
                           <p className="text-[10px] text-slate-400 font-mono italic">{entry.item.imei}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right">
                           <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Sale Price</p>
                           <input 
                             type="text"
                             value={entry.salePrice}
                             onChange={(e) => {
                               const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                               updateSalePrice(entry.item.id, val);
                             }}
                             className={`w-24 bg-white border-none rounded-lg py-1 px-2 text-right font-headline font-bold focus:ring-2 focus:ring-emerald-200 transition-all ${entry.salePrice > entry.item.valuation ? 'text-emerald-600' : 'text-primary'}`}
                           />
                        </div>
                        <button onClick={() => removeFromCart(entry.item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                           <Icons.Close size={18} />
                        </button>
                     </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                     <Icons.Ledger size={48} className="opacity-20 mb-2" />
                     <p className="font-medium">Cart is empty</p>
                  </div>
                )}
             </div>

             <div className="pt-6 border-t border-slate-100 mt-6">
                <div className="flex justify-between items-baseline mb-6">
                   <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Total Valuation</span>
                   <span className="text-3xl font-headline font-bold text-primary">{totalAmount.toLocaleString()} <span className="text-sm opacity-40">ETB</span></span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || isProcessing}
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-headline font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Icons.Receipt size={24} />}
                  Finish Sale
                </button>
             </div>
          </section>
        </div>
      </main>
      {saleResult && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => { const wasOk = saleResult.ok; setSaleResult(null); if (wasOk) onBack(); }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${saleResult.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {saleResult.ok ? <Icons.CheckCircle size={32} /> : <Icons.Warning size={32} />}
            </div>
            <h2 className="font-headline text-2xl font-bold text-primary mb-2">
              {saleResult.ok ? 'Sale Complete' : 'Sale Failed'}
            </h2>
            <p className="text-slate-500 text-sm mb-2">{saleResult.message}</p>
            {saleResult.ok && saleResult.total !== undefined && (
              <p className="font-headline font-bold text-3xl text-emerald-600 mb-6">
                {saleResult.total.toLocaleString()} <span className="text-sm opacity-60">ETB</span>
              </p>
            )}
            <button
              type="button"
              onClick={() => { const wasOk = saleResult.ok; setSaleResult(null); if (wasOk) onBack(); }}
              className="w-full bg-primary text-white py-3 rounded-2xl font-headline font-bold shadow-lg active:scale-95 transition-all mt-4"
            >
              {saleResult.ok ? 'Done' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseScreen = ({ onBack, onAdd, warehouses, onOpenSidebar }: { onBack: () => void, onAdd: (item: any) => Promise<any> | any, warehouses: Warehouse[], onOpenSidebar?: () => void }) => {
  const [imei, setImei] = useState('');
  const [model, setModel] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [valuation, setValuation] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleAdd = async () => {
    const price = Number(purchasePrice.replace(/,/g, ''));
    if (!model || !imei || isNaN(price) || price <= 0) {
      throw new Error('Fill in model, IMEI, and a positive purchase price.');
    }
    await onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: model,
      imei,
      purchasePrice: price,
      valuation: price, 
      status: 'IN_STOCK',
      category: 'PHONES',
      warehouseId: warehouseId || null,
    });
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {isScanning && <QRScanner onScan={(text) => setImei(text)} onClose={() => setIsScanning(false)} />}
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Stock Input</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">Buy Item</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entry Panel</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed relative z-10">Enter item details to add to your warehouse inventory.</p>
          <Icons.Package size={80} className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
        </section>
        
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6">
           <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Device IMEI</label>
                  <button onClick={() => setIsScanning(true)} className="text-primary font-bold text-[10px] uppercase flex items-center gap-1">
                    <Icons.Search size={12} /> Scan QR
                  </button>
                </div>
                <input 
                  type="text" 
                  value={imei} 
                  onChange={(e) => setImei(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-mono font-bold text-primary" 
                  placeholder="Enter or scan IMEI..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Model Name</label>
                <div className="relative">
                   <input 
                     type="text" 
                     value={model} 
                     onChange={(e) => setModel(e.target.value)}
                     className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary" 
                     placeholder="Device Model..." 
                   />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Purchase Price</label>
                <MoneyInput value={purchasePrice} onChange={setPurchasePrice} className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary" placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Assigned Warehouse <span className="text-slate-300 normal-case font-semibold">(optional)</span></label>
                <select 
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-on-surface"
                >
                  <option value="">Unassigned — assign later</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
           </div>

           <AsyncButton
             onClick={handleAdd}
             loadingLabel="Registering…"
             successLabel="Registered"
             icon={<Icons.Plus size={20} />}
             className="w-full py-5 bg-primary text-white rounded-xl font-headline font-bold text-lg tracking-wide hover:opacity-90 shadow-xl"
           >
             Register Asset
           </AsyncButton>
        </div>
      </main>
    </div>
  );
};

const LendScreen = ({ onBack, inventory, onLend, stores, onCreateStore, favorites, onToggleFavorite, onOpenSidebar }: { onBack: () => void, inventory: any[], onLend: (data: any) => void, stores: string[], onCreateStore: (name: string) => void, favorites: string[], onToggleFavorite: (s: string) => void, onOpenSidebar?: () => void }) => {
  const [selectedImei, setSelectedImei] = useState('');
  const [destination, setDestination] = useState('');
  const [valuation, setValuation] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleLend = () => {
    const item = inventory.find(i => i.imei === selectedImei);
    const fallback = Number(item?.valuation || 0);
    const parsed = Number(valuation.replace(/,/g, ''));
    const val = !isNaN(parsed) && parsed > 0 ? parsed : fallback;
    if (!selectedImei || !destination || !item || val <= 0) return;
    onLend({
      itemId: item.id,
      imei: selectedImei,
      itemName: item.name,
      location: destination,
      valuation: val,
      expectedReturnDate: returnDate
    });
    onBack();
  };

  const sortedStores = [...stores].sort((a, b) => {
    const aFav = favorites.includes(a);
    const bFav = favorites.includes(b);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      {isScanning && <QRScanner onScan={(text) => setSelectedImei(text)} onClose={() => setIsScanning(false)} />}
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-tertiary-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Lending Items</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">Lend Item</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-tertiary-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Lend setup</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">Loan items to others for a short time.</p>
        </section>
        <div className="bg-white rounded-xl p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Select Phone</label>
              <button 
                onClick={() => setIsScanning(true)}
                className="text-primary font-bold text-[10px] uppercase flex items-center gap-1 hover:underline"
              >
                <Icons.Search size={12} /> Scan QR/Barcode
              </button>
            </div>
            <select 
              value={selectedImei}
              onChange={(e) => setSelectedImei(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Choose an item...</option>
              {inventory.filter(i => i.status === 'IN_STOCK').map(item => (
                <option key={item.id} value={item.imei}>{item.name} ({item.imei})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Who is taking it?</label>
            <StoreDropdown 
              value={destination}
              onChange={setDestination}
              stores={sortedStores}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onCreateStore={onCreateStore}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Item Price (ETB)</label>
              <MoneyInput 
                value={valuation}
                onChange={setValuation}
                className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                placeholder={(() => {
                  const sel = inventory.find(i => i.imei === selectedImei);
                  return sel?.valuation ? Number(sel.valuation).toLocaleString() : '0.00';
                })()}
              />
            </div>
            <div className="space-y-2">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Expected Return Date</label>
              <input 
                type="date" 
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
              />
            </div>
          </div>
          <button onClick={handleLend} className="w-full py-5 bg-secondary-100 text-secondary-700 rounded-xl font-headline font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3">
            <Icons.LendPhone size={24} /> Finish Loan
          </button>
        </div>
      </main>
    </div>
  );
};

const TransferScreen = ({ onBack, inventory, onTransfer, stores, onCreateStore, favorites, onToggleFavorite, onOpenSidebar }: { onBack: () => void, inventory: any[], onTransfer: (data: any) => void, stores: string[], onCreateStore: (name: string) => void, favorites: string[], onToggleFavorite: (s: string) => void, onOpenSidebar?: () => void }) => {
  const [type, setType] = useState<'ASSET' | 'CASH'>('ASSET');
  const [direction, setDirection] = useState<'SEND' | 'RECEIVE'>('SEND');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedImei, setSelectedImei] = useState('');

  const handleTransfer = () => {
    const amt = Number(amount.replace(/,/g, ''));
    if (!destination || (type === 'CASH' && (isNaN(amt) || amt <= 0)) || (type === 'ASSET' && !selectedImei)) return;
    
    let itemName = type === 'CASH' ? 'Cash Transfer' : '';
    let transferAmount = type === 'CASH' ? amt : 0;
    let imei = '';

    if (type === 'ASSET') {
      const item = inventory.find(i => i.imei === selectedImei);
      if (item) {
        itemName = item.name;
        transferAmount = item.valuation || 0;
        imei = selectedImei;
      }
    }

    onTransfer({
      type: 'TRANSFER',
      item: itemName,
      amount: direction === 'SEND' ? -transferAmount : transferAmount,
      location: destination,
      source,
      imei,
      direction,
      transferType: type,
      status: 'IN_TRANSIT'
    });
    onBack();
  };

  const sortedStores = [...stores].sort((a, b) => {
    const aFav = favorites.includes(a);
    const bFav = favorites.includes(b);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Moving Items</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">Move Between Stores</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Move items</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed relative z-10">Move items or money to a different store.</p>
          <Icons.ArrowLeftRight size={80} className="absolute -bottom-4 -right-4 opacity-5 group-hover:rotate-12 transition-transform" />
        </section>
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-8">
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Transfer Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDirection('SEND')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${direction === 'SEND' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>Send</button>
              <button onClick={() => setDirection('RECEIVE')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${direction === 'RECEIVE' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>Receive</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Move items or money?</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setType('ASSET')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${type === 'ASSET' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>Items</button>
              <button onClick={() => setType('CASH')} className={`py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${type === 'CASH' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>Cash</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Source</label>
              <StoreDropdown 
                value={direction === 'SEND' ? source : destination}
                onChange={(val) => direction === 'SEND' ? setSource(val) : setDestination(val)}
                stores={sortedStores}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                onCreateStore={onCreateStore}
              />
            </div>
            <div className="space-y-2">
              <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">Destination</label>
              <StoreDropdown 
                value={direction === 'SEND' ? destination : source}
                onChange={(val) => direction === 'SEND' ? setDestination(val) : setSource(val)}
                stores={sortedStores}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                onCreateStore={onCreateStore}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-label text-[0.75rem] font-bold uppercase tracking-wider text-slate-400">{type === 'CASH' ? 'Amount (ETB)' : 'Select Asset (IMEI)'}</label>
            {type === 'CASH' ? (
              <MoneyInput 
                value={amount}
                onChange={setAmount}
                className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                placeholder="0.00" 
              />
            ) : (
              <select 
                value={selectedImei}
                onChange={(e) => setSelectedImei(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Choose an asset...</option>
                {inventory.filter(i => i.status === 'IN_STOCK').map(item => (
                  <option key={item.id} value={item.imei}>{item.name} ({item.imei})</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={handleTransfer} className="w-full py-5 bg-primary text-white rounded-xl font-headline font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-3">
            <Icons.Send size={24} /> {direction === 'SEND' ? 'Initiate Transfer' : 'Confirm Receipt'}
          </button>
        </div>
      </main>
    </div>
  );
};

const DebtScreen = ({ transactions, onBack, onOpenSidebar }: { transactions: Transaction[], onBack: () => void, onOpenSidebar?: () => void }) => {
  const debtsByStore = transactions
    .filter(tx => tx.type === 'TRANSFER' && tx.direction === 'RECEIVE' && tx.status === 'IN_TRANSIT')
    .reduce((acc: { [key: string]: number }, tx) => {
      const store = tx.source || 'Unknown Store';
      acc[store] = (acc[store] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

  const totalDebt = Object.values(debtsByStore).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <main className="pt-24 px-6 max-w-lg mx-auto">
        <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Payable</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter">Money Owed</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entry Panel</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed relative z-10">Total amount owed to other branches for received assets.</p>
          <Icons.Warning size={80} className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
        </section>

        <div className="bg-primary p-8 rounded-3xl shadow-xl mb-8 text-white">
          <p className="text-slate-400 font-label text-xs uppercase tracking-wider mb-1">Total Outstanding Debt</p>
          <h2 className="font-headline font-extrabold text-4xl text-red-400">
            <span className="text-lg font-medium opacity-60 mr-1">ETB</span>{totalDebt.toLocaleString()}
          </h2>
        </div>

        <div className="space-y-4">
          {Object.entries(debtsByStore).map(([store, amount]) => (
            <div key={store} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-headline font-bold text-lg text-on-surface">{store}</h3>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Pending Settlement</p>
              </div>
              <div className="text-right">
                <p className="font-headline font-bold text-xl text-red-600">{amount.toLocaleString()} ETB</p>
              </div>
            </div>
          ))}
          {Object.keys(debtsByStore).length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <Icons.CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p>No outstanding debts found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NotificationsScreen = ({ notifications, onBack, onOpenSidebar }: { notifications: any[], onBack: () => void, onOpenSidebar?: () => void }) => (
  <div className="min-h-screen bg-[#F8FAFC] pb-32">
    <main className="pt-24 px-6 max-w-lg mx-auto">
      <header className="flex items-center gap-6 mb-12">
          {onOpenSidebar && (
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Updates</p>
            </div>
            <h2 className="font-headline text-4xl font-bold text-primary tracking-tighter italic">News</h2>
          </div>
        </header>

        <section className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <button onClick={onBack} className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 transition-all">
              <Icons.Close size={20} />
            </button>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Entry Panel</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed relative z-10">Real-time alerts and activity history for your store network.</p>
          <Icons.Notifications size={80} className="absolute -bottom-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
        </section>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-50">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-headline font-bold text-on-surface">{n.title}</h4>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(n.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{n.body}</p>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <Icons.Notifications size={48} className="mx-auto mb-4 opacity-20" />
            <p>No notifications yet.</p>
          </div>
        )}
      </div>
    </main>
  </div>
);

const OnboardingScreen = ({ user, invites, onAccept, onCreateOrg, onLogout }: { user: User, invites: any[], onAccept: (invite: any) => void, onCreateOrg: (name: string) => Promise<void>, onLogout: () => void }) => {
  const userInvites = invites.filter(i => i.email === user.email && i.status === 'PENDING');
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await onCreateOrg(orgName.trim());
    } catch (err: any) {
      setCreateError(err?.message || 'Could not create store');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary">
          <Icons.Security size={40} />
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary mb-3">Welcome to EthioVault</h1>
        <p className="text-slate-500 text-sm mb-10">Your account is active, but you need to be part of a store to see items.</p>

        {userInvites.length > 0 ? (
          <div className="space-y-4 mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Invitations</p>
            {userInvites.map(invite => (
              <div key={invite.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <p className="font-bold text-on-surface">{invite.invitedByEmail}</p>
                <p className="text-xs text-slate-500 mt-1">Invited you to join their store network.</p>
                <button 
                  onClick={() => onAccept(invite)}
                  className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-700 transition-all"
                >
                  Accept & Join Store
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-amber-50 rounded-2xl border border-amber-100 mb-8">
            <Icons.Warning size={32} className="text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-amber-900">No Invitations Found</p>
            <p className="text-xs text-amber-700 mt-2">Either ask an existing store admin to invite <span className="font-bold">{user.email}</span>, or create your own store below.</p>
          </div>
        )}

        <form onSubmit={submitCreate} className="space-y-3 text-left mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Create Your Store</p>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Store name"
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {createError && <p className="text-sm text-red-600 text-center">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !orgName.trim()}
            className="w-full py-4 bg-primary text-white rounded-2xl font-headline font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100"
          >
            {creating ? 'Creating\u2026' : 'Create Store & Continue'}
          </button>
        </form>

        <button 
          onClick={onLogout}
          className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
        >
          Logout & Try Another Account
        </button>
      </div>
    </div>
  );
};

// Per-screen data dependencies. Keys mirror the table names emitted on the
// 'vault:data-changed' event bus and used as keys in fetchersRef. Screens
// not listed here trigger no fetches (e.g. LOGIN, ONBOARDING, PROFILE).
const SCREEN_DEPS: Partial<Record<Screen, string[]>> = {
  DASHBOARD:      ['transactions'],
  VAULT_DASHBOARD:['transactions', 'warehouses'],
  WAREHOUSE:      ['transactions', 'warehouses'],
  BANK:           ['bank_accounts', 'bank_transactions', 'loans', 'users', 'inventory', 'contacts'],
  LOANS:          ['bank_accounts', 'bank_transactions', 'loans', 'users', 'inventory', 'contacts'],
  VAULT:          ['inventory', 'warehouses'],
  ITEMS:          ['inventory', 'warehouses'],
  NETWORK:        ['transactions', 'warehouses'],
  LEDGER:         ['transactions', 'loans', 'contacts', 'bank_accounts'],
  RECONCILE:      ['transactions'],
  AUDIT:          ['transactions'],
  INVITE:         ['invites', 'users'],
  EXPENSE:        ['bank_accounts'],
  SALE:           ['inventory', 'bank_accounts'],
  PURCHASE:       ['warehouses', 'bank_accounts'],
  LEND:           ['inventory'],
  TRANSFER:       ['inventory', 'warehouses'],
  DEBTS:          ['transactions'],
  NOTIFICATIONS:  ['notifications'],
  EMPLOYEE:       ['users', 'warehouses'],
  ROLE_HIERARCHY: ['users'],
  SALES_MANAGER:  ['transactions'],
  SALES:          ['transactions'],
  CONTACTS:       ['contacts', 'loans'],
  CONTRACTS:      ['contracts', 'contacts'],
  REPORTS:        ['transactions', 'inventory', 'loans', 'contacts', 'bank_accounts'],
};

// --- Main App ---

function App() {
  const [screen, setScreenState] = useState<Screen>('LOGIN');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('ALL');

  const setScreen = (s: Screen, warehouseId?: string) => {
    setScreenState(s);
    if (warehouseId) setTargetWarehouseId(warehouseId);
    else if (s === 'ITEMS' || s === 'VAULT') {
       // Only reset if specified
    } else {
       // setTargetWarehouseId('ALL');
    }
  };
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [orgName, setOrgName] = useState<string>('');
  // Screens visible only to admin/manager users.
  const ADMIN_ONLY_SCREENS: Screen[] = ['LOANS', 'SALES_MANAGER', 'EMPLOYEE', 'ROLE_HIERARCHY', 'AUDIT', 'WAREHOUSE', 'VAULT_DASHBOARD', 'CONTACTS', 'CONTRACTS', 'LEDGER', 'REPORTS'];
  React.useEffect(() => {
    if (!userData) return;
    if (userData.role !== 'admin' && ADMIN_ONLY_SCREENS.includes(screen)) {
      setScreenState('SALES');
    }
  }, [userData, screen]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [cart, setCart] = useState<{item: InventoryItem, salePrice: number}[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // -----------------------------------------------------------------
  // Role-aware data scoping. Admins see the full org; clerks only see
  // data they touched themselves so manager-level totals stay private.
  // -----------------------------------------------------------------
  // Anyone who isn't a clerk (staff member) can see the full org's data —
  // that includes Manager (admin) and Warehouse Manager. Clerks remain
  // restricted to rows they personally created.
  const isAdminUser = userData?.role !== 'clerk';
  const myUid = user?.uid;
  const visibleBankAccounts = React.useMemo(() => (
    isAdminUser
      ? bankAccounts
      : bankAccounts.filter(a => a.type === 'EMPLOYEE' && a.ownerId === myUid)
  ), [bankAccounts, isAdminUser, myUid]);
  const visibleBankTransactions = React.useMemo(() => {
    if (isAdminUser) return bankTransactions;
    const visibleIds = new Set(visibleBankAccounts.map(a => a.id));
    return bankTransactions.filter(t => visibleIds.has(t.bankAccountId));
  }, [bankTransactions, visibleBankAccounts, isAdminUser]);
  const visibleTransactions = React.useMemo(() => (
    isAdminUser
      ? transactions
      : transactions.filter(t => (t as any).clerkId === myUid || t.clerk === user?.displayName)
  ), [transactions, isAdminUser, myUid, user?.displayName]);
  const visibleUsers = React.useMemo(() => (
    isAdminUser ? users : users.filter(u => u.id === myUid || u.uid === myUid)
  ), [users, isAdminUser, myUid]);

  // Unified list of "trust contacts" — anyone we've ever lent items to,
  // taken/given a loan from, or saved as a favorite store. Used for both
  // the LendScreen recipient picker and the Loan modal counterparty input
  // so the two flows share a single contact book.
  const trustContacts = React.useMemo(() => {
    const set = new Set<string>();
    favorites.forEach(f => f && set.add(f));
    loans.forEach(l => l.counterparty && set.add(l.counterparty));
    transactions.forEach(t => {
      if ((t.type === 'LENT' || t.type === 'RETURNED' || t.type === 'LOAN' || t.type === 'REPAYMENT') && t.location) {
        set.add(t.location);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [favorites, loans, transactions]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user profile
        try {
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
            if (data.favorites) setFavorites(data.favorites);
            if (data.organizationId) {
              setScreen('DASHBOARD');
            } else {
              setScreen('ONBOARDING');
            }
          } else {
            // Auth user exists but no public.users row yet (trigger missed
            // this account). Bootstrap one now so subsequent writes work.
            const bootstrap = {
              email: u.email,
              displayName: u.displayName || null,
              photoURL: u.photoURL || null,
              role: u.email === 'aman.teferi.80@gmail.com' ? 'admin' : 'clerk',
              favorites: [],
            };
            try {
              await setDoc(doc(db, 'users', u.uid), bootstrap);
              setUserData({ uid: u.uid, ...bootstrap });
            } catch (e) {
              console.error('Failed to bootstrap user row', e);
            }
            setScreen('ONBOARDING');
          }
        } finally {
          // Only reveal the UI after the destination screen has been
          // resolved — otherwise React renders one frame with the default
          // screen ('LOGIN'), causing a login-screen flash on refresh.
          setIsAuthReady(true);
        }
      } else {
        setScreen('LOGIN');
        setUserData(null);
        setIsAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  // ─── Data layer ────────────────────────────────────────────────────
  // One fetcher per collection, exposed via a stable ref so the global
  // 'vault:data-changed' listener can invalidate just the affected
  // collection instead of refetching all 9 every time anything changes.
  //
  // We also lazy-load: a screen only triggers fetches for the collections
  // it actually displays, and `loadedRef` remembers what's already in the
  // cache so navigating back doesn't re-hit the network. Writes still
  // invalidate the relevant collection via the event bus.
  const fetchersRef = useRef<Record<string, () => Promise<void>>>({});
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const isClerk = userData?.role === 'clerk';
    const isAdminUser = userData?.role !== 'clerk' || user?.email === 'aman.teferi.80@gmail.com';

    const fetchInventory = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'inventory')));
        setInventory(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as InventoryItem)));
        loadedRef.current.add('inventory');
      } catch (e) { console.error('Failed to load inventory', e); notify.error(e); }
    };

    const fetchTransactions = async () => {
      try {
        const q = isClerk
          ? query(collection(db, 'transactions'), where('clerkId', '==', user.uid), orderBy('timestamp', 'desc'))
          : query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setTransactions(snap.docs.map((d: any) => ({ ...d.data(), id: d.id } as Transaction)));
        loadedRef.current.add('transactions');
      } catch (e) { console.error('Failed to load transactions', e); notify.error(e); }
    };

    const fetchNotifications = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'notifications'), orderBy('timestamp', 'desc')));
        setNotifications(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        loadedRef.current.add('notifications');
      } catch (e) { console.error('Failed to load notifications', e); notify.error(e); }
    };

    const fetchInvites = async () => {
      try {
        const q = isAdminUser
          ? query(collection(db, 'invites'), orderBy('timestamp', 'desc'))
          : query(collection(db, 'invites'), where('email', '==', user.email), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setInvites(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        loadedRef.current.add('invites');
      } catch (e) { console.error('Failed to load invites', e); notify.error(e); }
    };

    const fetchBankAccounts = async () => {
      try {
        const snap = await getDocs(collection(db, 'bankAccounts'));
        setBankAccounts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as BankAccount)));
        loadedRef.current.add('bank_accounts');
      } catch (e) { console.error('Failed to load bank accounts', e); notify.error(e); }
    };

    const fetchBankTransactions = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'bankTransactions'), orderBy('date', 'desc')));
        setBankTransactions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as BankTransaction)));
        loadedRef.current.add('bank_transactions');
      } catch (e) { console.error('Failed to load bank transactions', e); notify.error(e); }
    };

    const fetchLoans = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'loans'), orderBy('date', 'desc')));
        setLoans(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Loan)));
        loadedRef.current.add('loans');
      } catch (e) { console.error('Failed to load loans', e); notify.error(e); }
    };

    const fetchContacts = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'contacts'), orderBy('name', 'asc')));
        setContacts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Contact)));
        loadedRef.current.add('contacts');
      } catch (e) { console.error('Failed to load contacts', e); notify.error(e); }
    };

    const fetchContracts = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'contracts'), orderBy('createdAt', 'desc')));
        setContracts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Contract)));
        loadedRef.current.add('contracts');
      } catch (e) { console.error('Failed to load contracts', e); notify.error(e); }
    };

    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        loadedRef.current.add('users');
      } catch (e) { console.error('Failed to load users', e); notify.error(e); }
    };

    const fetchWarehouses = async () => {
      try {
        const snap = await getDocs(collection(db, 'warehouses'));
        setWarehouses(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Warehouse)));
        loadedRef.current.add('warehouses');
      } catch (e) { console.error('Failed to load warehouses', e); notify.error(e); }
    };

    // Map shim-event table names → fetchers. Some writes touch multiple
    // logical views, so a single mutation may invalidate more than one.
    fetchersRef.current = {
      inventory: fetchInventory,
      transactions: fetchTransactions,
      notifications: fetchNotifications,
      invites: fetchInvites,
      bank_accounts: fetchBankAccounts,
      bank_transactions: fetchBankTransactions,
      loans: fetchLoans,
      contacts: fetchContacts,
      contracts: fetchContracts,
      users: fetchUsers,
      warehouses: fetchWarehouses,
    };

    // Reset the cache for a fresh session and prefetch ONLY the small
    // collections needed by the app shell (notification bell + invite
    // acceptance flow). Everything else loads on demand per-screen.
    loadedRef.current = new Set();
    Promise.all([fetchNotifications(), fetchInvites()]);
  }, [user, userData?.role]);

  // Fetch organization display name whenever the user's org changes.
  useEffect(() => {
    const orgId = userData?.organizationId;
    if (!orgId) { setOrgName(''); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'organizations', orgId));
        if (snap.exists()) setOrgName((snap.data() as any).name || '');
      } catch (e) {
        handleDbError(e, OperationType.GET, `organizations/${orgId}`);
      }
    })();
  }, [userData?.organizationId]);

  // Single global listener: only refetch the collection that actually changed,
  // and only if it's already in our cache (i.e. some screen has shown it).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = (e: Event) => {
      const table = (e as CustomEvent).detail?.table as string | undefined;
      const fetchers = fetchersRef.current;
      const loaded = loadedRef.current;
      const refetchIfLoaded = (key: string) => {
        if (loaded.has(key)) fetchers[key]?.();
      };
      if (!table) {
        loaded.forEach(refetchIfLoaded);
        return;
      }
      refetchIfLoaded(table);
      // Cross-collection invariants: a bank movement may have just been
      // paired with a fresh transactions row, and vice versa.
      if (table === 'transactions') refetchIfLoaded('bank_transactions');
      if (table === 'bank_transactions') refetchIfLoaded('transactions');
      // Inventory writes often coincide with a PURCHASE audit row.
      if (table === 'inventory') refetchIfLoaded('transactions');
    };
    window.addEventListener('vault:data-changed', onChange);
    return () => window.removeEventListener('vault:data-changed', onChange);
  }, []);

  // Lazy per-screen loader: only fetch the collections the current screen
  // actually needs, and only the first time we visit it. Subsequent visits
  // are served from the in-memory cache (kept fresh by the event bus).
  useEffect(() => {
    if (!user) return;
    const fetchers = fetchersRef.current;
    const loaded = loadedRef.current;
    const deps = SCREEN_DEPS[screen] ?? [];
    deps.forEach(key => {
      if (!loaded.has(key)) fetchers[key]?.();
    });
  }, [screen, user, userData?.role]);

  useEffect(() => {
    (window as any).setScreen = setScreen;
  }, [setScreen]);

  const handleToggleFavorite = async (store: string) => {
    if (!user) return;
    const newFavorites = favorites.includes(store) 
      ? favorites.filter(f => f !== store) 
      : [...favorites, store];
    
    setFavorites(newFavorites);
    try {
      await setDoc(doc(db, 'users', user.uid), { favorites: newFavorites }, { merge: true });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'users');
    }
  };

  const handleInvite = async (email: string) => {
    try {
      await addDoc(collection(db, 'invites'), {
        email,
        role: 'clerk',
        invitedBy: user?.uid,
        status: 'PENDING',
        timestamp: serverTimestamp()
      });
      alert(`Invite sent to ${email}`);
    } catch (e) {
      handleDbError(e, OperationType.CREATE, 'invites');
    }
  };

  const cashOnHand = transactions.reduce((sum, tx) => {
    if (['PURCHASE', 'SALE', 'EXPENSE'].includes(tx.type)) return sum + (tx.amount || 0);
    if (tx.type === 'TRANSFER' && tx.transferType === 'CASH') return sum + (tx.amount || 0);
    return sum;
  }, 0);

  const inventoryValue = inventory.filter(i => i.status === 'IN_STOCK').reduce((sum, i) => sum + (i.valuation || 0), 0);
  const cashReceivable = transactions.filter(tx => tx.type === 'TRANSFER' && tx.transferType === 'CASH' && tx.direction === 'SEND' && tx.status === 'IN_TRANSIT').reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  const receivable = inventory.filter(i => i.status === 'LENT').reduce((sum, i) => sum + (i.valuation || 0), 0) + cashReceivable;
  const payable = transactions.filter(tx => tx.type === 'TRANSFER' && tx.direction === 'RECEIVE' && tx.status === 'IN_TRANSIT').reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  
  const metrics = { cashOnHand, inventoryValue, receivable, payable };

  const handleLogin = async (
    email: string,
    password: string,
    mode: 'signin' | 'signup',
    displayName?: string,
  ) => {
    if (mode === 'signup') {
      await signUpWithEmail(email, password, displayName);
      // Drop the auto-created session so the user must explicitly sign in.
      try { await logout(); } catch { /* ignore */ }
    } else {
      await loginWithEmail(email, password);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    if (!user) return;
    try {
      const newUser = {
        email: user.email,
        displayName: user.displayName || 'New User',
        photoURL: user.photoURL || 'https://picsum.photos/seed/clerk/100/100',
        role: 'clerk',
        organizationId: invite.organizationId,
        favorites: []
      };
      await setDoc(doc(db, 'users', user.uid), newUser, { merge: true });
      await updateDoc(doc(db, 'invites', invite.id), { status: 'ACCEPTED' });
      setUserData({ uid: user.uid, ...newUser });
      clearOrgCache();
      setScreen('DASHBOARD');
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'users/invites');
    }
  };

  const handleCreateOrganization = async (name: string) => {
    if (!user) return;
    const orgRef = await addDoc(collection(db, 'organizations'), { name });
    await setDoc(
      doc(db, 'users', user.uid),
      {
        // Include identity fields so that if the public.users row doesn't
        // exist yet, the merge-falls-back-to-upsert path satisfies the
        // NOT NULL email constraint.
        email: user.email,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        organizationId: orgRef.id,
        role: 'admin',
      },
      { merge: true }
    );
    clearOrgCache();
    setUserData((prev: any) => ({ ...(prev || {}), organizationId: orgRef.id, role: 'admin' }));
    setScreen('DASHBOARD');
  };

  const handleAddInventory = async (item: any) => {
    const purchasePrice = Number(item.purchasePrice);
    if (isNaN(purchasePrice)) {
      console.error("Invalid purchase price:", item.purchasePrice);
      return;
    }

    const hasManager = users.some(u => u.warehouseId === item.warehouseId && u.role === 'warehouse_manager');
    const isApproved = !hasManager;
    const status = hasManager ? 'PENDING_APPROVAL' : 'IN_STOCK';

    // 1) Always write the PURCHASE audit trail FIRST so it lands in
    //    "All Transactions" even if any downstream step fails.
    let txRef: any = null;
    try {
      txRef = await addDoc(collection(db, 'transactions'), {
        type: 'PURCHASE',
        item: item.name,
        amount: -purchasePrice,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: isApproved ? 'SETTLED' : 'PENDING',
        imei: item.imei,
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'transactions');
    }

    // 2) Create the inventory item.
    try {
      await addDoc(collection(db, 'inventory'), {
        ...item,
        purchasePrice,
        status,
        isApproved,
        warehouseId: item.warehouseId || null,
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'inventory');
    }

    // 3) Record the bank movement (requires the audit-trail tx id).
    if (txRef?.id) {
      const bankAcc = bankAccounts.find(a => a.type === 'STORE');
      if (bankAcc?.id) {
        try {
          await addDoc(collection(db, 'bankTransactions'), {
            bankAccountId: bankAcc.id,
            transactionId: txRef.id,
            type: 'WITHDRAWAL',
            amount: -purchasePrice,
            activity: `Purchase: ${item.name}`,
            date: new Date().toISOString(),
          });
        } catch (e) {
          handleDbError(e, OperationType.WRITE, 'bankTransactions');
        }
      }
    }

    // 4) Notify a manager if approval is required.
    if (hasManager) {
      try {
        await addDoc(collection(db, 'notifications'), {
          title: 'Approval Required',
          body: `New item ${item.name} added to warehouse. Needs approval from manager.`,
          timestamp: new Date().toISOString(),
          type: 'warning',
          warehouseId: item.warehouseId
        });
      } catch (e) {
        handleDbError(e, OperationType.WRITE, 'notifications');
      }
    }
  };

  const handleExpense = async (data: any) => {
    const amount = Number(data.amount);
    if (isNaN(amount)) {
      console.error("Invalid expense amount:", data.amount);
      return;
    }
    try {
      const txRef = await addDoc(collection(db, 'transactions'), {
        type: 'EXPENSE',
        item: data.category,
        amount: -amount,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: 'SETTLED',
      });

      if (data.bankAccountId) {
        await addDoc(collection(db, 'bankTransactions'), {
          bankAccountId: data.bankAccountId,
          transactionId: txRef.id,
          type: 'WITHDRAWAL',
          amount: -amount,
          activity: `Expense: ${data.category}`,
          date: new Date().toISOString(),
        });
      }
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'transactions');
    }
  };

  const handleSale = async (data: any) => {
    const amount = Number(data.amount);
    if (isNaN(amount)) {
      console.error("Invalid sale amount:", data.amount);
      return;
    }

    let txRef: any;
    try {
      txRef = await addDoc(collection(db, 'transactions'), {
        type: 'SALE',
        item: data.item,
        amount: amount,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: 'SETTLED',
        imei: data.imei,
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'transactions');
      return;
    }

    if (data.bankAccountId) {
      try {
        await addDoc(collection(db, 'bankTransactions'), {
          bankAccountId: data.bankAccountId,
          transactionId: txRef.id,
          type: 'DEPOSIT',
          amount: amount,
          activity: `Sale: ${data.item}`,
          date: new Date().toISOString(),
        });
      } catch (e) {
        handleDbError(e, OperationType.WRITE, 'bankTransactions');
      }
    }

    if (data.imei) {
      const item = inventory.find(i => i.imei === data.imei);
      if (item) {
        try {
          await setDoc(doc(db, 'inventory', item.id), {
            status: 'SOLD',
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          handleDbError(e, OperationType.WRITE, 'inventory');
        }
      }
    }

    try {
      await addDoc(collection(db, 'notifications'), {
        title: 'New Sale',
        body: `${userData?.displayName || 'Unknown'} sold ${data.item} for ${amount.toLocaleString()} ETB.`,
        timestamp: new Date().toISOString(),
        type: 'success'
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'notifications');
    }
  };

  const handleLend = async (data: any) => {
    const valuation = Number(data.valuation);
    if (isNaN(valuation)) {
      console.error("Invalid lending valuation:", data.valuation);
      return;
    }
    try {
      await setDoc(doc(db, 'inventory', data.itemId), {
        status: 'LENT',
        lentTo: data.location,
        valuation: valuation,
        expectedReturnDate: data.expectedReturnDate,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      await addDoc(collection(db, 'transactions'), {
        type: 'LENT',
        item: data.itemName,
        amount: 0,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: 'COMPLETED',
        imei: data.imei,
        location: data.location,
      });

      await addDoc(collection(db, 'notifications'), {
        title: 'Asset Lent',
        body: `${data.itemName} was lent to ${data.location}.`,
        timestamp: new Date().toISOString(),
        type: 'warning'
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'inventory/transactions');
    }
  };

  const handleReturn = async (item: any) => {
    const valuation = Number(item.valuation) || 0;
    try {
      await setDoc(doc(db, 'inventory', item.id), {
        status: 'IN_STOCK',
        lentTo: null,
        expectedReturnDate: null,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      await addDoc(collection(db, 'transactions'), {
        type: 'RETURNED',
        item: item.name,
        amount: valuation,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: 'SETTLED',
        imei: item.imei,
        location: item.lentTo,
      });
      setSelectedItemForHistory(null);
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'inventory/transactions');
    }
  };

  const handleSettleLentItem = async (item: any, cashReceived: number, bankAccountId?: string) => {
    const amount = Number(cashReceived);
    if (isNaN(amount)) {
      console.error("Invalid settlement amount:", cashReceived);
      return;
    }
    try {
      await setDoc(doc(db, 'inventory', item.id), {
        status: 'SOLD_BY_RECIPIENT',
        lentTo: null,
        expectedReturnDate: null,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      const txRef = await addDoc(collection(db, 'transactions'), {
        type: 'SALE',
        item: `${item.name} (Settled from ${item.lentTo})`,
        amount: amount,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: 'SETTLED',
        imei: item.imei,
        location: item.lentTo,
      });

      // Optionally pair the cash with a bank deposit so it shows on the
      // selected account's ledger.
      if (bankAccountId && amount > 0) {
        await addDoc(collection(db, 'bankTransactions'), {
          bankAccountId,
          transactionId: txRef.id,
          type: 'DEPOSIT',
          amount,
          activity: 'Lent Item Settled',
          project: 'Lend',
          to: item.lentTo || '',
          date: new Date().toISOString(),
        });
      }

      setSelectedItemForHistory(null);
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'inventory/transactions');
    }
  };

  const handleTransfer = async (data: any) => {
    const amount = Number(data.amount);
    if (isNaN(amount)) {
      console.error("Invalid transfer amount:", data.amount);
      return;
    }
    try {
      if (data.transferType === 'ASSET' && data.direction === 'SEND') {
        const item = inventory.find(i => i.imei === data.imei);
        if (item) {
          await setDoc(doc(db, 'inventory', item.id), {
            status: 'LENT',
            lentTo: data.location,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        }
      }

      await addDoc(collection(db, 'transactions'), {
        ...data,
        amount,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: data.transferType === 'CASH' ? 'COMPLETED' : 'IN_TRANSIT'
      });
      console.log('Transaction added:', data);

      await addDoc(collection(db, 'notifications'), {
        title: 'Network Transfer',
        body: `${data.direction === 'SEND' ? 'Sent' : 'Received'} ${data.item} ${data.direction === 'SEND' ? 'to' : 'from'} ${data.direction === 'SEND' ? data.location : data.source}.`,
        timestamp: new Date().toISOString(),
        type: 'info'
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'transactions');
    }
  };

  const handleUpdateProfile = async (data: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        ...data
      }, { merge: true });
      setUserData({ ...userData, ...data });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'users');
    }
  };

  const handleAddWarehouse = async (warehouse: Partial<Warehouse>) => {
    try {
      await addDoc(collection(db, 'warehouses'), {
        ...warehouse,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'warehouses');
    }
  };

  const handleUpdateWarehouse = async (id: string, data: Partial<Warehouse>) => {
    try {
      await updateDoc(doc(db, 'warehouses', id), data);
    } catch (e) {
      handleDbError(e, OperationType.WRITE, `warehouses/${id}`);
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'warehouses', id));
    } catch (e) {
      handleDbError(e, OperationType.DELETE, `warehouses/${id}`);
    }
  };

  const handleMoveItem = async (itemId: string, warehouseId: string) => {
    try {
      await updateDoc(doc(db, 'inventory', itemId), { warehouseId });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, `inventory/${itemId}`);
    }
  };
  const handleAddBankAccount = async (acc: any) => {
    if (!userData?.organizationId) {
      handleDbError(new Error('No organization selected'), OperationType.WRITE, 'bankAccounts');
      return;
    }
    const isAdminUser = userData?.role === 'admin';
    // Clerks may only ever create their own EMPLOYEE bank account.
    const safeType = isAdminUser ? (acc.type || 'STORE') : 'EMPLOYEE';
    const safeOwner = isAdminUser
      ? (acc.ownerId || 'STORE')
      : (user?.uid || acc.ownerId);
    try {
      await addDoc(collection(db, 'bankAccounts'), {
        ...acc,
        organizationId: userData.organizationId,
        currency: 'ETB',
        balance: Number(acc.balance),
        type: safeType,
        ownerId: safeOwner,
      });
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'bankAccounts');
    }
  };

  const handleAddContact = async (c: Partial<Contact>): Promise<Contact | null> => {
    if (!userData?.organizationId) {
      handleDbError(new Error('No organization selected'), OperationType.WRITE, 'contacts');
      return null;
    }
    if (!c.name?.trim()) return null;
    try {
      const ref = await addDoc(collection(db, 'contacts'), {
        name: c.name.trim(),
        type: c.type || 'BOTH',
        phone: c.phone || null,
        email: c.email || null,
        notes: c.notes || null,
        organizationId: userData.organizationId,
      });
      const created: Contact = {
        id: ref.id,
        name: c.name.trim(),
        type: (c.type || 'BOTH') as Contact['type'],
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        organizationId: userData.organizationId,
      };
      setContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'contacts');
      return null;
    }
  };

  const handleUpdateContact = async (id: string, patch: Partial<Contact>) => {
    try {
      await setDoc(doc(db, 'contacts', id), {
        name: patch.name,
        type: patch.type,
        phone: patch.phone ?? null,
        email: patch.email ?? null,
        notes: patch.notes ?? null,
      }, { merge: true });
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    } catch (e) {
      handleDbError(e, OperationType.WRITE, `contacts/${id}`);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contacts', id));
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      handleDbError(e, OperationType.DELETE, `contacts/${id}`);
    }
  };

  const handleAddContract = async (c: Partial<Contract>): Promise<Contract | null> => {
    if (!userData?.organizationId) {
      handleDbError(new Error('No organization selected'), OperationType.WRITE, 'contracts');
      return null;
    }
    if (!c.name?.trim() || !c.contactId) return null;
    try {
      const code = `CONT-${String(contracts.length + 1).padStart(5, '0')}`;
      const vendor = contacts.find(x => x.id === c.contactId);
      const payload: any = {
        code,
        name: c.name.trim(),
        contactId: c.contactId,
        clientParty: c.clientParty || orgName || null,
        vendorParty: vendor?.name || c.vendorParty || null,
        amount: Number(c.amount || 0),
        currency: c.currency || 'ETB',
        term: c.term || 'ONE_TIME',
        recurrence: c.recurrence || null,
        startDate: c.startDate || null,
        endDate: c.endDate || null,
        status: c.status || 'APPROVED',
        notes: c.notes || null,
        organizationId: userData.organizationId,
        createdAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, 'contracts'), payload);
      const created: Contract = { id: ref.id, ...payload } as Contract;
      setContracts(prev => [created, ...prev]);
      return created;
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'contracts');
      return null;
    }
  };

  const handleUpdateContract = async (id: string, patch: Partial<Contract>) => {
    try {
      await setDoc(doc(db, 'contracts', id), patch, { merge: true });
      setContracts(prev => prev.map(c => c.id === id ? { ...c, ...patch } as Contract : c));
    } catch (e) {
      handleDbError(e, OperationType.WRITE, `contracts/${id}`);
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contracts', id));
      setContracts(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      handleDbError(e, OperationType.DELETE, `contracts/${id}`);
    }
  };

  const handleToggleMaintenance = async (id: string, value: boolean) => {
    try {
      await setDoc(doc(db, 'inventory', id), { underMaintenance: value }, { merge: true });
      setInventory(prev => prev.map(it => it.id === id ? { ...it, underMaintenance: value } : it));
      setSelectedItemForHistory((prev: any) => prev && prev.id === id ? { ...prev, underMaintenance: value } : prev);
    } catch (e) {
      handleDbError(e, OperationType.WRITE, `inventory/${id}`);
    }
  };

  const handleAddLoan = async (loan: Partial<Loan>) => {
    if (!userData?.organizationId) {
      handleDbError(new Error('No organization selected'), OperationType.WRITE, 'loans');
      return;
    }
    try {
      const amount = Number(loan.amount || 0);
      const isOutflow = loan.type === 'GIVEN'; // we paid the counterparty
      const counterparty = loan.counterparty || 'Unknown';

      // Always create a transactions row so the loan shows up in All
      // Transactions and so any paired bank movement has a transaction_id
      // to satisfy the bank_transactions FK.
      const txRef = await addDoc(collection(db, 'transactions'), {
        type: 'LOAN',
        item: isOutflow ? `Loan to ${counterparty}` : `Loan from ${counterparty}`,
        amount: isOutflow ? -amount : amount,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: 'COMPLETED',
        location: counterparty,
      });

      await addDoc(collection(db, 'loans'), {
        type: loan.type || 'GIVEN',
        counterparty: loan.counterparty,
        contactId: loan.contactId || null,
        amount,
        bankAccountId: loan.bankAccountId || null,
        status: 'OUTSTANDING',
        date: new Date().toISOString(),
        dueDate: loan.dueDate || null,
        notes: loan.notes || null,
        organizationId: userData.organizationId,
      });

      // If linked to a bank account, record the cash movement.
      if (loan.bankAccountId && amount > 0) {
        await addDoc(collection(db, 'bankTransactions'), {
          bankAccountId: loan.bankAccountId,
          transactionId: txRef.id,
          type: isOutflow ? 'WITHDRAWAL' : 'DEPOSIT',
          amount,
          activity: isOutflow ? 'Loan Given' : 'Loan Received',
          project: 'Loan',
          to: counterparty,
          date: new Date().toISOString(),
        });
      }
    } catch (e) {
      handleDbError(e, OperationType.WRITE, 'loans');
    }
  };

  const handleSettleLoan = async (loan: Loan, amount?: number) => {
    try {
      const remaining = Number(loan.amount || 0);
      const paid = amount && amount > 0 && amount < remaining ? amount : remaining;
      const isPartial = paid < remaining;
      const isInflow = loan.type === 'GIVEN'; // counterparty paid us back
      const counterparty = loan.counterparty || 'Unknown';

      // Mirror the audit row first so any bank movement has a transaction_id.
      const txRef = await addDoc(collection(db, 'transactions'), {
        type: 'REPAYMENT',
        item: isInflow
          ? `Repayment from ${counterparty}${isPartial ? ' (partial)' : ''}`
          : `Repayment to ${counterparty}${isPartial ? ' (partial)' : ''}`,
        amount: isInflow ? paid : -paid,
        timestamp: new Date().toISOString(),
        clerk: user?.displayName || 'Unknown',
        clerkId: user?.uid,
        status: isPartial ? 'PENDING' : 'SETTLED',
        location: counterparty,
      });

      if (isPartial) {
        await updateDoc(doc(db, 'loans', loan.id), { amount: remaining - paid });
      } else {
        await updateDoc(doc(db, 'loans', loan.id), { status: 'SETTLED' });
      }

      // Pair settlement with reverse cash movement when a bank account is linked.
      if (loan.bankAccountId && paid > 0) {
        await addDoc(collection(db, 'bankTransactions'), {
          bankAccountId: loan.bankAccountId,
          transactionId: txRef.id,
          type: isInflow ? 'DEPOSIT' : 'WITHDRAWAL',
          amount: paid,
          activity: isPartial
            ? (isInflow ? 'Loan Repaid (Partial · In)' : 'Loan Repaid (Partial · Out)')
            : (isInflow ? 'Loan Repaid (In)' : 'Loan Repaid (Out)'),
          project: 'Loan',
          to: counterparty,
          date: new Date().toISOString(),
        });
      }
    } catch (e) {
      handleDbError(e, OperationType.WRITE, `loans/${loan.id}`);
    }
  };

  const handleUpdateRole = async (uid: string, role: string, warehouseId?: string) => {
    try {
      const updates: any = { role };
      if (role === 'warehouse_manager') {
        updates.warehouseId = warehouseId || null;
      }
      await updateDoc(doc(db, 'users', uid), updates);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } : u));
    } catch (e) {
      handleDbError(e, OperationType.WRITE, `users/${uid}`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user || userData?.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    } catch (e) {
      handleDbError(e, OperationType.DELETE, `transactions/${id}`);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-headline font-bold tracking-widest uppercase text-xs">Loading Items...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastHost />
      <div className="min-h-screen bg-[#F7F9FB] font-body text-on-surface selection:bg-primary/10">
        <AnimatePresence mode="wait">
          {screen === 'LOGIN' ? (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoginScreen onLogin={handleLogin} />
            </motion.div>
          ) : screen === 'ONBOARDING' ? (
            <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <OnboardingScreen
                user={user!}
                invites={invites}
                onAccept={handleAcceptInvite}
                onCreateOrg={handleCreateOrganization}
                onLogout={handleLogout}
              />
            </motion.div>
          ) : (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex">
              <NewSidebar 
                currentScreen={screen}
                setScreen={setScreen}
                user={user}
                userData={userData}
                orgName={orgName}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />
              
              <main className="flex-1 lg:ml-64 min-h-screen transition-all duration-300">
                {screen === 'PROFILE' && <ProfileScreen onBack={() => setScreen('DASHBOARD')} user={user} userData={userData} onUpdate={handleUpdateProfile} canInstall={!!deferredPrompt} onInstall={handleInstall} />}
                {screen === 'DASHBOARD' && (
                  <ExecutiveDashboard 
                    transactions={visibleTransactions} 
                    onOpenSidebar={() => setIsSidebarOpen(true)} 
                    onActionClick={(s: Screen) => setScreen(s)}
                    onSearchClick={() => setScreen('VAULT')}
                  />
                )}
                {(screen === 'VAULT_DASHBOARD' || screen === 'WAREHOUSE') && (
                  <WarehouseScreen 
                    setScreen={setScreen} 
                    transactions={visibleTransactions} 
                    metrics={metrics} 
                    onTransactionClick={setSelectedTransaction}
                    warehouses={warehouses}
                    onAddWarehouse={handleAddWarehouse}
                    onUpdateWarehouse={handleUpdateWarehouse}
                    onDeleteWarehouse={handleDeleteWarehouse}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'BANK' && <BankScreen accounts={visibleBankAccounts} transactions={visibleBankTransactions} onAddAccount={handleAddBankAccount} onOpenSidebar={() => setIsSidebarOpen(true)} users={visibleUsers} loans={loans} onAddLoan={handleAddLoan} onSettleLoan={handleSettleLoan} trustContacts={trustContacts} contacts={contacts} onAddContact={handleAddContact} inventory={inventory} onReturnItem={handleReturn} onSettleItem={handleSettleLentItem} />}
                {screen === 'LOANS' && <BankScreen accounts={visibleBankAccounts} transactions={visibleBankTransactions} onAddAccount={handleAddBankAccount} onOpenSidebar={() => setIsSidebarOpen(true)} users={visibleUsers} loans={loans} onAddLoan={handleAddLoan} onSettleLoan={handleSettleLoan} initialTab="Loans" trustContacts={trustContacts} contacts={contacts} onAddContact={handleAddContact} inventory={inventory} onReturnItem={handleReturn} onSettleItem={handleSettleLentItem} />}
                {(screen === 'VAULT' || screen === 'ITEMS') && (
                  <VaultScreen 
                    inventory={inventory} 
                    onItemClick={setSelectedItemForHistory} 
                    onMoveItem={handleMoveItem} 
                    warehouses={warehouses}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    initialWarehouseId={targetWarehouseId}
                    onLogPurchase={() => setScreen('PURCHASE')}
                    onToggleMaintenance={handleToggleMaintenance}
                  />
                )}
                {screen === 'NETWORK' && (
                  <NetworkOverviewScreen 
                    transactions={visibleTransactions} 
                    warehouses={warehouses} 
                    metrics={metrics} 
                    onOpenSidebar={() => setIsSidebarOpen(true)} 
                    onSetScreen={setScreen} 
                  />
                )}
                {screen === 'LEDGER' && (
                  <LedgerScreen
                    loans={loans}
                    contacts={contacts}
                    bankAccounts={visibleBankAccounts}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    onAddContact={handleAddContact}
                    onUpdateContact={handleUpdateContact}
                    onDeleteContact={handleDeleteContact}
                    onSettleLoan={handleSettleLoan}
                    onAddLoan={handleAddLoan}
                  />
                )}
                {screen === 'CONTACTS' && (
                  <ContactsScreen
                    contacts={contacts}
                    loans={loans}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    onAddContact={handleAddContact}
                    onUpdateContact={handleUpdateContact}
                    onDeleteContact={handleDeleteContact}
                  />
                )}
                {screen === 'CONTRACTS' && (
                  <ContractsScreen
                    contracts={contracts}
                    contacts={contacts}
                    orgName={orgName}
                    userName={userData?.displayName || userData?.email || user?.email || ''}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    onAddContract={handleAddContract}
                    onDeleteContract={handleDeleteContract}
                  />
                )}
                {screen === 'REPORTS' && (
                  <ReportsScreen
                    transactions={visibleTransactions}
                    inventory={inventory}
                    loans={loans}
                    contacts={contacts}
                    bankAccounts={visibleBankAccounts}
                    orgName={orgName}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'RECONCILE' && (
                  <ReconcileScreen 
                    onBack={() => setScreen('DASHBOARD')} 
                    transactions={visibleTransactions} 
                    userData={userData} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'INVITE' && (
                  <InviteScreen 
                    onBack={() => setScreen('DASHBOARD')} 
                    onInvite={handleInvite} 
                    invites={invites} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'EXPENSE' && (
                  <ExpenseScreen 
                    onBack={() => setScreen('DASHBOARD')} 
                    onExpense={async (data) => {
                      await handleExpense(data);
                    }} 
                    bankAccounts={visibleBankAccounts} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'SALE' && (
                  <SaleScreen 
                    onBack={() => setScreen('DASHBOARD')} 
                    onSale={handleSale} 
                    inventory={inventory} 
                    cart={cart} 
                    setCart={setCart} 
                    bankAccounts={visibleBankAccounts} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'PURCHASE' && (
                  <PurchaseScreen 
                    onBack={() => setScreen('DASHBOARD')} 
                    onAdd={handleAddInventory} 
                    warehouses={warehouses} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'LEND' && (
                  <LendScreen 
                    onBack={() => setScreen('DASHBOARD')} 
                    inventory={inventory} 
                    onLend={handleLend} 
                    stores={trustContacts}
                    onCreateStore={handleToggleFavorite}
                    favorites={favorites} 
                    onToggleFavorite={handleToggleFavorite} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'TRANSFER' && (
                  <TransferScreen 
                    onBack={() => setScreen('NETWORK')} 
                    inventory={inventory} 
                    onTransfer={handleTransfer} 
                    stores={favorites}
                    onCreateStore={handleToggleFavorite}
                    favorites={favorites} 
                    onToggleFavorite={handleToggleFavorite} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'DEBTS' && (
                  <DebtScreen 
                    transactions={visibleTransactions} 
                    onBack={() => setScreen('DASHBOARD')} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'NOTIFICATIONS' && (
                  <NotificationsScreen 
                    notifications={notifications} 
                    onBack={() => setScreen('DASHBOARD')} 
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                  />
                )}
                {screen === 'EMPLOYEE' && (
                  <EmployeeScreen 
                    users={users} 
                    onOpenSidebar={() => setIsSidebarOpen(true)} 
                    onUpdateRole={handleUpdateRole}
                    warehouses={warehouses}
                  />
                )}
                
                {screen === 'SALES_MANAGER' && (
                  <SalesHistoryScreen 
                    transactions={transactions} 
                    onOpenSidebar={() => setIsSidebarOpen(true)} 
                    onSetScreen={setScreen} 
                    onSetTransaction={setSelectedTransaction}
                  />
                )}
                
                {screen === 'SALES' && (
                   <div className="min-h-screen bg-[#F8FAFC] p-8">
                     <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                           <button 
                             onClick={() => setIsSidebarOpen(true)}
                             className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"
                           >
                             <Icons.Menu size={24} />
                           </button>
                           <div>
                             <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Operations Center</p>
                             </div>
                             <h2 className="text-4xl font-headline font-bold tracking-tighter text-primary">Sales Activity</h2>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button onClick={() => setScreen('SALE')} className="flex items-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-primary/10 hover:opacity-90 active:scale-95 transition-all">
                              <Icons.Plus size={20} />
                              <span>New Sale</span>
                           </button>
                           <button onClick={() => setScreen('PURCHASE')} className="flex items-center gap-2 bg-white text-primary border border-slate-100 px-6 py-4 rounded-2xl font-bold text-sm shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
                              <Icons.Package size={20} />
                              <span>Log Purchase</span>
                           </button>
                        </div>
                     </header>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div onClick={() => setScreen('SALE')} className="bg-primary p-8 rounded-[3rem] text-white shadow-2xl shadow-primary/20 hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden group">
                           <Icons.Plus size={120} className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform" />
                           <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                              <Icons.Sales size={32} />
                           </div>
                           <h3 className="text-2xl font-headline font-bold mb-2">Process New Sale</h3>
                           <p className="text-white/60 text-sm leading-relaxed">Instantly add a sale transaction with IMEI tracking and automated profit calculation.</p>
                        </div>
                        <div onClick={() => setScreen('SALES_MANAGER')} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden group">
                           <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-primary">
                              <Icons.Ledger size={32} />
                           </div>
                           <h3 className="text-2xl font-headline font-bold mb-2 text-primary">View All Sales</h3>
                           <p className="text-slate-400 text-sm leading-relaxed">Review the complete history of all sales across all branches and personnel.</p>
                        </div>
                        <div onClick={() => setScreen('LEDGER')} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden group">
                           <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-primary">
                              <Icons.History size={32} />
                           </div>
                           <h3 className="text-2xl font-headline font-bold mb-2 text-primary">Activity Timeline</h3>
                           <p className="text-slate-400 text-sm leading-relaxed">See all movements including lends, returns, and transfers in chronological order.</p>
                        </div>
                     </div>
                   </div>
                )}

                {['ROLE_HIERARCHY'].includes(screen) && (
                   <div className="p-8">
                     <header className="mb-8 flex items-center gap-4">
                        <button 
                          onClick={() => setIsSidebarOpen(true)}
                          className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400"
                        >
                          <Icons.Menu size={20} />
                        </button>
                        <div>
                          <h2 className="text-2xl font-headline font-bold">{screen.replace('_', ' ')}</h2>
                          <p className="text-slate-500">Coming soon based on your company configuration.</p>
                        </div>
                     </header>
                   </div>
                )}
              </main>

              <ItemHistoryOverlay 
                item={selectedItemForHistory} 
                transactions={transactions} 
                onClose={() => setSelectedItemForHistory(null)}
                onReturn={handleReturn}
                onSettle={handleSettleLentItem}
                onToggleMaintenance={handleToggleMaintenance}
              />

              {selectedTransaction && (
                <TransactionDetailsOverlay
                  transaction={selectedTransaction}
                  onClose={() => setSelectedTransaction(null)}
                  onDelete={handleDeleteTransaction}
                  isAdmin={userData?.role === 'admin'}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

export default App;
