'use client';

import React, { useState, useMemo } from 'react';
import { Icons, BankAccount, BankTransaction, Loan, InventoryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { AsyncButton } from './AsyncButton';

interface BankScreenProps {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  onAddAccount: (acc: Partial<BankAccount>) => void;
  onOpenSidebar: () => void;
  users: any[];
  loans: Loan[];
  onAddLoan: (loan: Partial<Loan>) => void;
  onSettleLoan: (loan: Loan, amount?: number) => void;
  initialTab?: 'Banks' | 'Others' | 'Loans' | 'Report';
  trustContacts?: string[];
  inventory?: InventoryItem[];
  onReturnItem?: (item: InventoryItem) => void;
  onSettleItem?: (item: InventoryItem, cashReceived: number, bankAccountId?: string) => void;
}

export const BankScreen: React.FC<BankScreenProps> = ({ accounts, transactions, onAddAccount, onOpenSidebar, users, loans, onAddLoan, onSettleLoan, initialTab, trustContacts = [], inventory = [], onReturnItem, onSettleItem }) => {
  // Live balance per account = baseline + deposits - withdrawals.
  const balanceFor = React.useCallback((acc: BankAccount) => {
    const txs = transactions.filter(t => t.bankAccountId === acc.id);
    const delta = txs.reduce((sum, t) => {
      const amt = Number(t.amount || 0);
      if (t.type === 'DEPOSIT') return sum + amt;
      if (t.type === 'WITHDRAWAL') return sum - amt;
      return sum;
    }, 0);
    return Number(acc.balance || 0) + delta;
  }, [transactions]);
  const [activeTab, setActiveTab] = useState<'Banks' | 'Others' | 'Loans' | 'Report'>(initialTab || 'Banks');
  React.useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [settlingLoanId, setSettlingLoanId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [loanSearch, setLoanSearch] = useState('');
  const [loanFilter, setLoanFilter] = useState<'ALL' | 'CASH' | 'ITEM' | 'OUTSTANDING' | 'SETTLED'>('ALL');
  const [settlingItemId, setSettlingItemId] = useState<string | null>(null);
  const [itemSettleAmount, setItemSettleAmount] = useState('');
  const [itemSettleAccount, setItemSettleAccount] = useState('');
  const [hiddenBalances, setHiddenBalances] = useState<Set<string>>(new Set());
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    type: 'GIVEN',
    counterparty: '',
    amount: 0,
    bankAccountId: '',
    dueDate: '',
    notes: ''
  });
  const [newBank, setNewBank] = useState<{
    bankName: string;
    accountNumber: string;
    balance: number;
    color: string;
    type: 'STORE' | 'EMPLOYEE';
    ownerId: string;
  }>({ 
    bankName: '', 
    accountNumber: '', 
    balance: 0, 
    color: '#1A1D23',
    type: 'STORE',
    ownerId: 'STORE'
  });

  const toggleHide = (id: string) => {
    setHiddenBalances(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const colors = [
    { name: 'Gold', value: '#EAB308' },
    { name: 'Purple', value: '#581C87' },
    { name: 'Dark', value: '#1A1D23' },
    { name: 'Blue', value: '#1E3A8A' },
  ];

  const filteredAccounts = useMemo(() => {
    if (activeTab === 'Banks') {
      return accounts.filter(acc => acc.type === 'STORE' || !acc.type);
    }
    if (activeTab === 'Others') {
      const employeeAccounts = accounts.filter(acc => acc.type === 'EMPLOYEE');
      if (!selectedEmployeeId) return employeeAccounts;
      return employeeAccounts.filter(acc => acc.ownerId === selectedEmployeeId);
    }
    return accounts;
  }, [accounts, activeTab, selectedEmployeeId]);

  return (
    <div className="flex-1 bg-[#F7F9FB] min-h-screen p-4 lg:p-8">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenSidebar}
            className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <Icons.Menu size={20} />
          </button>
          <div className="hidden lg:flex w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 items-center justify-center text-slate-400 font-bold">
            <Icons.Bank size={20} />
          </div>
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Bank</h2>
            <p className="text-xs text-slate-400 font-medium">Create and Manage Banks</p>
          </div>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
          <div className="flex shrink-0 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            {(['Banks', 'Others', 'Loans', 'Report'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab ? 'bg-slate-100 text-on-surface' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              if (activeTab === 'Loans') {
                setNewLoan({ type: 'GIVEN', counterparty: '', amount: 0, bankAccountId: '', dueDate: '', notes: '' });
                setShowLoanModal(true);
                return;
              }
              setNewBank({
                ...newBank,
                type: activeTab === 'Others' ? 'EMPLOYEE' : 'STORE',
                ownerId: activeTab === 'Others' ? (selectedEmployeeId || '') : 'STORE'
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-white px-6 py-3 rounded-xl border border-slate-100 shadow-sm text-xs font-bold hover:bg-slate-50 transition-all border-none shadow-none bg-slate-100/50"
          >
            <Icons.Plus size={16} />
            <span>{activeTab === 'Loans' ? 'New Loan' : 'Add Bank'}</span>
          </button>
        </div>
      </header>

      {/* Cards Scroll */}
      {activeTab !== 'Loans' && (
      <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-8 no-scrollbar -mx-4 px-4 h-[300px] items-center">
        {filteredAccounts.map((acc) => {
          const isHidden = hiddenBalances.has(acc.id);
          const last4 = acc.accountNumber.slice(-4);
          return (
            <div 
              key={acc.id}
              style={{ backgroundColor: acc.color }}
              className="min-w-[280px] sm:min-w-[420px] h-[260px] rounded-[2.5rem] p-8 text-white relative shadow-2xl shadow-black/20 flex flex-col justify-between group overflow-hidden shrink-0"
            >
              {/* Header */}
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.25em] mb-2">
                    {acc.type === 'EMPLOYEE' ? 'Employee Account' : 'Store Account'}
                  </p>
                  <h3 className="text-2xl font-headline font-bold leading-tight">{acc.bankName}</h3>
                </div>
                <button
                  onClick={() => toggleHide(acc.id)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title={isHidden ? 'Show balance' : 'Hide balance'}
                >
                  {isHidden ? <Icons.Info size={16} /> : <Icons.Search size={16} />}
                </button>
              </div>

              {/* Balance */}
              <div className="relative z-10">
                <p className="text-[10px] uppercase font-bold opacity-60 tracking-[0.25em] mb-2">
                  Total Balance
                </p>
                <p className="text-4xl font-headline font-bold tracking-tight">
                  {isHidden ? '••••••' : balanceFor(acc).toLocaleString()}
                  <span className="text-sm font-medium opacity-60 ml-2">{acc.currency || 'ETB'}</span>
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-50 tracking-[0.25em] mb-1">
                    Account
                  </p>
                  <p className="font-mono text-sm tracking-wider opacity-90">
                    {isHidden ? '•••• ' + last4 : acc.accountNumber}
                  </p>
                </div>
              </div>

              {/* Decorative Wave */}
              <div className="absolute right-0 bottom-0 pointer-events-none opacity-10">
                <svg width="220" height="220" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M200 0C200 0 150 50 150 100C150 150 200 200 200 200V0Z" fill="white"/>
                  <path opacity="0.5" d="M150 0C150 0 100 50 100 100C100 150 150 200 150 200V0Z" fill="white"/>
                </svg>
              </div>
            </div>
          );
        })}

        {filteredAccounts.length === 0 && (
          <div className="min-w-[280px] sm:min-w-[420px] h-[260px] bg-slate-50 border border-slate-100 rounded-[2.5rem] flex flex-col justify-center items-center gap-4 text-slate-400">
             <Icons.Bank size={48} className="opacity-10" />
             <p className="text-sm font-medium opacity-60">No accounts found</p>
          </div>
        )}
      </div>
      )}

      {/* Employee List Pills - Screenshot match */}
      {activeTab === 'Others' && (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 mb-8 -mx-4 px-4">
           <button
             onClick={() => setSelectedEmployeeId(null)}
             className={`flex items-center gap-3 px-1 py-1 pr-6 rounded-full border transition-all shrink-0 ${
               !selectedEmployeeId
                 ? 'bg-white border-primary/10 shadow-lg text-primary'
                 : 'bg-white/50 border-slate-100 text-slate-500 hover:bg-white'
             }`}
           >
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border ${
               !selectedEmployeeId ? 'bg-primary text-white border-primary' : 'bg-slate-100 border-slate-200'
             }`}>
               ALL
             </div>
             <span className="text-xs font-bold whitespace-nowrap">All Employees</span>
           </button>
           {users.map((emp) => {
             const initials = emp.displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??';
             const isSelected = selectedEmployeeId === emp.id;
             return (
               <button
                 key={emp.id}
                 onClick={() => setSelectedEmployeeId(emp.id)}
                 className={`flex items-center gap-3 px-1 py-1 pr-6 rounded-full border transition-all shrink-0 ${
                   isSelected 
                     ? 'bg-white border-primary/10 shadow-lg text-primary' 
                     : 'bg-white/50 border-slate-100 text-slate-500 hover:bg-white'
                 }`}
               >
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                   isSelected ? 'bg-primary text-white border-primary' : 'bg-slate-100 border-slate-200'
                 }`}>
                   {initials}
                 </div>
                 <span className="text-xs font-bold whitespace-nowrap">{emp.displayName}</span>
               </button>
             );
           })}
        </div>
      )}

      {/* Transactions Table */}
      {activeTab !== 'Loans' && (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        <table className="min-w-[800px] lg:w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Type</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Amount</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Activity</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">Project</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest">To</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1">
                Date <Icons.TrendingDown size={14} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.filter(tx => 
              filteredAccounts.some(acc => acc.id === tx.bankAccountId)
            ).map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                    tx.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-700' : 
                    tx.type === 'WITHDRAWAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-8 py-4 font-headline font-bold text-sm text-on-surface">
                  {tx.amount.toLocaleString()} ETB
                </td>
                <td className="px-8 py-4 text-xs font-medium text-slate-600">{tx.activity}</td>
                <td className="px-8 py-4 text-xs font-medium text-slate-600">{tx.project}</td>
                <td className="px-8 py-4 text-xs font-medium text-slate-600">{tx.to}</td>
                <td className="px-8 py-4 text-xs font-medium text-slate-400">{new Date(tx.date).toLocaleDateString()}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Icons.History size={40} className="text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">No transactions found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Loans Section */}
      {activeTab === 'Loans' && (() => {
        const lentItems = inventory.filter(i => i.status === 'LENT' || i.status === 'SOLD_BY_RECIPIENT');
        const matchesSearch = (text: string) => !loanSearch || text.toLowerCase().includes(loanSearch.toLowerCase());
        const showCash = loanFilter === 'ALL' || loanFilter === 'CASH' || loanFilter === 'OUTSTANDING' || loanFilter === 'SETTLED';
        const showItems = loanFilter === 'ALL' || loanFilter === 'ITEM' || loanFilter === 'OUTSTANDING' || loanFilter === 'SETTLED';
        const passesStatus = (settled: boolean) => {
          if (loanFilter === 'OUTSTANDING') return !settled;
          if (loanFilter === 'SETTLED') return settled;
          return true;
        };

        const cashGiven = showCash ? loans.filter(l =>
          l.type === 'GIVEN' &&
          passesStatus(l.status === 'SETTLED') &&
          (matchesSearch(l.counterparty || '') || matchesSearch(l.notes || ''))
        ) : [];
        const cashReceived = showCash ? loans.filter(l =>
          l.type === 'RECEIVED' &&
          passesStatus(l.status === 'SETTLED') &&
          (matchesSearch(l.counterparty || '') || matchesSearch(l.notes || ''))
        ) : [];
        const itemLoans = showItems ? lentItems.filter(i =>
          passesStatus(i.status === 'SOLD_BY_RECIPIENT') &&
          (matchesSearch(i.name || '') || matchesSearch(i.lentTo || '') || matchesSearch(i.imei || ''))
        ) : [];

        const totalGivenOutstanding = loans.filter(l => l.type === 'GIVEN' && l.status === 'OUTSTANDING').reduce((s, l) => s + Number(l.amount || 0), 0);
        const totalReceivedOutstanding = loans.filter(l => l.type === 'RECEIVED' && l.status === 'OUTSTANDING').reduce((s, l) => s + Number(l.amount || 0), 0);
        const totalItemsOutstanding = lentItems.filter(i => i.status === 'LENT').reduce((s, i) => s + Number(i.valuation || 0), 0);

        const ownerName = (uid?: string) => users.find(u => u.id === uid || u.uid === uid)?.displayName || 'Staff';

        const CashSection = ({ title, items, accent }: { title: string, items: Loan[], accent: string }) => (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-headline font-bold text-on-surface">{title}</h3>
                <p className="text-xs text-slate-400 mt-1">{items.length} loan{items.length === 1 ? '' : 's'}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${accent}`}>{title === 'Money Given' ? 'Owed to us' : 'We owe'}</span>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Icons.Wallet size={40} className="mx-auto opacity-20 mb-2" />
                <p className="text-sm">No matching loans</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map(loan => {
                  const acc = accounts.find(a => a.id === loan.bankAccountId);
                  const isSettled = loan.status === 'SETTLED';
                  const isPartialOpen = settlingLoanId === loan.id;
                  return (
                    <li key={loan.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className={`font-headline font-bold text-sm truncate ${isSettled ? 'text-slate-400 line-through' : 'text-on-surface'}`}>{loan.counterparty}</p>
                        <p className={`text-xs mt-1 ${isSettled ? 'text-slate-300 line-through' : 'text-slate-400'}`}>
                          {new Date(loan.date).toLocaleDateString()}
                          {loan.dueDate ? ` · due ${new Date(loan.dueDate).toLocaleDateString()}` : ''}
                          {acc ? ` · ${acc.bankName}` : ''}
                        </p>
                        {loan.notes && <p className={`text-xs mt-1 truncate ${isSettled ? 'text-slate-300 line-through' : 'text-slate-500'}`}>{loan.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className={`font-headline font-bold text-sm ${isSettled ? 'text-slate-400 line-through' : 'text-on-surface'}`}>
                          {Number(loan.amount).toLocaleString()} ETB
                        </p>
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400">
                            <Icons.CheckCircle size={12} /> Settled
                          </span>
                        ) : isPartialOpen ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              autoFocus
                              value={settleAmount}
                              onChange={(e) => setSettleAmount(e.target.value)}
                              placeholder={`Max ${Number(loan.amount).toLocaleString()}`}
                              className="w-32 bg-slate-50 border-none rounded-lg px-3 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <button
                              onClick={() => {
                                const a = Number(settleAmount);
                                if (!a || a <= 0 || a > Number(loan.amount)) return;
                                onSettleLoan(loan, a);
                                setSettlingLoanId(null);
                                setSettleAmount('');
                              }}
                              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => { setSettlingLoanId(null); setSettleAmount(''); }}
                              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                              aria-label="Cancel"
                            >
                              <Icons.Close size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSettlingLoanId(loan.id); setSettleAmount(''); }}
                              className="px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-50 transition-colors"
                            >
                              Partial
                            </button>
                            <AsyncButton
                              onClick={async () => { await onSettleLoan(loan); }}
                              loadingLabel="Settling…"
                              successLabel="Settled"
                              icon={<Icons.CheckCircle size={12} />}
                              className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 shadow-sm"
                            >
                              Mark Settled
                            </AsyncButton>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );

        const ItemSection = () => (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 lg:p-8 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-headline font-bold text-on-surface">Items Lent Out</h3>
                <p className="text-xs text-slate-400 mt-1">{itemLoans.length} item{itemLoans.length === 1 ? '' : 's'}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">Owed to us</span>
            </div>
            {itemLoans.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Icons.LendPhone size={40} className="mx-auto opacity-20 mb-2" />
                <p className="text-sm">No matching item loans</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {itemLoans.map(item => {
                  const isReturned = item.status === 'SOLD_BY_RECIPIENT';
                  const isSettling = settlingItemId === item.id;
                  return (
                    <li key={item.id} className="py-4 flex flex-col gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className={`font-headline font-bold text-sm truncate ${isReturned ? 'text-slate-400 line-through' : 'text-on-surface'}`}>{item.name}</p>
                          <p className={`text-xs mt-1 ${isReturned ? 'text-slate-300 line-through' : 'text-slate-400'}`}>
                            {item.lentTo ? `to ${item.lentTo}` : 'Lent out'}
                            {item.imei ? ` · IMEI ${item.imei}` : ''}
                            {item.expectedReturnDate ? ` · due ${new Date(item.expectedReturnDate).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <p className={`font-headline font-bold text-sm ${isReturned ? 'text-slate-400 line-through' : 'text-on-surface'}`}>
                            {Number(item.valuation || 0).toLocaleString()} ETB
                          </p>
                          {isReturned ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400">
                              <Icons.CheckCircle size={12} /> Settled
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              {onReturnItem && (
                                <AsyncButton
                                  onClick={async () => { await onReturnItem(item); }}
                                  loadingLabel="Returning…"
                                  successLabel="Returned"
                                  icon={<Icons.CheckCircle size={12} />}
                                  className="px-3 py-1.5 rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-amber-700 shadow-sm"
                                >
                                  Mark Returned
                                </AsyncButton>
                              )}
                              {onSettleItem && (
                                <button
                                  onClick={() => {
                                    setSettlingItemId(item.id);
                                    setItemSettleAmount(String(item.valuation || 0));
                                    setItemSettleAccount('');
                                  }}
                                  className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 shadow-sm"
                                >
                                  Settle with Cash
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSettling && onSettleItem && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                          <p className="text-xs font-bold text-emerald-900">Confirm cash settlement for {item.name}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest block mb-1">Amount Received (ETB)</label>
                              <input
                                type="number"
                                autoFocus
                                value={itemSettleAmount}
                                onChange={e => setItemSettleAmount(e.target.value)}
                                placeholder={String(item.valuation || 0)}
                                className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-emerald-500/20"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest block mb-1">Deposit to Account</label>
                              <select
                                value={itemSettleAccount}
                                onChange={e => setItemSettleAccount(e.target.value)}
                                className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-emerald-500/20"
                              >
                                <option value="">— None (cash on hand) —</option>
                                {accounts.filter(a => a.type === 'STORE' || !a.type).length > 0 && (
                                  <optgroup label="Store Accounts">
                                    {accounts.filter(a => a.type === 'STORE' || !a.type).map(a => (
                                      <option key={a.id} value={a.id}>{a.bankName}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {accounts.filter(a => a.type === 'EMPLOYEE').length > 0 && (
                                  <optgroup label="Staff Accounts">
                                    {accounts.filter(a => a.type === 'EMPLOYEE').map(a => (
                                      <option key={a.id} value={a.id}>{a.bankName} · {ownerName(a.ownerId)}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setSettlingItemId(null); setItemSettleAmount(''); setItemSettleAccount(''); }}
                              className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                const a = Number(itemSettleAmount) || Number(item.valuation || 0);
                                onSettleItem(item, a, itemSettleAccount || undefined);
                                setSettlingItemId(null);
                                setItemSettleAmount('');
                                setItemSettleAccount('');
                              }}
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors"
                            >
                              Confirm Settlement
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6">
                <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">Cash Given · Outstanding</p>
                <p className="font-headline font-bold text-3xl text-emerald-800 mt-2">{totalGivenOutstanding.toLocaleString()} <span className="text-sm opacity-60">ETB</span></p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
                <p className="text-[10px] uppercase font-bold tracking-widest text-amber-700">Cash Received · Outstanding</p>
                <p className="font-headline font-bold text-3xl text-amber-800 mt-2">{totalReceivedOutstanding.toLocaleString()} <span className="text-sm opacity-60">ETB</span></p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6">
                <p className="text-[10px] uppercase font-bold tracking-widest text-blue-700">Items Lent · Outstanding</p>
                <p className="font-headline font-bold text-3xl text-blue-800 mt-2">{totalItemsOutstanding.toLocaleString()} <span className="text-sm opacity-60">ETB</span></p>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Icons.Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={loanSearch}
                  onChange={e => setLoanSearch(e.target.value)}
                  placeholder="Search by counterparty, item, IMEI or notes…"
                  className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-xs font-bold text-on-surface focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(['ALL', 'CASH', 'ITEM', 'OUTSTANDING', 'SETTLED'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setLoanFilter(f)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 ${
                      loanFilter === f ? 'bg-primary text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {showCash && <CashSection title="Money Given" items={cashGiven} accent="bg-emerald-100 text-emerald-700" />}
              {showCash && <CashSection title="Money Received" items={cashReceived} accent="bg-amber-100 text-amber-700" />}
              {showItems && <ItemSection />}
            </div>
          </div>
        );
      })()}

      {/* Add Bank Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[480px] bg-white rounded-[2.5rem] z-[210] p-6 sm:p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-headline font-bold text-on-surface">Add Bank Account</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Context: {newBank.type === 'STORE' ? 'Company Repository' : `Employee (${users.find(u => u.id === newBank.ownerId)?.displayName || 'Unknown'})`}
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <Icons.Close size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Bank Name</label>
                  <input 
                    type="text" 
                    value={newBank.bankName}
                    onChange={e => setNewBank({...newBank, bankName: e.target.value})}
                    placeholder="e.g. CBE, Dashen..."
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Account Number</label>
                  <input 
                    type="text" 
                    value={newBank.accountNumber}
                    onChange={e => setNewBank({...newBank, accountNumber: e.target.value})}
                    placeholder="Account Number"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Initial Balance</label>
                  <input 
                    type="number" 
                    value={newBank.balance}
                    onChange={e => setNewBank({...newBank, balance: Number(e.target.value)})}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Theme Color</label>
                  <div className="flex gap-3">
                    {colors.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setNewBank({...newBank, color: c.value})}
                        style={{ backgroundColor: c.value }}
                        className={`w-10 h-10 rounded-full transition-transform ${newBank.color === c.value ? 'scale-125 ring-2 ring-slate-200 ring-offset-2' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="h-4" />

                <AsyncButton
                  disabled={newBank.type === 'EMPLOYEE' && !newBank.ownerId}
                  onClick={async () => {
                    await onAddAccount(newBank);
                    setShowAddModal(false);
                  }}
                  loadingLabel="Creating…"
                  successLabel="Created"
                  className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-headline font-bold text-lg hover:opacity-90 active:scale-95 shadow-xl shadow-primary/20"
                >
                  Confirm & Create
                </AsyncButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Loan Modal */}
      <AnimatePresence>
        {showLoanModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoanModal(false)}
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[480px] bg-white rounded-[2.5rem] z-[210] p-6 sm:p-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-headline font-bold text-on-surface">Record a Loan</h3>
                  <p className="text-xs text-slate-400 mt-1">Track money given to or received from a counterparty.</p>
                </div>
                <button onClick={() => setShowLoanModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <Icons.Close size={24} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['GIVEN','RECEIVED'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewLoan({ ...newLoan, type: t })}
                        className={`py-3 rounded-2xl text-xs font-bold transition-all ${
                          newLoan.type === t ? 'bg-primary text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {t === 'GIVEN' ? 'I Gave a Loan' : 'I Received a Loan'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Counterparty</label>
                  <input
                    type="text"
                    list="loan-counterparty-suggestions"
                    value={newLoan.counterparty || ''}
                    onChange={e => setNewLoan({ ...newLoan, counterparty: e.target.value })}
                    placeholder="Name of person or business"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  />
                  <datalist id="loan-counterparty-suggestions">
                    {Array.from(new Set([
                      ...loans.map(l => l.counterparty).filter(Boolean),
                      ...trustContacts,
                    ])).map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Amount (ETB)</label>
                  <input
                    type="number"
                    value={newLoan.amount || 0}
                    onChange={e => setNewLoan({ ...newLoan, amount: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Bank Account</label>
                  <select
                    value={newLoan.bankAccountId || ''}
                    onChange={e => setNewLoan({ ...newLoan, bankAccountId: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  >
                    <option value="">— None / Cash —</option>
                    {(() => {
                      const storeAccounts    = accounts.filter(a => a.type === 'STORE' || !a.type);
                      const employeeAccounts = accounts.filter(a => a.type === 'EMPLOYEE');
                      const ownerName = (uid?: string) => users.find(u => u.id === uid || u.uid === uid)?.displayName || 'Staff';
                      return (
                        <>
                          {storeAccounts.length > 0 && (
                            <optgroup label="Store Accounts">
                              {storeAccounts.map(a => (
                                <option key={a.id} value={a.id}>{a.bankName} · {a.accountNumber}</option>
                              ))}
                            </optgroup>
                          )}
                          {employeeAccounts.length > 0 && (
                            <optgroup label="Staff Accounts">
                              {employeeAccounts.map(a => (
                                <option key={a.id} value={a.id}>{ownerName(a.ownerId)} — {a.bankName} · {a.accountNumber}</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Due Date (optional)</label>
                  <input
                    type="date"
                    value={newLoan.dueDate || ''}
                    onChange={e => setNewLoan({ ...newLoan, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Notes (optional)</label>
                  <textarea
                    value={newLoan.notes || ''}
                    onChange={e => setNewLoan({ ...newLoan, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/5"
                  />
                </div>

                <AsyncButton
                  disabled={!newLoan.counterparty || !newLoan.amount}
                  onClick={async () => {
                    await onAddLoan(newLoan);
                    setShowLoanModal(false);
                  }}
                  loadingLabel="Recording…"
                  successLabel="Recorded"
                  className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-headline font-bold text-lg hover:opacity-90 active:scale-95 shadow-xl shadow-primary/20"
                >
                  Record Loan
                </AsyncButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
