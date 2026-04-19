import React, { useState, useMemo } from 'react';
import { Icons, BankAccount, BankTransaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface BankScreenProps {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  onAddAccount: (acc: Partial<BankAccount>) => void;
  onOpenSidebar: () => void;
  users: any[];
}

export const BankScreen: React.FC<BankScreenProps> = ({ accounts, transactions, onAddAccount, onOpenSidebar, users }) => {
  const [activeTab, setActiveTab] = useState('Banks');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hiddenBalances, setHiddenBalances] = useState<Set<string>>(new Set());
  const [newBank, setNewBank] = useState({ 
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
      if (!selectedEmployeeId) return [];
      return accounts.filter(acc => acc.type === 'EMPLOYEE' && acc.ownerId === selectedEmployeeId);
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
            {['Banks', 'Others', 'Report'].map(tab => (
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
            <span>Add Bank</span>
          </button>
        </div>
      </header>

      {/* Cards Scroll */}
      <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-8 no-scrollbar -mx-4 px-4 h-[300px] items-center">
        {/* Empty Placeholder Card like in screenshot */}
        <div className="min-w-[280px] sm:min-w-[420px] h-[260px] bg-slate-100/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center pointer-events-none grayscale shrink-0">
        </div>
        
        {filteredAccounts.map((acc) => {
          const isHidden = hiddenBalances.has(acc.id);
          return (
            <div 
              key={acc.id}
              style={{ backgroundColor: acc.color }}
              className="min-w-[280px] sm:min-w-[420px] h-[260px] rounded-[2.5rem] p-8 text-white relative shadow-2xl shadow-black/20 flex flex-col justify-between group overflow-hidden shrink-0"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start relative z-10">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-md flex items-center justify-center">
                      <Icons.Vault size={28} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-headline font-bold leading-tight">{acc.bankName}</h3>
                      <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Premium Account</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 opacity-60">
                    <div className="flex flex-col gap-0.5">
                       <div className="w-4 h-[1px] bg-white opacity-40"></div>
                       <div className="w-4 h-[1px] bg-white opacity-60"></div>
                       <div className="w-4 h-[1px] bg-white"></div>
                    </div>
                    <Icons.Network size={20} />
                 </div>
              </div>

              {/* Card Center - Chip and Number */}
              <div className="relative z-10">
                <div className="w-12 h-9 bg-yellow-400/80 rounded-md mb-6 relative overflow-hidden border border-white/20 shadow-inner">
                   <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                      {[...Array(9)].map((_, i) => <div key={i} className="border border-black" />)}
                   </div>
                </div>
                <p className="text-2xl font-mono tracking-[0.4em] sm:tracking-[0.5em] mb-4 opacity-90 truncate">
                  {isHidden ? "**** **** **** ****" : "**** **** **** " + acc.accountNumber.slice(-4)}
                </p>
              </div>

              {/* Card Footer */}
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold opacity-70 tracking-widest">Total Deposited</span>
                    <button 
                      onClick={() => toggleHide(acc.id)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {isHidden ? <Icons.Info size={14} /> : <Icons.Search size={14} className="rotate-45" />}
                    </button>
                  </div>
                  <p className="text-xl font-headline font-bold">
                    {isHidden ? "••••••" : acc.balance.toLocaleString()} 
                    <span className="text-xs opacity-60 ml-1">{acc.currency || 'ETB'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <button className="text-[10px] uppercase font-bold opacity-70 tracking-widest hover:opacity-100 transition-opacity">
                    Add number
                  </button>
                </div>
              </div>

              {/* Decorative Waves */}
              <div className="absolute right-0 bottom-0 pointer-events-none opacity-20">
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
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
             <p className="text-sm font-medium opacity-60">
               {activeTab === 'Others' && !selectedEmployeeId ? 'Select an employee' : 'No accounts found'}
             </p>
          </div>
        )}
      </div>

      {/* Employee List Pills - Screenshot match */}
      {activeTab === 'Others' && (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 mb-8 -mx-4 px-4">
           {users.map((emp) => {
             const initials = emp.displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??';
             const isSelected = selectedEmployeeId === emp.id;
             return (
               <button
                 key={emp.id}
                 onClick={() => setSelectedEmployeeId(emp.id)}
                 className={`flex items-center gap-3 px-1 py-1 pr-6 rounded-full border transition-all shrink-0 ${
                   isSelected 
                     ? 'bg-white border-[#0D1C32]/10 shadow-lg text-[#0D1C32]' 
                     : 'bg-white/50 border-slate-100 text-slate-500 hover:bg-white'
                 }`}
               >
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                   isSelected ? 'bg-[#0D1C32] text-white border-[#0D1C32]' : 'bg-slate-100 border-slate-200'
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
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#0D1C32]/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Account Number</label>
                  <input 
                    type="text" 
                    value={newBank.accountNumber}
                    onChange={e => setNewBank({...newBank, accountNumber: e.target.value})}
                    placeholder="Account Number"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#0D1C32]/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 block">Initial Balance</label>
                  <input 
                    type="number" 
                    value={newBank.balance}
                    onChange={e => setNewBank({...newBank, balance: Number(e.target.value)})}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#0D1C32]/5"
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

                <button 
                  disabled={newBank.type === 'EMPLOYEE' && !newBank.ownerId}
                  onClick={() => {
                    onAddAccount(newBank);
                    setShowAddModal(false);
                  }}
                  className={`w-full bg-[#0D1C32] text-white py-5 rounded-[1.5rem] font-headline font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#0D1C32]/20 ${
                    (newBank.type === 'EMPLOYEE' && !newBank.ownerId) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Confirm & Create
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
