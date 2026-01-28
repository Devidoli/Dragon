import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale, UserStatus } from '../types';
import { 
  Users, Package, TrendingUp, ArrowUpRight, Flame, 
  ShoppingCart, Clock, RefreshCcw, Loader2, Check, 
  Plus, Minus, Trash2, LayoutGrid, Search, AlertCircle, DollarSign, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  dbError?: string | null;
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

  // Form States
  const [posProduct, setPosProduct] = useState<string>('');
  const [posQty, setPosQty] = useState<number>(1);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Whisky', price: 0, stock: 0, volume: 'Full (750ml)', unit: 'Bottle' });

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

  const handlePOSSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === posProduct);
    if (!prod || prod.stock < posQty) return;

    const sale: CounterSale = {
      id: `SALE-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      price: prod.price,
      quantity: posQty,
      total: prod.price * posQty,
      createdAt: new Date().toISOString()
    };
    addCounterSale(sale);
    setPosProduct('');
    setPosQty(1);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Product = {
      ...newProduct,
      id: `P-${Date.now()}`,
      image: 'https://picsum.photos/seed/spirit/400/400'
    };
    addProduct(p);
    setNewProduct({ name: '', category: 'Whisky', price: 0, stock: 0, volume: 'Full (750ml)', unit: 'Bottle' });
  };

  // Calculations
  const totalWholesale = orders.reduce((s, o) => s + o.total, 0);
  const totalCounter = counterSales.reduce((s, c) => s + c.total, 0);
  const totalRevenue = totalWholesale + totalCounter;
  const totalStockValue = products.reduce((s, p) => s + (p.price * p.stock), 0);

  const chartData = [
    { name: 'Wholesale', value: totalWholesale, color: '#dc2626' },
    { name: 'Counter', value: totalCounter, color: '#d97706' }
  ];

  const pendingUsers = users.filter(u => u.role === 'customer' && (!u.status || u.status.toLowerCase() === 'pending'));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
      {/* Header Area */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="p-4 bg-red-600 rounded-[1.5rem] shadow-xl">
            <Flame className="text-white w-10 h-10" /> 
          </div>
          <div>
            <h1 className="text-4xl font-black dark:text-white text-slate-900 tracking-tighter uppercase leading-none">Admin Hub</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Premium Distribution Terminal</p>
          </div>
        </div>
        <div className="flex bg-white dark:bg-slate-800/50 backdrop-blur p-2 rounded-[1.75rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-x-auto">
          {[
            { id: 'stats', label: 'Analytics', icon: TrendingUp },
            { id: 'counter', label: 'Counter POS', icon: ShoppingCart },
            { id: 'users', label: 'Merchants', icon: Users },
            { id: 'inventory', label: 'Vault', icon: Package }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all text-[10px] uppercase tracking-widest whitespace-nowrap ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-red-500'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <button onClick={handleManualRefresh} className="px-4 text-slate-500 hover:text-red-500"><RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Combined Revenue', value: `Rs. ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
              { label: 'Active Merchants', value: users.length, icon: Users, color: 'text-blue-500' },
              { label: 'Asset Valuation', value: `Rs. ${totalStockValue.toLocaleString()}`, icon: Package, color: 'text-red-500' },
              { label: 'Stock Units', value: products.reduce((s, p) => s + p.stock, 0), icon: LayoutGrid, color: 'text-orange-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl space-y-4">
                <div className={`p-3 w-fit rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-black dark:text-white tracking-tighter">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl space-y-8">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Market Performance</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => `Rs.${v/1000}k`} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-red-600 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between">
              <div className="space-y-2">
                <Flame className="w-12 h-12 text-white/50 mb-6" />
                <h3 className="text-3xl font-black text-white leading-tight tracking-tighter uppercase">Distribution Efficiency</h3>
                <p className="text-red-200 text-xs font-bold leading-relaxed">Your wholesale orders account for {((totalWholesale / (totalRevenue || 1)) * 100).toFixed(1)}% of total volume.</p>
              </div>
              <button onClick={() => setActiveTab('users')} className="mt-8 bg-white text-red-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                Manage Approvals <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'counter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in zoom-in-95 duration-500">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <ShoppingCart className="w-8 h-8 text-orange-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Physical Store POS</h2>
            </div>
            
            <form onSubmit={handlePOSSubmit} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border dark:border-white/5 shadow-2xl space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Spirit</label>
                  <select 
                    value={posProduct} 
                    onChange={e => setPosProduct(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-5 px-6 font-bold dark:text-white text-lg focus:ring-4 focus:ring-orange-500/20"
                    required
                  >
                    <option value="">Choose item...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock === 0}>
                        {p.name} ({p.volume}) - Rs. {p.price} [In Stock: {p.stock}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                  <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                    <button type="button" onClick={() => setPosQty(Math.max(1, posQty - 1))} className="p-3 bg-white dark:bg-slate-700 rounded-xl text-slate-400"><Minus /></button>
                    <span className="flex-1 text-center text-3xl font-black dark:text-white">{posQty}</span>
                    <button type="button" onClick={() => setPosQty(posQty + 1)} className="p-3 bg-white dark:bg-slate-700 rounded-xl text-slate-400"><Plus /></button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t dark:border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Transaction</p>
                  <p className="text-4xl font-black text-orange-600 tracking-tighter">
                    Rs. {((products.find(p => p.id === posProduct)?.price || 0) * posQty).toLocaleString()}
                  </p>
                </div>
                <button type="submit" className="px-10 py-5 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">Record Sale</button>
              </div>
            </form>
          </div>

          <div className="space-y-8">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Recent Counter Log</h3>
                <Activity className="w-5 h-5 text-slate-500" />
             </div>
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide">
                {counterSales.map(sale => (
                  <div key={sale.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 rounded-xl"><Package className="w-5 h-5 text-orange-500" /></div>
                      <div>
                        <p className="font-black dark:text-white text-sm">{sale.productName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty: {sale.quantity} • {new Date(sale.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <p className="font-black text-slate-900 dark:text-white">Rs. {sale.total.toLocaleString()}</p>
                  </div>
                ))}
                {counterSales.length === 0 && <p className="text-center py-20 opacity-20 font-black uppercase tracking-widest">No Store Transactions</p>}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-red-500" />
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">The Spirits Vault</h2>
              </div>
              <button 
                onClick={() => setActiveTab('inventory')} // Keep on same tab but maybe show modal
                className="px-8 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Catalog Expansion
              </button>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 dark:bg-slate-950/50">
                 <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                   <th className="px-10 py-6">Identity</th>
                   <th className="px-10 py-6">Stock Status</th>
                   <th className="px-10 py-6">Costing</th>
                   <th className="px-10 py-6 text-right">Vault Controls</th>
                 </tr>
               </thead>
               <tbody className="divide-y dark:divide-white/5">
                 {products.map(p => (
                   <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                     <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                         <img src={p.image} className="w-12 h-12 rounded-xl object-cover shadow-lg" alt="" />
                         <div>
                           <p className="font-black dark:text-white text-lg tracking-tight">{p.name}</p>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{p.category} • {p.volume}</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-10 py-8">
                       <div className="flex items-center gap-4">
                         <div className={`w-3 h-3 rounded-full ${p.stock > 10 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                         <span className="font-black dark:text-white text-xl">{p.stock} <span className="text-[10px] text-slate-500 tracking-widest">{p.unit}s</span></span>
                       </div>
                     </td>
                     <td className="px-10 py-8 font-black dark:text-slate-400 tracking-tighter">Rs. {p.price.toLocaleString()}</td>
                     <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                         <button onClick={() => updateStock(p.id, p.stock - 1)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-red-500"><Minus className="w-4 h-4" /></button>
                         <button onClick={() => updateStock(p.id, p.stock + 1)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-emerald-500"><Plus className="w-4 h-4" /></button>
                         <button onClick={() => deleteProduct(p.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <Clock className="w-8 h-8 text-orange-500" />
            <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Approval Gateway</h2>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                  <th className="px-10 py-6">Business Identification</th>
                  <th className="px-10 py-6">Verification Channel</th>
                  <th className="px-10 py-6 text-right">Authorize</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5">
                {pendingUsers.map(c => (
                  <tr key={c.id} className="hover:bg-orange-500/5 transition-all">
                    <td className="px-10 py-8">
                       <p className="font-black dark:text-white text-lg tracking-tight">{c.shopName || "Anonymous Hub"}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.address}</p>
                    </td>
                    <td className="px-10 py-8 text-sm font-bold text-slate-500">{c.email}</td>
                    <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleApprove(c.id)} 
                        disabled={approvingId === c.id}
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all flex items-center gap-2"
                      >
                        {approvingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Grant Access
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-10 py-24 text-center opacity-20 italic font-black uppercase tracking-[0.5em]">No Pending Applications</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;