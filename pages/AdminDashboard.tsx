import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale, UserStatus } from '../types';
import { LIQUOR_VOLUMES, CATEGORIES } from '../constants';
import { 
  Users, Package, TrendingUp, Plus, ArrowUpRight, Flame, Trash2, 
  ShoppingCart, ShieldCheck, Clock, RefreshCcw, Loader2, Check, 
  CheckCircle, BarChart3, Wallet, IndianRupee, Search, X
} from 'lucide-react';
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

  // New Product State
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Whisky', volume: 'Full (750ml)', price: 0, stock: 0, image: '', unit: 'Bottle' });
  
  // Counter Sale State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleQty, setSaleQty] = useState(1);
  const [customPrice, setCustomPrice] = useState<number>(0);

  // Sync custom price when product selection changes
  useEffect(() => {
    if (selectedProduct) {
      setCustomPrice(selectedProduct.price);
    } else {
      setCustomPrice(0);
    }
  }, [selectedProduct]);

  const filteredSearchProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
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

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = Date.now().toString();
    const img = newProduct.image || `https://picsum.photos/seed/${id}/400/400`;
    addProduct({ ...newProduct, id, image: img });
    setNewProduct({ name: '', category: 'Whisky', volume: 'Full (750ml)', price: 0, stock: 0, image: '', unit: 'Bottle' });
  };

  const handleCounterSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct && saleQty > 0) {
      addCounterSale({
        id: `CS-${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        price: customPrice,
        quantity: saleQty,
        total: customPrice * saleQty,
        createdAt: new Date().toISOString()
      });
      setSelectedProduct(null);
      setSearchQuery('');
      setSaleQty(1);
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

  const salesTrends = useMemo(() => {
    const data = [];
    for(let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const total = orders.filter(o => new Date(o.createdAt).toDateString() === ds).reduce((s,o) => s+o.total, 0) + 
                    counterSales.filter(s => new Date(s.createdAt).toDateString() === ds).reduce((s,x) => s+x.total, 0);
      data.push({ 
        day: d.toLocaleDateString([], { weekday: 'short' }), 
        revenue: total 
      });
    }
    return data;
  }, [orders, counterSales]);

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
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-10 rounded-[2.5rem] space-y-4">
              <div className="flex items-center justify-between">
                <BarChart3 className="text-red-500 w-10 h-10" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">+12% vs LY</span>
              </div>
              <div>
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Total Hub Revenue</p>
                <h3 className="text-4xl font-black text-white tracking-tighter">Rs. {totalRevenue.toLocaleString()}</h3>
              </div>
            </div>
            <div className="glass p-10 rounded-[2.5rem] space-y-4">
              <Wallet className="text-orange-500 w-10 h-10" />
              <div>
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Dispatch Orders</p>
                <h3 className="text-4xl font-black text-white tracking-tighter">{orders.length} Batches</h3>
              </div>
            </div>
            <div className="glass p-10 rounded-[2.5rem] space-y-4">
              <ShieldCheck className="text-emerald-500 w-10 h-10" />
              <div>
                <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Active Merchants</p>
                <h3 className="text-4xl font-black text-white tracking-tighter">{approvedUsers.length} Units</h3>
              </div>
            </div>
          </div>

          <div className="glass p-10 rounded-[3rem] border border-white/5">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Revenue Trajectory</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last 7 Trading Cycles</p>
             </div>
             <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={salesTrends}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} dy={10} />
                      <YAxis hide />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px'}} />
                      <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'counter' && (
        <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
           <div className="glass p-10 rounded-[3rem] space-y-10 border border-white/10">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-slate-900 rounded-2xl">
                  <IndianRupee className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                   <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">In-Store Billing</h2>
                   <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">Counter Sale Terminal</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Search Interface */}
                {!selectedProduct ? (
                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Search Catalog</label>
                    <div className="relative">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or category..."
                        className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-5 pl-14 pr-5 text-white font-bold outline-none focus:border-red-500 transition-all"
                      />
                    </div>
                    {filteredSearchProducts.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5">
                        {filteredSearchProducts.map(p => (
                          <button 
                            key={p.id} 
                            onClick={() => setSelectedProduct(p)}
                            className="w-full text-left p-5 hover:bg-red-500/10 transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                              <div>
                                <p className="font-black text-white text-sm">{p.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.volume} • {p.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-emerald-500">Rs. {p.price}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.stock} in stock</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-emerald-500/20 rounded-3xl p-8 relative animate-in fade-in slide-in-from-top-4">
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="absolute top-4 right-4 p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-6">
                      <img src={selectedProduct.image} className="w-20 h-20 rounded-2xl object-cover shadow-2xl" />
                      <div>
                        <h4 className="text-2xl font-black text-white tracking-tighter leading-none">{selectedProduct.name}</h4>
                        <div className="flex items-center gap-3 mt-2">
                           <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{selectedProduct.volume}</span>
                           <span className="w-1 h-1 bg-slate-700 rounded-full" />
                           <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">{selectedProduct.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCounterSaleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sale Price (Editable)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                        <input 
                          type="number" 
                          required 
                          value={customPrice || ''} 
                          onChange={(e) => setCustomPrice(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-5 pl-14 pr-5 text-white font-black text-2xl outline-none focus:border-red-500 transition-all"
                          placeholder="0"
                        />
                      </div>
                      {selectedProduct && customPrice !== selectedProduct.price && (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-orange-500 animate-pulse">
                          Custom pricing applied (Catalog: Rs. {selectedProduct.price})
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dispatch Quantity</label>
                      <input 
                        type="number" 
                        required 
                        min="1" 
                        max={selectedProduct?.stock || 9999}
                        value={saleQty} 
                        onChange={(e) => setSaleQty(parseInt(e.target.value))} 
                        className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 text-white font-black text-2xl outline-none focus:border-red-500 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction Total</p>
                      <p className="text-4xl font-black text-emerald-500 tracking-tighter">Rs. {(customPrice * saleQty).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Inventory Post-Sale</p>
                       <p className="text-xl font-black text-white tracking-tight">{selectedProduct ? selectedProduct.stock - saleQty : '--'} Units</p>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!selectedProduct || (selectedProduct && saleQty > selectedProduct.stock)}
                    className="w-full vibrant-gradient text-white font-black py-7 rounded-3xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-2xl uppercase tracking-tighter disabled:opacity-30 disabled:hover:scale-100"
                  >
                    {!selectedProduct ? "Select Spirit to Continue" : (saleQty > selectedProduct.stock ? "Insufficient Stock" : "Execute Cash Settlement")}
                  </button>
                </form>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-16 animate-in fade-in duration-500">
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
                      <td className="px-10 py-8 font-black dark:text-white">
                        <div className="flex flex-col">
                          <span>{c.shopName}</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">ID: {c.id}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 font-bold text-slate-500 text-xs">{c.email}</td>
                      <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                        {showSuccess === c.id ? (
                          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Approved
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleApprove(c.id)} 
                            disabled={approvingId === c.id}
                            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                          >
                            {approvingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            {approvingId === c.id ? "Syncing..." : "Grant Access"}
                          </button>
                        )}
                        <Link to={`/admin/customer/${c.id}`} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 hover:text-white transition-all"><ArrowUpRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr><td colSpan={3} className="px-10 py-16 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No pending applications found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-12 animate-in slide-in-from-bottom duration-500">
           <div className="glass p-10 rounded-[3rem] border border-white/10">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <Plus className="text-red-500" /> Catalog New Spirit
              </h3>
              <form onSubmit={handleAddProductSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <input placeholder="Product Name" className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-white font-bold" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
                 <select className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-white font-bold" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <select className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-white font-bold" value={newProduct.volume} onChange={e => setNewProduct({...newProduct, volume: e.target.value})}>
                    {LIQUOR_VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
                 </select>
                 <input type="number" placeholder="Unit Price" className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-white font-bold" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value)})} required />
                 <input type="number" placeholder="Initial Stock" className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 text-white font-bold" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} required />
                 <button type="submit" className="vibrant-gradient text-white font-black rounded-2xl p-4 uppercase tracking-widest shadow-xl">Add to Vault</button>
              </form>
           </div>

           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <tr><th className="px-10 py-6">Product Details</th><th className="px-10 py-6">Inventory Status</th><th className="px-10 py-6">Pricing</th><th className="px-10 py-6 text-right">Control</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-900/20 transition-all">
                       <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                             <img src={p.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                             <div>
                                <p className="font-black dark:text-white text-lg leading-none">{p.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{p.volume}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                             <button onClick={() => updateStock(p.id, Math.max(0, p.stock - 1))} className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center hover:bg-red-500 transition-colors text-white font-black">-</button>
                             <span className="w-12 text-center font-black dark:text-white text-xl">{p.stock}</span>
                             <button onClick={() => updateStock(p.id, p.stock + 1)} className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center hover:bg-emerald-500 transition-colors text-white font-black">+</button>
                          </div>
                       </td>
                       <td className="px-10 py-8 font-black dark:text-white text-xl">Rs. {p.price.toLocaleString()}</td>
                       <td className="px-10 py-8 text-right">
                          <button onClick={() => deleteProduct(p.id)} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg"><Trash2 className="w-5 h-5" /></button>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;