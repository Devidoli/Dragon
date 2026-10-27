import React, { useEffect, useMemo, useState } from 'react';
import { Expense } from '../types';
import {
  Wallet, Plus, Trash2, History, Search, Loader2,
  TrendingDown, TrendingUp, CalendarDays, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';

interface ExpensesPanelProps {
  expenses: Expense[];
  todaySales: number;
  addExpense: (e: Expense) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<void> | void;
}

type EntryType = 'income' | 'expense';

// Entries saved before income support have no type: they are expenses
const typeOf = (e: Expense): EntryType => (e.type === 'income' ? 'income' : 'expense');

// Local calendar day as YYYY-MM-DD (so "today" follows the shop's own clock)
const dayKey = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
};

const prettyDay = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  });

const sumBy = (list: Expense[], t: EntryType) =>
  list.filter(e => typeOf(e) === t).reduce((s, e) => s + e.amount, 0);

const ExpensesPanel: React.FC<ExpensesPanelProps> = ({ expenses, todaySales, addExpense, deleteExpense }) => {
  const [entryType, setEntryType] = useState<EntryType>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [today, setToday] = useState(dayKey(new Date()));

  // Roll over to a fresh list automatically when the date changes (even if the page stays open)
  useEffect(() => {
    const t = window.setInterval(() => setToday(dayKey(new Date())), 60000);
    return () => window.clearInterval(t);
  }, []);

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [expenses]
  );

  const todayList = useMemo(() => sorted.filter(e => dayKey(e.createdAt) === today), [sorted, today]);
  const todayExpense = sumBy(todayList, 'expense');
  const todayIncome = sumBy(todayList, 'income');
  const net = todaySales + todayIncome - todayExpense;

  // Previous days only, grouped by date (newest first)
  const history = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    const groups: Record<string, Expense[]> = {};
    sorted.forEach(e => {
      const k = dayKey(e.createdAt);
      if (k === today) return;
      if (q && !e.name.toLowerCase().includes(q)) return;
      (groups[k] = groups[k] || []).push(e);
    });
    return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [sorted, today, historySearch]);

  const pastExpense = history.reduce((s, [, l]) => s + sumBy(l, 'expense'), 0);
  const pastIncome = history.reduce((s, [, l]) => s + sumBy(l, 'income'), 0);

  // Most-used names (for the selected type) become quick-pick chips
  const quickNames = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.filter(e => typeOf(e) === entryType).forEach(e => { counts[e.name] = (counts[e.name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
  }, [expenses, entryType]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !value || value <= 0) return;
    setSaving(true);
    const ok = await addExpense({
      id: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      amount: value,
      type: entryType,
      createdAt: new Date().toISOString()
    });
    setSaving(false);
    if (ok) {
      setName('');
      setAmount('');
    } else {
      alert('Could not save the entry. Run the latest expenses_table.sql in Supabase, then try again.');
    }
  };

  const handleDelete = (id: string, isHistory: boolean) => {
    if (isHistory && !window.confirm('Delete this record from history?')) return;
    deleteExpense(id);
  };

  const isIncome = entryType === 'income';
  const inputCls =
    'w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white text-sm focus:ring-4 focus:ring-red-500/10';
  const labelCls = 'text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1';
  const cardCls = 'bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl';

  const EntryRow: React.FC<{ e: Expense; history: boolean; showTime: boolean }> = ({ e, history: h, showTime }) => {
    const inc = typeOf(e) === 'income';
    return (
      <div className={h
        ? 'flex items-center justify-between gap-4 px-8 py-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all'
        : 'flex items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border dark:border-white/5'}>
        <div className="flex items-center gap-4 min-w-0">
          {inc
            ? <ArrowDownCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            : <ArrowUpCircle className="w-5 h-5 text-red-500 shrink-0" />}
          <div className="min-w-0">
            <p className="font-black dark:text-white truncate">{e.name}</p>
            {showTime && (
              <p className="text-[10px] font-bold text-slate-500 uppercase">
                {inc ? 'Income' : 'Expense'} • {new Date(e.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className={`font-black text-xl tracking-tighter whitespace-nowrap ${inc ? 'text-emerald-500' : 'text-red-600'}`}>
            {inc ? '+' : '-'} Rs. {e.amount.toLocaleString()}
          </p>
          <button
            onClick={() => handleDelete(e.id, h)}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Income / Expenses</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {prettyDay(today)} • List resets every day
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: add form + summary */}
        <div className="lg:col-span-1 space-y-6">
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl space-y-5"
          >
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">New Entry</h3>

            {/* Expense / Income switch */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              {(['expense', 'income'] as EntryType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntryType(t)}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    entryType === t
                      ? (t === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-red-600 text-white shadow-lg')
                      : 'text-slate-400 hover:text-red-500'
                  }`}
                >
                  {t === 'income' ? 'Income (In)' : 'Expense (Out)'}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className={labelCls}>{isIncome ? 'Income Source' : 'Expense Name'}</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputCls}
                placeholder={isIncome ? 'e.g. Borrowed money, Owner top-up' : 'e.g. Transport, Staff lunch'}
                required
              />
              {quickNames.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {quickNames.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setName(n)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className={labelCls}>Amount (Rs.)</label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={inputCls}
                placeholder="0"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-5 text-white font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-2 ${isIncome ? 'bg-emerald-500' : 'bg-red-600'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isIncome ? 'Add Income' : 'Add Expense'}
            </button>
          </form>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div className={cardCls}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Today's Sales</p>
              <p className="text-2xl font-black dark:text-white tracking-tighter">Rs. {todaySales.toLocaleString()}</p>
            </div>
            <div className={cardCls}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Other Income</p>
              <p className="text-2xl font-black text-emerald-500 tracking-tighter">+ Rs. {todayIncome.toLocaleString()}</p>
            </div>
            <div className={cardCls}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Today's Expenses</p>
              <p className="text-2xl font-black text-red-600 tracking-tighter flex items-center gap-2">
                <TrendingDown className="w-5 h-5" /> Rs. {todayExpense.toLocaleString()}
              </p>
            </div>
            <div className={cardCls}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Net Today</p>
              <p className={`text-2xl font-black tracking-tighter flex items-center gap-2 ${net >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>
                <TrendingUp className="w-5 h-5" /> Rs. {net.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right: today's list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-black uppercase tracking-tighter text-red-600">Today</h3>
            <span className="bg-slate-100 dark:bg-slate-800 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest dark:text-slate-300">
              {todayList.length} Entries
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
            {todayList.map(e => <EntryRow key={e.id} e={e} history={false} showTime />)}
            {todayList.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
                <Wallet className="w-16 h-16 mb-4" />
                <p className="font-black uppercase tracking-widest">Nothing recorded today</p>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t dark:border-white/5 grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Income Today</p>
              <p className="text-3xl font-black text-emerald-500 tracking-tighter">Rs. {todayIncome.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Spent Today</p>
              <p className="text-3xl font-black text-red-600 tracking-tighter">Rs. {todayExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <History className="w-8 h-8 text-red-500" />
            <div>
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">History</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Previous days • In Rs. {pastIncome.toLocaleString()} • Out Rs. {pastExpense.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-72 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Search name..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-3 pl-12 pr-4 font-bold dark:text-white shadow-xl focus:ring-4 focus:ring-red-500/10 text-xs"
            />
          </div>
        </div>

        <div className="space-y-10">
          {history.map(([key, list]) => (
            <div key={key} className="space-y-4">
              <div className="flex items-center gap-6">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> {prettyDay(key)}
                </h3>
                <div className="h-px w-full bg-slate-200 dark:bg-white/5" />
                <div className="flex items-center gap-4 whitespace-nowrap text-sm font-black">
                  <span className="text-emerald-500">+ Rs. {sumBy(list, 'income').toLocaleString()}</span>
                  <span className="text-red-600">- Rs. {sumBy(list, 'expense').toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden divide-y dark:divide-white/5">
                {list.map(e => <EntryRow key={e.id} e={e} history showTime={false} />)}
              </div>
            </div>
          ))}

          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 rounded-[3rem] border-dashed border-4 border-slate-200 dark:border-slate-800">
              <History className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Past Records</h3>
              <p className="text-slate-500 font-bold mt-2 text-sm">Yesterday's and older entries will show up here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpensesPanel;
