import React, { useState } from 'react';
import { Icons, Transaction, Warehouse } from '../types';

interface WarehouseScreenProps {
  setScreen: (s: any, warehouseId?: string) => void;
  warehouses: Warehouse[];
  onAddWarehouse: (w: Partial<Warehouse>) => void;
  onUpdateWarehouse: (id: string, w: Partial<Warehouse>) => void;
  onDeleteWarehouse: (id: string) => void;
  onOpenSidebar: () => void;
}

export const WarehouseScreen: React.FC<WarehouseScreenProps> = ({ 
  setScreen, 
  warehouses, 
  onAddWarehouse, 
  onUpdateWarehouse, 
  onDeleteWarehouse, 
  onOpenSidebar
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '' });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24 pb-32 px-4 italic-selection">
      <main className="max-w-4xl mx-auto space-y-12">
        <header className="flex items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={onOpenSidebar}
              className="lg:hidden w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"
            >
              <Icons.Menu size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                 <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">Warehouse Info</p>
              </div>
              <h2 className="text-4xl font-headline font-black text-[#0D1C32] tracking-tighter uppercase">Storage List</h2>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="hidden sm:flex items-center gap-2 bg-[#0D1C32] text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl hover:opacity-90 transition-all hover:scale-105 active:scale-95 group"
          >
            <Icons.Plus size={20} className="group-hover:rotate-90 transition-transform" />
            <span>Add Warehouse</span>
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map(w => (
            <div key={w.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-[#0D1C32]">
                  <Icons.Vault size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => onDeleteWarehouse(w.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                     <Icons.Close size={16} />
                   </button>
                </div>
              </div>
              <h3 className="text-xl font-headline font-bold text-on-surface mb-1">{w.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mb-6">
                <Icons.Search size={12} /> {w.location}
              </p>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Inventory</span>
                  <span className="font-headline font-bold text-[#0D1C32]">View Items</span>
                </div>
                <button 
                  onClick={() => setScreen('ITEMS', w.id)}
                  className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#0D1C32] hover:text-white transition-all"
                >
                  <Icons.ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))}
          {warehouses.length === 0 && (
            <div className="col-span-full py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <Icons.Vault size={48} className="opacity-10 mb-4" />
              <p className="font-medium">No warehouses added yet.</p>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-8">
          <div className="space-y-6">
            <h3 className="font-headline font-semibold text-lg px-2">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <button onClick={() => setScreen('SALE')} className="flex flex-col items-center gap-2 bg-[#0D1C32] text-white p-6 rounded-[2rem] hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-[#0D1C32]/10">
                <Icons.NewSale size={32} />
                <span className="font-label text-sm font-bold">New Sale</span>
              </button>
              <button onClick={() => setScreen('PURCHASE')} className="flex flex-col items-center gap-2 bg-white border border-slate-100 text-[#0D1C32] p-6 rounded-[2rem] hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                <Icons.LogPurchase size={32} />
                <span className="font-label text-sm font-bold">Log Purchase</span>
              </button>
              <button onClick={() => setScreen('DASHBOARD')} className="flex flex-col items-center gap-2 bg-slate-50 text-slate-400 p-6 rounded-[2rem] hover:bg-slate-100 transition-all active:scale-95">
                <Icons.Dashboard size={32} />
                <span className="font-label text-sm font-bold">Main Dashboard</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-headline font-bold mb-6 text-[#0D1C32]">Configure Warehouse</h3>
            <div className="space-y-6">
               <div>
                 <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Warehouse Name</label>
                 <input 
                   type="text" 
                   value={newWarehouse.name}
                   onChange={e => setNewWarehouse({...newWarehouse, name: e.target.value})}
                   className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#0D1C32]/10" 
                   placeholder="e.g. Merkato Distribution Center"
                 />
               </div>
               <div>
                 <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Location Address</label>
                 <input 
                   type="text" 
                   value={newWarehouse.location}
                   onChange={e => setNewWarehouse({...newWarehouse, location: e.target.value})}
                   className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#0D1C32]/10" 
                   placeholder="e.g. Merkato, Addis Ababa"
                 />
               </div>
               <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold">Cancel</button>
                  <button 
                    onClick={() => {
                      onAddWarehouse(newWarehouse);
                      setShowAddModal(false);
                      setNewWarehouse({ name: '', location: '' });
                    }}
                    className="flex-1 py-4 bg-[#0D1C32] text-white rounded-2xl font-bold shadow-lg shadow-[#0D1C32]/20"
                  >
                    Confirm Creation
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
