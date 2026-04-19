'use client';

import React, { useState } from 'react';
import { Icons } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeScreenProps {
  users: any[];
  onOpenSidebar: () => void;
  onUpdateRole: (uid: string, role: string, warehouseId?: string) => Promise<void>;
  warehouses: any[];
}

export const EmployeeScreen: React.FC<EmployeeScreenProps> = ({ users, onOpenSidebar, onUpdateRole, warehouses }) => {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isManagingRole, setIsManagingRole] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  const handleRoleUpdate = async () => {
    if (!selectedUser) return;
    await onUpdateRole(selectedUser.uid, newRole, newRole === 'warehouse_manager' ? selectedWarehouseId : undefined);
    setIsManagingRole(false);
    setSelectedUser(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24 pb-32 px-6">
      <main className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-6 w-full sm:w-auto">
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              <Icons.Menu size={24} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-tertiary-500 animate-pulse" />
                 <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase underline underline-offset-4 decoration-tertiary-200">System Directory</p>
              </div>
              <h2 className="text-3xl sm:text-4xl font-headline font-bold text-primary tracking-tighter">Organization Members</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
             <button 
               onClick={() => (window as any).setScreen('INVITE')}
               className="flex-1 sm:flex-none px-6 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/10 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               <Icons.Plus size={18} />
               <span>Invite Staff</span>
             </button>
             <div className="hidden md:block text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Staff Count</p>
                <p className="text-2xl font-headline font-bold text-primary">{users.length}</p>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {users.map((emp) => (
            <div key={emp.uid} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative group hover:shadow-2xl transition-all overflow-hidden hover:-translate-y-1">
               <div className="flex items-center gap-5 mb-8">
                <div className="relative">
                  {emp.photoURL ? (
                    <img src={emp.photoURL} alt={emp.displayName} className="w-20 h-20 rounded-3xl object-cover shadow-lg border-2 border-slate-50 relative z-10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg relative z-10">
                      {emp.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white z-20 shadow-sm ${emp.emailVerified ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  
                  {/* Avatar decorative glow */}
                  <div className="absolute inset-0 bg-tertiary-500/20 blur-2xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl text-on-surface line-clamp-1">{emp.displayName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Icons.Shield size={12} className="text-tertiary-500" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{emp.role === 'clerk' ? 'Sales' : (emp.role || 'Sales')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group/item hover:bg-white hover:shadow-inner transition-all border border-transparent hover:border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover/item:text-tertiary-500 transition-colors">
                    <Icons.Invite size={18} />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] uppercase font-bold text-slate-300 tracking-widest mb-0.5">Primary Contact</p>
                    <p className="text-sm font-bold text-on-surface truncate">{emp.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group/item hover:bg-white hover:shadow-inner transition-all border border-transparent hover:border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover/item:text-tertiary-500 transition-colors">
                    <Icons.Store size={18} />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] uppercase font-bold text-slate-300 tracking-widest mb-0.5">Work Store</p>
                    <p className="text-sm font-bold text-on-surface">{emp.branch || 'Main Store'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button 
                  onClick={() => setSelectedUser(emp)}
                  className="flex-1 py-4 bg-slate-50 text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-tertiary-50 hover:text-tertiary-600 transition-all border border-transparent hover:border-tertiary-100"
                >
                  Profile
                </button>
                <button 
                  onClick={() => {
                    setSelectedUser(emp);
                    setIsManagingRole(true);
                    setNewRole(emp.role || 'clerk');
                    setSelectedWarehouseId(emp.warehouseId || '');
                  }}
                  className="flex-1 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/10"
                >
                   Permissions
                </button>
              </div>

              {/* Decorative background element */}
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-all pointer-events-none translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 text-primary">
                <Icons.Security size={120} />
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200">
                <Icons.Employee size={48} />
              </div>
              <h3 className="text-2xl font-headline font-bold text-primary mb-2">No Staff Added</h3>
              <p className="text-slate-400 max-w-sm mx-auto mb-10 text-lg uppercase tracking-wider font-light">Join your colleagues to start working.</p>
              <button 
                onClick={() => (window as any).setScreen('INVITE')}
                className="px-10 py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-sm rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                Add Staff
              </button>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedUser && !isManagingRole && (
          <div className="fixed inset-0 bg-primary/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 relative overflow-hidden"
            >
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-primary rounded-2xl transition-all hover:rotate-90"
              >
                <Icons.Close size={24} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt="" className="w-32 h-32 rounded-[2.5rem] object-cover shadow-2xl border-4 border-white" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-32 h-32 rounded-[2.5rem] bg-primary flex items-center justify-center text-white text-5xl font-bold">
                      {selectedUser.displayName?.[0]}
                    </div>
                  )}
                  <div className={`absolute bottom-2 right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg ${selectedUser.emailVerified ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                
                <h3 className="text-3xl font-headline font-bold text-primary tracking-tighter mb-1">{selectedUser.displayName}</h3>
                <p className="text-tertiary-500 font-black uppercase tracking-[0.2em] text-xs mb-8">{selectedUser.role === 'clerk' ? 'Sales' : (selectedUser.role || 'Sales')}</p>

                <div className="w-full space-y-4">
                   <div className="p-6 bg-slate-50 rounded-3xl text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">User Email</p>
                      <p className="text-on-surface font-bold text-lg">{selectedUser.email}</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-3xl text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Assigned Store</p>
                      <p className="text-on-surface font-bold text-lg">{selectedUser.branch || 'Main Store'}</p>
                   </div>
                   <div className="p-6 bg-slate-50 rounded-3xl text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Staff Access</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Icons.Security size={16} className="text-tertiary-500" />
                        <p className="text-on-surface font-bold">{selectedUser.role === 'admin' ? 'Manager access' : 'Staff member access'}</p>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => setIsManagingRole(true)}
                  className="w-full mt-10 py-5 bg-primary text-white rounded-3xl font-black uppercase tracking-[0.1em] text-sm shadow-2xl hover:opacity-90 active:scale-95 transition-all"
                >
                  Change access permissions
                </button>
              </div>

              {/* Background accent */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-tertiary-500 to-tertiary-500" />
            </motion.div>
          </div>
        )}

        {isManagingRole && selectedUser && (
          <div className="fixed inset-0 bg-primary/80 backdrop-blur-xl z-[210] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl p-10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-headline font-bold text-on-surface">Staff Access</h3>
                <button onClick={() => setIsManagingRole(false)} className="text-slate-400 hover:text-primary">
                  <Icons.Close size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'admin', label: 'Manager', desc: 'Full access to money records and system settings.' },
                  { id: 'warehouse_manager', label: 'Warehouse Manager', desc: 'Manages one warehouse. Approves new items.' },
                  { id: 'clerk', label: 'Sales', desc: 'Basic access for adding items and sales.' }
                ].map(role => (
                  <button 
                    key={role.id}
                    onClick={() => setNewRole(role.id)}
                    className={`w-full text-left p-6 rounded-[2.5rem] border-2 transition-all group ${
                      newRole === role.id 
                        ? 'border-tertiary-500 bg-tertiary-50' 
                        : 'border-slate-50 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className={`font-black uppercase tracking-widest text-sm ${newRole === role.id ? 'text-tertiary-600' : 'text-slate-400'}`}>{role.label}</p>
                      {newRole === role.id && <Icons.CheckCircle className="text-tertiary-600" size={20} />}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{role.desc}</p>
                  </button>
                ))}
              </div>

              {newRole === 'warehouse_manager' && (
                <div className="mt-8 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Assign to Warehouse</label>
                  <select 
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-tertiary-500/10 font-bold"
                  >
                    <option value="">Select a warehouse...</option>
                    {warehouses.map(w => {
                      const isAssigned = users.find(u => u.warehouseId === w.id && u.uid !== selectedUser?.uid);
                      return (
                        <option key={w.id} value={w.id} disabled={!!isAssigned}>
                          {w.name} {isAssigned ? '(Assigned)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-slate-400 italic">One manager per warehouse only.</p>
                </div>
              )}

              <div className="mt-10 flex gap-3">
                 <button 
                  onClick={() => setIsManagingRole(false)}
                  className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-3xl font-bold uppercase text-xs tracking-widest hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRoleUpdate}
                  className="flex-[2] py-5 bg-tertiary-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-tertiary-600/20 hover:bg-tertiary-700 transition-all"
                >
                  Save Access
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
