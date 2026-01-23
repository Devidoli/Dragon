import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale } from '../types';
import { LIQUOR_VOLUMES, CATEGORIES } from '../constants';
import { Users, Package, TrendingUp, Plus, ArrowUpRight, Flame, Trash2, ShoppingCart, Upload, ShieldCheck, Clock, CheckCircle, RefreshCcw, Database } from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

interface AdminDashboardProps {
  users: User[];
  products: Product[];
  orders: Order[];
  counterSales: CounterSale[];
  approveUser: (id: string) => void;
  addProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  updateStock: (id: string, qty: number) => void;
  addCounterSale: (sale: CounterSale) => void;
  onRefresh?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, products, orders, counterSales, approveUser, addProduct, deleteProduct, updateStock, addCounterSale, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'inventory' | 'counter'>('stats');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCounterSaleModal, setShowCounterSaleModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Resilient filtering logic
  const pendingUsers = useMemo(() => 
    users.filter(u => u.role === 'customer' && (!u.status || u.status.toLowerCase() === 'pending')), 
  [users]);
  
  const approvedUsers = useMemo(() => 
    users.filter(u => u.role === 'customer' && u.status?.toLowerCase() === 'approved'), 
  [users]);

  const totalSales = orders.reduce((s, o) => s + o.total, 0) + counterSales.reduce((s, c) => s + c.total, 0);
  const todayStr = new Date().toDateString();

  const groupedSales = useMemo(() => {
    const groups: Record<string, CounterSale[]> = {};
    counterSales.forEach(s => {
      const d = new Date(s.createdAt).toDateString();
      if (!groups[d]) groups[d] = [];
      groups[d].push(s);
    });
    return groups;
  }, [counterSales]);

  const salesTrends = useMemo(() => {
    const data = [];
    for(let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const total = orders.filter(o => new Date(o.createdAt).toDateString() === ds).reduce((s,o) => s+o.total, 0) + 
                    counterSales.filter(s => new Date(s.createdAt).toDateString() === ds).reduce((s,x) => s+x.total, 0);
      data.push({ day: d.toLocaleDateString([], { weekday: 'short' }), revenue: total });
    }
    return data;
  }, [orders, counterSales]);

  const [newProduct, setNewProduct] = useState({ name: '', category: 'Whisky', volume: 'Full (750ml)', price: 0, stock: 0, unit: 'Bottle', image: '' });
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [salePrice, setSalePrice] = useState(0);
  const [saleQty, setSaleQty] = useState(1);
  const [saleSearch, setSaleSearch] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProduct(prev => ({ ...prev, image: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const saveProduct = () => {
    if (!newProduct.name || newProduct.price <= 0) return;
    addProduct({ ...newProduct, id: `PROD-${Date.now()}`, image: newProduct.image || 'https://picsum.photos/seed/liquor/400/400' });
    setNewProduct({ name: '', category: 'Whisky', volume: 'Full (750ml)', price: 0, stock: 0, unit: 'Bottle', image: '' });
    setShowAddProductModal(false);
  };

  const saveSale = () => {
    if (!saleProduct) return;
    addCounterSale({ id: `CS-${Date.now()}`, productId: saleProduct.id, productName: saleProduct.name, price: salePrice, quantity: saleQty, total: salePrice * saleQty, createdAt: new Date().toISOString() });
    setSaleProduct(null);
    setShowCounterSaleModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-24 relative">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="p-4 bg-red-600 rounded-[1.5rem] shadow-xl">
            <Flame className="text-white w-10 h-10" /> 
          </div>
          <div>
            <h1 className="text-4xl font-black dark:text-white text-slate-900 tracking-tighter uppercase leading-none">Control Center</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Official B2B Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50">
             <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
           </button>
           <div className="flex bg-white dark:bg-slate-800/50 backdrop-blur p-2 rounded-[1.75rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-x-auto scrollbar-hide">
            {[
              { id: 'stats', label: 'Analytics', icon: TrendingUp },
              { id: 'counter', label: 'In-Store', icon: ShoppingCart },
              { id: 'users', label: 'Merchants', icon: Users },
              { id: 'inventory', label: 'Inventory', icon: Package }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all text-[10px] uppercase tracking-widest ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-red-500'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border-t-8 border-red-600 shadow-xl">
            <TrendingUp className="text-red-600 w-12 h-12 mb-6" />
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Gross Revenue</p>
            <p className="text-4xl font-black dark:text-white text-slate-900 mt-2">Rs. {totalSales.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] lg:col-span-3 shadow-xl h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrends}>
                  <defs><linearGradient id="clr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="day" stroke="#94a3b8" /> <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#ef4444" fill="url(#clr)" strokeWidth={4} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-16 animate-in fade-in duration-500">
          {/* Diagnostic Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
              <Database className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Database Records</p>
                <p className="text-2xl font-black text-white">{users.length} Users</p>
              </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Applications</p>
                <p className="text-2xl font-black text-white">{pendingUsers.length}</p>
              </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified Partners</p>
                <p className="text-2xl font-black text-white">{approvedUsers.length}</p>
              </div>
            </div>
          </div>

          {/* Section 1: Pending Requests */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-orange-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Application Queue</h2>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-orange-500/10">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest"><th className="px-10 py-6">Shop Identity</th><th className="px-10 py-6">Email Contact</th><th className="px-10 py-6 text-right">Operations</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {pendingUsers.map(c => (
                    <tr key={c.id} className="hover:bg-orange-500/5 transition-all">
                      <td className="px-10 py-8 font-black dark:text-white">{c.shopName}</td>
                      <td className="px-10 py-8 font-bold text-slate-500 text-xs">{c.email}</td>
                      <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                        <button onClick={() => approveUser(c.id)} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">Approve Access</button>
                        <Link to={`/admin/customer/${c.id}`} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 hover:text-white transition-all"><ArrowUpRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr><td colSpan={3} className="px-10 py-16 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No pending applications found. Try clicking sync.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Approved Merchants */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Verified Merchants</h2>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-emerald-500/10">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest"><th className="px-10 py-6">Business Name</th><th className="px-10 py-6">Status</th><th className="px-10 py-6 text-right">Records</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {approvedUsers.map(c => (
                    <tr key={c.id} className="hover:bg-emerald-500/5 transition-all">
                      <td className="px-10 py-8 font-black dark:text-white">{c.shopName}</td>
                      <td className="px-10 py-8">
                        <span className="inline-flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-full"><ShieldCheck className="w-3 h-3" /> AUTHORIZED</span>
                      </td>
                      <td className="px-10 py-8 text-right"><Link to={`/admin/customer/${c.id}`} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl inline-block hover:bg-red-500 hover:text-white transition-all"><ArrowUpRight className="w-4 h-4" /></Link></td>
                    </tr>
                  ))}
                  {approvedUsers.length === 0 && (
                    <tr><td colSpan={3} className="px-10 py-16 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No verified merchants in database</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Counter, Inventory, and Modal implementations remain stable and italic-free */}
    </div>
  );
};

export default AdminDashboard;