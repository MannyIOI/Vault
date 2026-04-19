'use client';

import * as React from 'react';
import { useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { Icons } from '../types';

interface StoreDropdownProps {
  value: string;
  onChange: (value: string) => void;
  stores: string[];
  favorites: string[];
  onToggleFavorite: (store: string) => void;
  onCreateStore?: (name: string) => void;
}

export const StoreDropdown = ({ value, onChange, stores, favorites, onToggleFavorite, onCreateStore }: StoreDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredStores = stores.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border-none rounded-xl py-4 px-4 font-headline font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all text-left flex justify-between items-center"
      >
        {value || 'Select a Contact...'}
        <ChevronDown size={20} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white rounded-xl shadow-2xl z-50 mt-2 p-2 border border-slate-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl py-2 px-4 mb-2 focus:ring-2 focus:ring-primary/10 transition-all"
            placeholder="Search stores..."
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {filteredStores.map(store => (
              <div key={store} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <button onClick={() => { onChange(store); setIsOpen(false); }} className="flex-grow text-left font-medium text-slate-700">
                  {store}
                </button>
                <button onClick={() => onToggleFavorite(store)} className="p-1 hover:bg-white rounded-full transition-colors">
                  <Star size={16} className={favorites.includes(store) ? 'text-amber-400 fill-current' : 'text-slate-300'} />
                </button>
              </div>
            ))}
            {filteredStores.length === 0 && search && onCreateStore && (
              <button 
                onClick={() => {
                  onCreateStore(search);
                  onChange(search);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 p-3 text-primary font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors border-t border-slate-50 mt-2"
              >
                <Icons.Plus size={16} /> Create "{search}"
              </button>
            )}
            {filteredStores.length === 0 && !search && (
              <div className="p-4 text-center text-slate-400 text-xs italic">
                No stores found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
