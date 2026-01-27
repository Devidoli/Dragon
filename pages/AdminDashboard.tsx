import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale, UserStatus } from '../types';
import { 
  Users, Package, TrendingUp, ArrowUpRight, Flame, 
  ShoppingCart, Clock, RefreshCcw, Loader2, Check, 
  Database, AlertCircle, ShieldCheck, Activity
} from 'lucide-react';
import { SupabaseConfig } from '../services';

interface AdminDashboardProps {
  users: User[];
  products: Product[];
  orders: Order[];
  counterSales: CounterSale[];
  approveUser: (id: string) => Promise<boolean>;
  addProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  updateStock: (id: string, qty: number) => void;
  addCounterSale: (sale: CounterSale) => void;
  onRefresh?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, 
  products, 
  orders, 
  counterSales, 
  approveUser, 
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'inventory' | 'counter'>('users');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleManualRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    await approveUser(id);
    setApprovingId(null);
  };

  const pendingUsers = useMemo(() => 
    users.filter(u => u.role === 'customer' && (!u.status || u.status.toLowerCase() === 'pending')), 
  [users]);
  
  const allMerchants = useMemo(() => 
    users.filter(u => u.role === 'customer'), 
  [users]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 pb-24 relative">
      {/* DB DIAGNOSTIC BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/60 border border-white/5 p-4 rounded-3xl gap-4">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl ${SupabaseConfig.isConfigured ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Database className={`w-5 h-5 ${SupabaseConfig.isConfigured ? 'text-emerald-500' : 'text-red-500'}`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Database Engine</p>
            <p className="text-xs font-bold text-white">{SupabaseConfig.isConfigured ? 'CONNECTED TO SUPABASE' : 'OFFLINE MODE'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8 pr-4">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Users</p>
            <p className="text-xl font-black text-white leading-none mt-1">{users.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending</p>
            <p className="text-xl font-black text-orange-500 leading-none mt-1">{pendingUsers.length}</p>
          </div>
          <button 
            onClick={handleManualRefresh}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
            title="Force Sync Now"
          >
            <RefreshCcw className={`w-5 h-5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="p-4 bg-red-600 rounded-[1.5rem] shadow-xl">
            <Flame className="text-white w-10 h-10" /> 
          </div>
          <div>
            <h1 className="text-4xl font-black dark:text-white text-slate-900 tracking-tighter uppercase leading-none">Control Center</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Distribution Management Hub</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-slate-800/50 backdrop-blur p-2 rounded-[1.75rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-x-auto">
          {[
            { id: 'stats', label: 'Analytics', icon: TrendingUp },
            { id: 'counter', label: 'POS', icon: ShoppingCart },
            { id: 'users', label: 'Merchants', icon: Users },
            { id: 'inventory', label: 'Vault', icon: Package }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all text-[10px] uppercase tracking-widest whitespace-nowrap ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-red-500'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-16 animate-in fade-in duration-500">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-orange-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Approval Queue</h2>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-10 py-6">Business Name</th>
                    <th className="px-10 py-6">Email Address</th>
                    <th className="px-10 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {pendingUsers.map(c => (
                    <tr key={c.id} className="hover:bg-orange-500/5 transition-all">
                      <td className="px-10 py-8 font-black dark:text-white">{c.shopName || "Unnamed Shop"}</td>
                      <td className="px-10 py-8 text-xs font-bold text-slate-500">{c.email}</td>
                      <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleApprove(c.id)} 
                          disabled={approvingId === c.id}
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
                        >
                          {approvingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify Merchant"}
                        </button>
                        <Link to={`/admin/customer/${c.id}`} className="p-3 bg-slate-700 rounded-xl text-slate-400 hover:text-white"><ArrowUpRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-16 text-center opacity-30 italic">
                        No pending applications at this moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-emerald-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Database Records (All Merchants)</h2>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-10 py-6">Merchant Email</th>
                    <th className="px-10 py-6">Current Status</th>
                    <th className="px-10 py-6 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {allMerchants.map(c => (
                    <tr key={c.id} className="hover:bg-white/5 transition-all">
                      <td className="px-10 py-8 font-bold dark:text-slate-300">{c.email}</td>
                      <td className="px-10 py-8">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {c.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <Link to={`/admin/customer/${c.id}`} className="text-[10px] font-bold text-red-500 uppercase">Inspect</Link>
                      </td>
                    </tr>
                  ))}
                   {allMerchants.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-16 text-center text-red-500 font-bold uppercase tracking-widest">
                        Zero merchants found in database. Check RLS or Sync!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'users' && <div className="py-24 text-center text-slate-500 font-black uppercase tracking-[0.3em] opacity-20">Terminal Area Ready</div>}
    </div>
  );
};

export default AdminDashboard;