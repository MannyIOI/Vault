'use client';

import React, { useMemo, useState } from 'react';
import { Icons, Transaction } from '../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface ExecutiveDashboardProps {
  transactions: Transaction[];
  onOpenSidebar: () => void;
  onActionClick?: (s: any) => void;
  onSearchClick?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ transactions, onOpenSidebar, onActionClick, onSearchClick }) => {
  const [activeChartTab, setActiveChartTab] = useState<'Expense' | 'Revenue' | 'Profit'>('Revenue');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return d.toLocaleString('default', { month: 'short' });
    });

    const dataMap = months.reduce((acc, m) => {
      acc[m] = { revenue: 0, cost: 0 };
      return acc;
    }, {} as Record<string, { revenue: number, cost: number }>);

    transactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const m = date.toLocaleString('default', { month: 'short' });
      if (dataMap[m]) {
        if (tx.type === 'SALE') {
          dataMap[m].revenue += tx.amount;
        } else if (tx.type === 'EXPENSE' || tx.type === 'PURCHASE') {
          dataMap[m].cost += Math.abs(tx.amount);
        }
      }
    });

    return months.map(m => ({
      name: m,
      revenue: dataMap[m].revenue,
      expense: dataMap[m].cost,
      profit: dataMap[m].revenue - dataMap[m].cost
    }));
  }, [transactions]);

  const metrics = useMemo(() => {
    const sales     = transactions.filter(t => t.type === 'SALE');
    const expenses  = transactions.filter(t => t.type === 'EXPENSE');
    const purchases = transactions.filter(t => t.type === 'PURCHASE');

    const totalRev   = sales.reduce((a, t) => a + t.amount, 0);
    const totalExp   = expenses.reduce((a, t) => a + Math.abs(t.amount), 0);
    const totalCogs  = purchases.reduce((a, t) => a + Math.abs(t.amount), 0);
    const totalCost  = totalExp + totalCogs;
    const profit     = totalRev - totalCost;
    const margin     = totalRev > 0 ? (profit / totalRev) * 100 : 0;
    const avgSale    = sales.length > 0 ? totalRev / sales.length : 0;

    const now      = Date.now();
    const day      = 24 * 60 * 60 * 1000;
    const cutoff30 = now - 30 * day;
    const cutoff60 = now - 60 * day;
    const within = (t: Transaction, from: number, to = Infinity) => {
      const ts = new Date(t.timestamp).getTime();
      return ts >= from && ts < to;
    };
    const recent      = transactions.filter(t => within(t, cutoff30));
    const recentRev   = recent.filter(t => t.type === 'SALE').reduce((a, t) => a + t.amount, 0);
    const recentCost  = recent.filter(t => t.type === 'EXPENSE' || t.type === 'PURCHASE').reduce((a, t) => a + Math.abs(t.amount), 0);
    const prevRev     = transactions.filter(t => t.type === 'SALE' && within(t, cutoff60, cutoff30)).reduce((a, t) => a + t.amount, 0);
    const prevCost    = transactions.filter(t => (t.type === 'EXPENSE' || t.type === 'PURCHASE') && within(t, cutoff60, cutoff30)).reduce((a, t) => a + Math.abs(t.amount), 0);
    const prevProfit  = prevRev - prevCost;
    const recentProfit = recentRev - recentCost;
    const growth = prevProfit !== 0
      ? ((recentProfit - prevProfit) / Math.abs(prevProfit)) * 100
      : (recentProfit > 0 ? 100 : 0);

    return {
      mrr: totalRev,
      mrc: totalCost,
      profit,
      margin: margin.toFixed(1),
      recentRev,
      recentCost,
      cogs: totalCogs,
      expenses: totalExp,
      avgSale: Math.round(avgSale),
      growth: growth.toFixed(1),
      salesCount: sales.length,
    };
  }, [transactions]);

  return (
    <div className="flex-1 bg-[#F7F9FB] min-h-screen p-4 lg:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenSidebar}
            className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <Icons.Menu size={20} />
          </button>
          <div className="hidden lg:flex w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 items-center justify-center text-slate-400">
            <Icons.Dashboard size={20} />
          </div>
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Dashboard</h2>
            <p className="text-xs text-slate-400 font-medium">Watch store transactions</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* MRR Card */}
        <div className={`bg-[#1A1D23] p-6 rounded-[2rem] text-white relative overflow-hidden group transition-all duration-500 ${expandedMetric === 'MRR' ? 'md:col-span-3 h-auto' : ''}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium opacity-80">Monthly Sales</span>
                <Icons.Info size={14} className="opacity-40" />
              </div>
              <button 
                onClick={() => setExpandedMetric(expandedMetric === 'MRR' ? null : 'MRR')}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-[#1A1D23] transition-all"
              >
                {expandedMetric === 'MRR' ? <Icons.Close size={20} /> : <Icons.ArrowUpRight size={20} />}
              </button>
            </div>
            
            <div className="flex items-baseline gap-2 mb-6">
              <Icons.TrendingUp className="text-emerald-400" size={24} />
              <h3 className="text-4xl font-headline font-bold tracking-tight">
                {metrics.mrr.toLocaleString()} <span className="text-xl opacity-60">ETB</span>
              </h3>
            </div>

            {expandedMetric === 'MRR' && (
              <div className="mt-8 pt-8 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Sales</p>
                    <p className="text-lg font-bold">{metrics.mrr.toLocaleString()} ETB</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Last 30 Days</p>
                    <p className="text-lg font-bold text-emerald-400">{metrics.recentRev.toLocaleString()} ETB</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Transactions</p>
                    <p className="text-lg font-bold text-blue-400">{metrics.salesCount.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Average Sale</p>
                    <p className="text-lg font-bold">{metrics.avgSale.toLocaleString()} ETB</p>
                  </div>
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold">
              <span className="text-emerald-400">{metrics.recentRev.toLocaleString()} ETB ▲</span>
              <span className="text-white/60">New Sales (30d)</span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mb-16" />
        </div>

        {/* MRC Card */}
        <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group transition-all duration-500 ${expandedMetric === 'MRC' ? 'md:col-span-3 h-auto' : ''}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Monthly Expenses</span>
                <Icons.Info size={14} className="text-slate-300" />
              </div>
              <button 
                onClick={() => setExpandedMetric(expandedMetric === 'MRC' ? null : 'MRC')}
                className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center group-hover:bg-[#1A1D23] group-hover:text-white group-hover:border-[#1A1D23] transition-all"
              >
                {expandedMetric === 'MRC' ? <Icons.Close size={20} /> : <Icons.ArrowUpRight size={20} />}
              </button>
            </div>
            
            <div className="flex items-baseline gap-2 mb-6">
              <Icons.TrendingDown className="text-amber-500" size={24} />
              <h3 className="text-4xl font-headline font-bold tracking-tight text-[#1A1D23]">
                {metrics.mrc.toLocaleString()} <span className="text-xl text-slate-400">ETB</span>
              </h3>
            </div>

            {expandedMetric === 'MRC' && (
              <div className="mt-8 pt-8 border-t border-slate-50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-[#1A1D23]">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Cost of Goods</p>
                    <p className="text-lg font-bold">{metrics.cogs.toLocaleString()} ETB</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Expenses</p>
                    <p className="text-lg font-bold">{metrics.expenses.toLocaleString()} ETB</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Last 30 Days</p>
                    <p className="text-lg font-bold">{metrics.recentCost.toLocaleString()} ETB</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Cost</p>
                    <p className="text-lg font-bold">{metrics.mrc.toLocaleString()} ETB</p>
                  </div>
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold">
              <span className="text-amber-600">{metrics.recentCost.toLocaleString()} ETB ▲</span>
              <span className="text-amber-600/60">New Expenses (30d)</span>
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className={`bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group transition-all duration-500 ${expandedMetric === 'PROFIT' ? 'md:col-span-3 h-auto' : ''}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Net Profit</span>
                <Icons.Info size={14} className="text-slate-300" />
              </div>
              <button 
                onClick={() => setExpandedMetric(expandedMetric === 'PROFIT' ? null : 'PROFIT')}
                className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center group-hover:bg-[#1A1D23] group-hover:text-white group-hover:border-[#1A1D23] transition-all"
              >
                {expandedMetric === 'PROFIT' ? <Icons.Close size={20} /> : <Icons.ArrowUpRight size={20} />}
              </button>
            </div>
            
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-2xl font-bold text-emerald-500">$</span>
              <h3 className="text-4xl font-headline font-bold tracking-tight text-[#1A1D23]">
                {metrics.profit.toLocaleString()} <span className="text-xl text-slate-400">ETB</span>
              </h3>
            </div>

            {expandedMetric === 'PROFIT' && (
              <div className="mt-8 pt-8 border-t border-slate-50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-[#1A1D23]">
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-600/60 tracking-widest mb-1">Profit before tax</p>
                    <p className="text-lg font-bold">{metrics.profit.toLocaleString()} ETB</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-600/60 tracking-widest mb-1">Margin</p>
                    <p className="text-lg font-bold">{metrics.margin}%</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-600/60 tracking-widest mb-1">Growth (30d)</p>
                    <p className="text-lg font-bold">{metrics.growth}%</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-emerald-600/60 tracking-widest mb-1">Average Sale</p>
                    <p className="text-lg font-bold">{metrics.avgSale.toLocaleString()} ETB</p>
                  </div>
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold">
              <span className="text-emerald-600">{metrics.margin}% ▲</span>
              <span className="text-emerald-600/60">Profit Margin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview Chart */}
      <div className="bg-white p-4 lg:p-8 rounded-[2rem] border border-slate-100 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Money Summary</h3>
            <p className="text-xs text-slate-400 font-medium">Total monthly expenses</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl overflow-x-auto no-scrollbar">
            {['Expense', 'Revenue', 'Profit'].map((tab: any) => (
              <button 
                key={tab}
                onClick={() => setActiveChartTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeChartTab === tab ? 'bg-white shadow-sm text-on-surface' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeChartTab === 'Revenue' ? '#10B981' : activeChartTab === 'Expense' ? '#EF4444' : '#6366F1'} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={activeChartTab === 'Revenue' ? '#10B981' : activeChartTab === 'Expense' ? '#EF4444' : '#6366F1'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey={activeChartTab.toLowerCase()} 
                stroke={activeChartTab === 'Revenue' ? '#10B981' : activeChartTab === 'Expense' ? '#EF4444' : '#6366F1'} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                dot={{ r: 4, fill: activeChartTab === 'Revenue' ? '#10B981' : activeChartTab === 'Expense' ? '#EF4444' : '#6366F1', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => onActionClick?.('SALE')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl shadow-xl shadow-primary/10 text-xs font-bold hover:opacity-90 transition-all active:scale-95"
          >
            <Icons.Plus size={16} />
            <span>New Sale</span>
          </button>
          <button 
            onClick={() => onActionClick?.('PURCHASE')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white px-6 py-3 rounded-xl border border-slate-100 shadow-sm text-xs font-bold hover:bg-slate-50 transition-all active:scale-95 text-primary"
          >
            <Icons.Package size={16} />
            <span>Log Purchase</span>
          </button>
        </div>
        <div className="flex-1 relative group w-full">
          <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search all sales or items..."
            onFocus={() => onSearchClick?.()}
            className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/5 transition-all shadow-sm outline-none cursor-pointer"
            readOnly
          />
        </div>
      </div>
    </div>
  );
};
