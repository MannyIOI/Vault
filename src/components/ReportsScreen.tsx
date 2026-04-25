'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { Icons, Transaction, InventoryItem, Loan, Contact, BankAccount } from '../types';
import { motion, AnimatePresence } from 'motion/react';

type ReportType = 'sales' | 'stock' | 'pr' | 'balance';

const REPORT_LABELS: Record<ReportType, string> = {
  sales: 'Sales Report',
  stock: 'Stock Report',
  pr: 'P&R Report',
  balance: 'Balance Sheet',
};

interface ReportsScreenProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
  loans: Loan[];
  contacts: Contact[];
  bankAccounts: BankAccount[];
  orgName?: string;
  onOpenSidebar: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString();

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateTime = (d: Date) =>
  d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

// ---------- Report selector dropdown ----------

const ReportSelector: React.FC<{
  value: ReportType;
  onChange: (v: ReportType) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-slate-50 transition-colors min-w-[180px] justify-between"
      >
        <span>{REPORT_LABELS[value]}</span>
        <Icons.ArrowRight size={14} className="text-slate-400 rotate-90" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-100 shadow-xl py-2 z-30"
          >
            {(Object.keys(REPORT_LABELS) as ReportType[]).map(k => (
              <button
                key={k}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-on-surface hover:bg-slate-50"
              >
                <span>{REPORT_LABELS[k]}</span>
                {value === k && <Icons.CheckCircle size={16} className="text-emerald-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------- Hero banner (dark) ----------

const HeroBanner: React.FC<{
  label: string;
  primary: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ label, primary, subtitle, right }) => (
  <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
    <div>
      <p className="text-xs text-slate-300 font-medium mb-2">{label}</p>
      <h2 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight">{primary}</h2>
      {subtitle && <div className="text-xs text-slate-300 mt-2">{subtitle}</div>}
    </div>
    {right && <div className="flex items-center gap-2">{right}</div>}
  </div>
);

// ---------- Sales Report ----------

const SalesReport: React.FC<{ transactions: Transaction[]; bankAccounts: BankAccount[] }> = ({
  transactions,
}) => {
  // Default: current week (Sun..Sat)
  const today = startOfDay(new Date());
  const dayOfWeek = today.getDay();
  const initStart = addDays(today, -dayOfWeek);
  const initEnd = addDays(initStart, 6);
  const [range, setRange] = useState<{ start: Date; end: Date }>({
    start: initStart,
    end: initEnd,
  });

  const sales = useMemo(
    () => transactions.filter(t => t.type === 'SALE'),
    [transactions]
  );

  const inRange = useMemo(() => {
    const startMs = range.start.getTime();
    const endMs = addDays(range.end, 1).getTime();
    return sales.filter(t => {
      const ts = new Date(t.timestamp).getTime();
      return ts >= startMs && ts < endMs;
    });
  }, [sales, range]);

  const totalSales = inRange.reduce((a, t) => a + (t.amount || 0), 0);

  // Bar chart by weekday
  const chartData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets = dayNames.map(d => ({ name: d, revenue: 0, cost: 0 }));
    inRange.forEach(t => {
      const d = new Date(t.timestamp).getDay();
      buckets[d].revenue += t.amount || 0;
    });
    // Pull cost from same range purchases for visual contrast
    const startMs = range.start.getTime();
    const endMs = addDays(range.end, 1).getTime();
    transactions
      .filter(t => {
        const ts = new Date(t.timestamp).getTime();
        return (
          (t.type === 'PURCHASE' || t.type === 'EXPENSE') &&
          ts >= startMs &&
          ts < endMs
        );
      })
      .forEach(t => {
        const d = new Date(t.timestamp).getDay();
        buckets[d].cost -= Math.abs(t.amount || 0);
      });
    return buckets;
  }, [inRange, transactions, range]);

  // Category donut
  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    inRange.forEach(t => {
      const key = (t.item || 'Other').split(' ')[0] || 'Other';
      m.set(key, (m.get(key) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [inRange]);

  const totalItems = inRange.reduce((a) => a + 1, 0);
  const COLORS = ['#10b981', '#3b82f6', '#64748b', '#ef4444', '#a855f7', '#f59e0b'];

  const formatRangeLabel = `${fmtDate(range.start)} - ${fmtDate(range.end)}`;

  // simple range shifters
  const shift = (days: number) =>
    setRange(r => ({ start: addDays(r.start, days), end: addDays(r.end, days) }));

  return (
    <>
      <HeroBanner
        label="Total Sales"
        primary={`${fmt(totalSales)} ETB`}
        right={
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-xs">
            <button
              onClick={() => shift(-7)}
              className="hover:bg-white/10 rounded p-1"
              aria-label="previous range"
            >
              <Icons.ArrowRight size={14} className="rotate-180" />
            </button>
            <Icons.Calendar size={14} />
            <span className="font-medium">{formatRangeLabel}</span>
            <button
              onClick={() => shift(7)}
              className="hover:bg-white/10 rounded p-1"
              aria-label="next range"
            >
              <Icons.ArrowRight size={14} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm font-medium text-slate-500 mb-4">Sales Chart</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    `${(v / 1000).toFixed(0).replace('-', '-')}${v !== 0 ? ',000' : ''} ETB`
                  }
                  width={90}
                />
                <Tooltip
                  formatter={(v: number) => `${fmt(v)} ETB`}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 6, 6]} />
                <Bar dataKey="cost" fill="#06b6d4" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Category</p>
            <Icons.Info size={16} className="text-slate-300" />
          </div>
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-headline font-bold text-on-surface">{totalItems}</p>
              <p className="text-xs text-slate-400 mt-1">Total Items</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-medium">
                <th className="text-left py-3 px-4 w-10">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Item</th>
                <th className="text-left py-3 px-4">Attributes</th>
                <th className="text-left py-3 px-4">Sold At</th>
                <th className="text-right py-3 px-4">Qty</th>
                <th className="text-right py-3 px-4">Price Sold</th>
              </tr>
            </thead>
            <tbody>
              {inRange.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    No sales in this date range.
                  </td>
                </tr>
              )}
              {inRange.map(t => {
                const customer = t.location || 'Walk in';
                const initials = customer
                  .split(' ')
                  .map(s => s[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr key={t.id} className="border-t border-slate-50 hover:bg-slate-50/40">
                    <td className="py-4 px-4">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{customer}</p>
                          <p className="text-xs text-slate-400">No invoice</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-on-surface">{t.item}</p>
                      <p className="text-xs text-slate-400">{(t.item || '').split(' ')[0]}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                        -
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      {fmtDateTime(new Date(t.timestamp))}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-700">1.00</td>
                    <td className="py-4 px-4 text-right font-medium text-on-surface">
                      {fmt(t.amount || 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ---------- Stock Report ----------

const StockReport: React.FC<{ inventory: InventoryItem[] }> = ({ inventory }) => {
  const inStock = useMemo(
    () => inventory.filter(i => i.status === 'IN_STOCK'),
    [inventory]
  );
  const totalValue = inStock.reduce((a, i) => a + (i.valuation || 0), 0);
  const totalPcs = inStock.length;

  const groups = useMemo(() => {
    const m = new Map<string, InventoryItem[]>();
    inStock.forEach(i => {
      const cat = i.category || 'Other';
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat)!.push(i);
    });
    return Array.from(m.entries()).map(([name, items]) => ({
      name,
      items,
      pcs: items.length,
      amount: items.reduce((a, i) => a + (i.valuation || 0), 0),
    }));
  }, [inStock]);

  const totalCategories = groups.length;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const allCollapsed = groups.length > 0 && groups.every(g => collapsed[g.name]);
  const toggleAll = () => {
    if (allCollapsed) setCollapsed({});
    else {
      const next: Record<string, boolean> = {};
      groups.forEach(g => (next[g.name] = true));
      setCollapsed(next);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Category', 'Name', 'Serial', 'Pcs', 'Amount'],
      ...inStock.map(i => [
        i.category || '',
        i.name || '',
        i.imei || '',
        '1',
        String(i.valuation || 0),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <HeroBanner
        label="Total Stock Value"
        primary={`${fmt(totalValue)} ETB`}
        subtitle={`${fmt(totalPcs)} pcs · ${totalCategories} sections · ${fmtInt(totalPcs)} items`}
        right={
          <>
            <button
              onClick={toggleAll}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2 rounded-lg"
            >
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
            <button
              onClick={exportCsv}
              className="bg-white text-on-surface text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100"
            >
              <Icons.Receipt size={14} /> Export Excel
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative">
          <p className="text-sm text-slate-500 font-medium mb-3">Total Pcs</p>
          <div className="flex items-center gap-3">
            <Icons.Network size={28} className="text-slate-700" />
            <p className="text-3xl font-headline font-bold text-on-surface">{fmt(totalPcs)}</p>
          </div>
          <span className="absolute top-6 right-6 w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
            <Icons.ArrowUpRight size={16} />
          </span>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
              <Icons.TrendingUp size={10} /> +0
            </span>
            <span className="text-xs text-slate-400 ml-2">vs last snapshot</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative">
          <p className="text-sm text-slate-500 font-medium mb-3">Total Categories</p>
          <div className="flex items-center gap-3">
            <Icons.Package size={28} className="text-slate-700" />
            <p className="text-3xl font-headline font-bold text-on-surface">{totalCategories}</p>
          </div>
          <span className="absolute top-6 right-6 w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
            <Icons.ArrowUpRight size={16} />
          </span>
          <div className="mt-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
              <Icons.TrendingUp size={10} /> +0
            </span>
            <span className="text-xs text-slate-400 ml-2">vs last snapshot</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-medium">
                <th className="text-left py-3 px-4 w-10">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Serial Number</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-right py-3 px-4">Pcs</th>
                <th className="text-right py-3 px-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No items in stock.
                  </td>
                </tr>
              )}
              {groups.map(g => {
                const isCollapsed = !!collapsed[g.name];
                return (
                  <React.Fragment key={g.name}>
                    <tr className="bg-slate-50/40">
                      <td colSpan={6} className="py-2 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-900 text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded">
                              {g.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {g.pcs} items · {fmt(g.pcs)} pcs · {fmt(g.amount)}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setCollapsed(c => ({ ...c, [g.name]: !c[g.name] }))
                            }
                            className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white"
                            aria-label="toggle"
                          >
                            <Icons.ArrowRight
                              size={12}
                              className={`transition-transform ${isCollapsed ? '' : '-rotate-90'}`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed &&
                      g.items.map(i => (
                        <tr key={i.id} className="border-t border-slate-50">
                          <td className="py-3 px-4">
                            <input type="checkbox" className="rounded" />
                          </td>
                          <td className="py-3 px-4 text-on-surface">{i.name}</td>
                          <td className="py-3 px-4 text-blue-500">{i.imei}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs">
                              {g.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700">1.00</td>
                          <td className="py-3 px-4 text-right text-on-surface font-medium">
                            {fmt(i.valuation || 0)} ETB
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ---------- P&R Report ----------

const PRReport: React.FC<{
  loans: Loan[];
  contacts: Contact[];
  orgName?: string;
}> = ({ loans, contacts, orgName }) => {
  const outstanding = useMemo(
    () => loans.filter(l => l.status !== 'SETTLED'),
    [loans]
  );

  const balanceByContact = useMemo(() => {
    // GIVEN = receivable, RECEIVED = payable
    const m = new Map<string, { name: string; phone?: string; payable: number; receivable: number; ledgers: number }>();
    outstanding.forEach(l => {
      const id = l.contactId || l.counterparty;
      const c = contacts.find(c => c.id === l.contactId);
      const name = c?.name || l.counterparty;
      const phone = c?.phone;
      const cur = m.get(id) || { name, phone, payable: 0, receivable: 0, ledgers: 0 };
      if (l.type === 'GIVEN') cur.receivable += l.amount || 0;
      else cur.payable += l.amount || 0;
      cur.ledgers += 1;
      m.set(id, cur);
    });
    return Array.from(m.values()).sort(
      (a, b) => b.payable + b.receivable - (a.payable + a.receivable)
    );
  }, [outstanding, contacts]);

  const netPayables = balanceByContact.reduce((a, x) => a + x.payable, 0);
  const netReceivables = balanceByContact.reduce((a, x) => a + x.receivable, 0);
  const netPosition = netPayables - netReceivables;
  const ledgersCount = outstanding.length;

  // Daily chart for last 12 days
  const chartData = useMemo(() => {
    const days = 12;
    const today = startOfDay(new Date());
    const buckets: { name: string; payables: number; receivables: number; net: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const next = addDays(d, 1);
      const startMs = d.getTime();
      const endMs = next.getTime();
      let payables = 0,
        receivables = 0;
      loans.forEach(l => {
        const ts = new Date(l.date).getTime();
        if (ts >= startMs && ts < endMs) {
          if (l.type === 'GIVEN') receivables += l.amount || 0;
          else payables += l.amount || 0;
        }
      });
      buckets.push({
        name: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        payables,
        receivables,
        net: receivables - payables,
      });
    }
    return buckets;
  }, [loans]);

  const exportCsv = () => {
    const rows = [
      ['Contact', 'Phone', 'Side', 'Ledgers', 'Payable', 'Receivable', 'Balance'],
      ...balanceByContact.map(c => {
        const balance = c.payable - c.receivable;
        const side = balance > 0 ? 'Payable' : balance < 0 ? 'Receivable' : 'Settled';
        return [c.name, c.phone || '', side, String(c.ledgers), String(c.payable), String(c.receivable), String(balance)];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payables-receivables-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div>
          <p className="text-xs text-slate-300 font-medium mb-1">Financial document</p>
          <h2 className="text-3xl sm:text-4xl font-headline font-bold tracking-tight">
            {orgName || 'Organization'}
          </h2>
          <p className="text-xs text-slate-300 mt-2">
            Payables and receivables report · Generated {fmtDateTime(new Date())}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="bg-white text-on-surface text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 self-start"
        >
          <Icons.Receipt size={14} /> Export Excel
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Net Payables', value: fmt(netPayables) },
          { label: 'Net Receivables', value: fmt(netReceivables) },
          {
            label: 'Net Position',
            value: `${fmt(Math.abs(netPosition))} ${netPosition >= 0 ? 'Payable' : 'Receivable'}`,
          },
          { label: 'Contacts / Ledgers', value: `${balanceByContact.length} / ${ledgersCount}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-base font-headline font-bold text-on-surface">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <p className="text-sm font-medium text-slate-600 mb-4">Daily payables vs receivables</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="payables" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="receivables" fill="#c084fc" radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={{ r: 4, fill: '#94a3b8' }}
                name="Net Margin"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-medium">
                <th className="text-left py-3 px-4 w-10">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left py-3 px-4">Contact</th>
                <th className="text-left py-3 px-4">Phone</th>
                <th className="text-left py-3 px-4">Side</th>
                <th className="text-right py-3 px-4">Ledgers</th>
                <th className="text-right py-3 px-4">Payable</th>
                <th className="text-right py-3 px-4">Receivable</th>
                <th className="text-right py-3 px-4">Balance</th>
              </tr>
            </thead>
            <tbody>
              {balanceByContact.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    No outstanding payables or receivables.
                  </td>
                </tr>
              )}
              {balanceByContact.map(c => {
                const balance = c.payable - c.receivable;
                const isPayable = balance > 0;
                const initials = c.name
                  .split(' ')
                  .map(s => s[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr key={c.name} className="border-t border-slate-50 hover:bg-slate-50/40">
                    <td className="py-4 px-4">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{c.name}</p>
                          <p className="text-xs text-slate-400">
                            Net side: {isPayable ? 'payable' : 'receivable'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{c.phone || '-'}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
                          isPayable ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {isPayable ? 'Payable' : 'Receivable'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-700">{c.ledgers}</td>
                    <td className="py-4 px-4 text-right text-on-surface">{fmt(c.payable)} ETB</td>
                    <td className="py-4 px-4 text-right text-on-surface">{fmt(c.receivable)} ETB</td>
                    <td className="py-4 px-4 text-right font-medium text-on-surface">
                      {fmt(Math.abs(balance))} ETB
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ---------- Balance Sheet ----------

const BalanceSheet: React.FC<{
  inventory: InventoryItem[];
  loans: Loan[];
  bankAccounts: BankAccount[];
}> = ({ inventory, loans, bankAccounts }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const cashAtBank = bankAccounts.reduce((a, b) => a + (b.balance || 0), 0);
  const accountsReceivable = loans
    .filter(l => l.status !== 'SETTLED' && l.type === 'GIVEN')
    .reduce((a, l) => a + (l.amount || 0), 0);
  const stock = inventory
    .filter(i => i.status === 'IN_STOCK')
    .reduce((a, i) => a + (i.valuation || 0), 0);
  const totalCurrentAssets = cashAtBank + accountsReceivable + stock;

  const accountsPayable = loans
    .filter(l => l.status !== 'SETTLED' && l.type === 'RECEIVED')
    .reduce((a, l) => a + (l.amount || 0), 0);
  const totalLiabilities = accountsPayable;

  const capital = totalCurrentAssets - totalLiabilities;

  const assetData = [
    { name: 'Cash at Bank', value: cashAtBank, color: '#10b981' },
    { name: 'Accounts Receivable', value: accountsReceivable, color: '#06b6d4' },
    { name: 'Stock', value: stock, color: '#f59e0b' },
  ].filter(x => x.value > 0);

  const exportCsv = () => {
    const rows: string[][] = [
      ['Section', 'Item', 'Amount'],
      ['Current Assets', 'Cash at Bank', String(cashAtBank)],
      ['Current Assets', 'Accounts Receivable', String(accountsReceivable)],
      ['Current Assets', 'Stock', String(stock)],
      ['Current Assets', 'Total Current Assets', String(totalCurrentAssets)],
      ['Current Liabilities', 'Accounts Payable', String(accountsPayable)],
      ['Current Liabilities', 'Total Liabilities', String(totalLiabilities)],
      ['Equity', 'Capital', String(capital)],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <HeroBanner
        label="Capital"
        primary={`${fmt(capital)} ETB`}
        right={
          <>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-xs">
              <Icons.Calendar size={14} />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-transparent text-white text-xs outline-none [color-scheme:dark]"
              />
            </div>
            <button
              onClick={() => setDate(new Date().toISOString().slice(0, 10))}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={exportCsv}
              className="bg-white text-on-surface text-xs font-medium px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100"
            >
              <Icons.Receipt size={14} /> Export Excel
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 flex items-center gap-2 text-sm font-medium text-on-surface">
            <Icons.Wallet size={16} className="text-slate-500" /> Current Assets
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-slate-600">Cash at Bank</span>
              <span className="text-on-surface">{fmt(cashAtBank)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-slate-600">Accounts Receivable</span>
              <span className="text-on-surface">{fmt(accountsReceivable)}</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-slate-600">Stock</span>
              <span className="text-on-surface">{fmt(stock)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 bg-white text-sm font-bold border-t border-slate-100">
            <span>Total Current Assets</span>
            <span>{fmt(totalCurrentAssets)}</span>
          </div>

          <div className="bg-slate-50 px-5 py-3 flex items-center gap-2 text-sm font-medium text-on-surface">
            <Icons.Bank size={16} className="text-slate-500" /> Current Liabilities
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-slate-600">Accounts Payable</span>
              <span className="text-on-surface">{fmt(accountsPayable)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 bg-white text-sm font-bold border-t border-slate-100">
            <span>Total Liabilities</span>
            <span>{fmt(totalLiabilities)}</span>
          </div>

          <div className="flex items-center justify-between px-5 py-4 bg-emerald-50/60 text-sm font-bold text-emerald-700 border-t border-emerald-100">
            <span className="flex items-center gap-2">
              <Icons.CheckCircle size={16} /> Capital
            </span>
            <span>{fmt(capital)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500 font-medium">Asset Distribution</p>
            <Icons.Info size={16} className="text-slate-300" />
          </div>
          <div className="flex-1 min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetData}
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {assetData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-headline font-bold text-on-surface">
                {fmtInt(totalCurrentAssets)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Total Assets</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400">Assets</p>
              <p className="text-xs font-bold text-on-surface mt-1">{fmt(totalCurrentAssets)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Liabilities</p>
              <p className="text-xs font-bold text-on-surface mt-1">{fmt(totalLiabilities)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Capital</p>
              <p className="text-xs font-bold text-on-surface mt-1">{fmt(capital)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ---------- Main ----------

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  transactions,
  inventory,
  loans,
  contacts,
  bankAccounts,
  orgName,
  onOpenSidebar,
}) => {
  const [report, setReport] = useState<ReportType>('sales');

  return (
    <div className="flex-1 bg-[#F7F9FB] min-h-screen p-4 lg:p-8 pb-32">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <Icons.Menu size={20} />
          </button>
          <div className="hidden lg:flex w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 items-center justify-center text-slate-400">
            <Icons.DashboardGrid size={20} />
          </div>
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Reports</h2>
            <p className="text-xs text-slate-400 font-medium">
              Stock, sales, accounts, balance sheet, and payables/receivables reports
            </p>
          </div>
        </div>
        <ReportSelector value={report} onChange={setReport} />
      </header>

      {report === 'sales' && (
        <SalesReport transactions={transactions} bankAccounts={bankAccounts} />
      )}
      {report === 'stock' && <StockReport inventory={inventory} />}
      {report === 'pr' && <PRReport loans={loans} contacts={contacts} orgName={orgName} />}
      {report === 'balance' && (
        <BalanceSheet inventory={inventory} loans={loans} bankAccounts={bankAccounts} />
      )}
    </div>
  );
};
