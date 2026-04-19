'use client';

import React from 'react';
import { Icons, Screen } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentScreen: Screen;
  setScreen: (s: Screen) => void;
  user: any;
  userData?: any;
  orgName?: string;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, setScreen, user, userData, orgName, onLogout, isOpen, onClose }) => {
  const isAdmin = userData?.role === 'admin';
  const allMenuGroups = [
    {
      label: 'General',
      items: [
        { id: 'DASHBOARD', label: 'Dashboard', icon: Icons.Dashboard, adminOnly: false },
      ]
    },
    {
      label: 'Finance',
      items: [
        { id: 'BANK', label: 'Bank', icon: Icons.Bank, adminOnly: false },
        { id: 'LOANS', label: 'Loans', icon: Icons.Wallet, adminOnly: true },
      ]
    },
    {
      label: 'Sales',
      items: [
        { id: 'SALES', label: 'Sales', icon: Icons.Sales, adminOnly: false },
        { id: 'LEND', label: 'Lend Item', icon: Icons.LendPhone, adminOnly: false },
        { id: 'SALES_MANAGER', label: 'All Transactions', icon: Icons.Ledger, adminOnly: true },
      ]
    },
    {
      label: 'Management',
      items: [
        { id: 'ITEMS', label: 'Items', icon: Icons.Items, adminOnly: false },
        { id: 'WAREHOUSE', label: 'Storage', icon: Icons.Vault, adminOnly: true },
        { id: 'EMPLOYEE', label: 'Staff', icon: Icons.Employee, adminOnly: true },
      ]
    },
    {
      label: 'Configuration',
      items: [
        { id: 'ROLE_HIERARCHY', label: 'Permissions', icon: Icons.Hierarchy, adminOnly: true },
      ]
    }
  ];
  const menuGroups = allMenuGroups
    .map(g => ({ ...g, items: g.items.filter(i => isAdmin || !i.adminOnly) }))
    .filter(g => g.items.length > 0);

  const SidebarContent = (
    <div className="w-64 h-full bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Icons.Vault size={24} />
          </div>
          <div>
            <h1 className="font-headline font-bold text-sm text-on-surface truncate max-w-[140px]">{orgName || userData?.displayName || 'Workspace'}</h1>
            <p className="text-[10px] text-slate-400 font-medium">Work Portal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <Icons.Close size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-8 no-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setScreen(item.id as Screen);
                      if (onClose) onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-slate-100 text-primary font-bold' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-primary' : 'text-slate-400'} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
        <button className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-primary transition-colors w-full">
          <Icons.Info size={18} />
          <span className="text-sm">Support</span>
        </button>
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group cursor-pointer hover:bg-slate-100 transition-all mt-2 overflow-hidden">
          <div className="flex items-center gap-3 truncate">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {user?.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="truncate text-left">
              <p className="text-xs font-bold text-on-surface truncate">{user?.displayName || 'Bereket Yohannes'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'bereketus12@gmail.com'}</p>
            </div>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors p-1">
            <Icons.LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen bg-white border-r border-slate-200 flex-col fixed left-0 top-0 z-[100]">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 bg-black/50 z-[110] backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-[120] shadow-2xl"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
