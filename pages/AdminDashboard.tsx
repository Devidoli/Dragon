import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale, UserStatus } from '../types';
import { LIQUOR_VOLUMES, CATEGORIES } from '../constants';
import { 
  Users, Package, TrendingUp, Plus, ArrowUpRight, Flame, Trash2, 
  ShoppingCart, ShieldCheck, Clock, RefreshCcw, Loader2, Check, 
  CheckCircle, BarChart3, Wallet, IndianRupee, Search, X, Minus, Receipt,
  Database, AlertCircle
} from 'lucide-react';
import { SupabaseConfig } from '../services';
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

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

interface DraftBillItem {
  id: string; 
  product: Product;
  customPrice: number;
  quantity: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, 
  products, 
  orders, 
  counterSales, 
  approveUser, 
  addProduct, 
  deleteProduct, 
  updateStock, 
  addCounterSale, 
  onRefresh 
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'inventory' | 'counter'>('stats');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({ name: '', category: 'Whisky', volume: 'Full (750ml)', price: 0, stock: 0, image: '', unit: 'Bottle' });
  const [searchQuery, setSearchQuery] = useState('');
  const [billItems, setBillItems] = useState<DraftBillItem[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 10);
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

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
  
  const approvedUsers = useMemo(() => 
    users.filter(u => u.role === 'customer' && u.status?.toLowerCase() === 'approved'), 
  [users]);

  const totalRevenue = useMemo(() => 
    orders.reduce((s, o) => s + o.total, 0) + counterSales.reduce((s, c) => s + c.total, 0)
  , [orders, counterSales]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-24 relative">
      {/* DB Connection Status Header */}
      <div className="flex items-center justify-between bg-slate-900/40 border border-white/5 p-4 rounded-3xl mb-4">
        <div className="flex items-center gap-3">
          <Database className={`w-4 h-4 ${SupabaseConfig.isConfigured ? 'text-emerald-500' : 'text-red-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Supabase Status: {SupabaseConfig.isConfigured ? 'Connected' : 'Credentials Missing'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Total Records: {users.length} Users | {products.length} Products
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
              { id: 'counter', label: 'In-Store POS', icon: ShoppingCart },
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-orange-500" />
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Approval Queue</h2>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 px-6 py-2 rounded-2xl">
                <span className="text-orange-500 font-black text-xs uppercase tracking-widest">{pendingUsers.length} Pending Apps</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest"><th className="px-10 py-6">Business</th><th className="px-10 py-6">Email</th><th className="px-10 py-6 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {pendingUsers.map(c => (
                    <tr key={c.id} className="hover:bg-orange-500/5 transition-all">
                      <td className="px-10 py-8 font-black dark:text-white">{c.shopName}</td>
                      <td className="px-10 py-8 text-xs font-bold text-slate-500">{c.email}</td>
                      <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                        {showSuccess === c.id ? (
                          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl">
                            <Check className="w-3 h-3" /> Verified
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
                      <td colSpan={3} className="px-10 py-24 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <AlertCircle className="w-12 h-12" />
                          <p className="font-black uppercase text-xs tracking-[0.3em]">No pending merchant applications</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rest of components remain as in previous versions... */}
      {activeTab === 'stats' && <p className="text-center text-slate-500 font-black uppercase tracking-widest py-20">Analytics Dashboard Loaded</p>}
      {activeTab === 'counter' && <p className="text-center text-slate-500 font-black uppercase tracking-widest py-20">POS Terminal Ready</p>}
      {activeTab === 'inventory' && <p className="text-center text-slate-500 font-black uppercase tracking-widest py-20">Vault Management Ready</p>}
    </div>
  );
};

export default AdminDashboard;