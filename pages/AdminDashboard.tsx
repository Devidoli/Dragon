import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale, UserStatus } from '../types';
import { 
  Users, Package, TrendingUp, ArrowUpRight, Flame, 
  ShoppingCart, Clock, RefreshCcw, Loader2, Check, 
  Database, AlertCircle, ShieldCheck
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
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const handleManualRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    const success = await approveUser(id);
    setApprovingId(null);
    if (success) {
      setShowSuccess(id);
      setTimeout(() => setShowSuccess(null), 3000);
    }
  };

  const pendingUsers = useMemo(() => 
    users.filter(u => u.role === 'customer' && (!u.status || u.status.toLowerCase() === 'pending')), 
  [users]);
  
  const approvedMerchants = useMemo(() => 
    users.filter(u => u.status?.toLowerCase() === 'approved'), 
  [users]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-24 relative">
      <div className="flex items-center justify-between bg-slate-900/40 border border-white/5 p-4 rounded-3xl mb-4">
        <div className="flex items-center gap-3">
          <Database className={`w-4 h-4 ${SupabaseConfig.isConfigured ? 'text-emerald-500' : 'text-red-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Live Sync: {SupabaseConfig.isConfigured ? 'Active' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Loaded: {users.length} Merchants | {products.length} Products
          </span>
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
        <div className="flex items-center gap-3">
           <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95">
             <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
           </button>
           <div className="flex bg-white dark:bg-slate-800/50 backdrop-blur p-2 rounded-[1.75rem] border border-slate-200 dark:border-slate-700 shadow-xl">
            {[
              { id: 'stats', label: 'Analytics', icon: TrendingUp },
              { id: 'counter', label: 'POS', icon: ShoppingCart },
              { id: 'users', label: 'Merchants', icon: Users },
              { id: 'inventory', label: 'Vault', icon: Package }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all text-[10px] uppercase tracking-widest ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-red-500'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-16 animate-in fade-in duration-500">
          {/* Section 1: Approval Queue */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-orange-500" />
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Approval Queue</h2>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-2 rounded-2xl">
                <span className="text-orange-500 font-black text-xs uppercase tracking-widest">{pendingUsers.length} Applications</span>
              </div>
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
                      <td className="px-10 py-8 font-black dark:text-white">{c.shopName}</td>
                      <td className="px-10 py-8 text-xs font-bold text-slate-500">{c.email}</td>
                      <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                        {showSuccess === c.id ? (
                          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl">
                            <Check className="w-3 h-3" /> Approved
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleApprove(c.id)} 
                            disabled={approvingId === c.id}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
                          >
                            {approvingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Grant Access"}
                          </button>
                        )}
                        <Link to={`/admin/customer/${c.id}`} className="p-3 bg-slate-700 rounded-xl text-slate-400 hover:text-white"><ArrowUpRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-16 text-center opacity-30">
                        <AlertCircle className="w-10 h-10 mx-auto mb-4" />
                        <p className="font-black uppercase text-[10px] tracking-widest">No pending applications</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Approved Directory */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Merchant Directory</h2>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-10 py-6">Merchant</th>
                    <th className="px-10 py-6">Tier</th>
                    <th className="px-10 py-6 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {approvedMerchants.map(c => (
                    <tr key={c.id} className="hover:bg-emerald-500/5 transition-all">
                      <td className="px-10 py-8">
                        <p className="font-black dark:text-white leading-none">{c.shopName}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1">{c.email}</p>
                      </td>
                      <td className="px-10 py-8">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.role === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-slate-700 text-slate-400'}`}>
                          {c.role}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <Link to={`/admin/customer/${c.id}`} className="text-slate-500 hover:text-white font-bold text-xs">View History</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'users' && <div className="py-20 text-center text-slate-500 font-black uppercase tracking-widest opacity-20">Terminal Area Ready</div>}
    </div>
  );
};

export default AdminDashboard;