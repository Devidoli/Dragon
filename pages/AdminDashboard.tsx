import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale } from '../types';
import { LIQUOR_VOLUMES, CATEGORIES } from '../constants';
import { Users, Package, TrendingUp, Plus, ArrowUpRight, Flame, Trash2, ShoppingCart, Upload, ShieldCheck, Clock, CheckCircle, RefreshCcw } from 'lucide-react';
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

  // Improved filtering for robustness
  const pendingUsers = useMemo(() => 
    users.filter(u => u.role === 'customer' && (u.status || '').toLowerCase() === 'pending'), 
  [users]);
  
  const approvedUsers = useMemo(() => 
    users.filter(u => u.role === 'customer' && (u.status || '').toLowerCase() === 'approved'), 
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
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProduct = () => {
    if (!newProduct.name || newProduct.price <= 0) return;
    addProduct({
      ...newProduct,
      id: `PROD-${Date.now()}`,
      image: newProduct.image || 'https://picsum.photos/seed/liquor/400/400'
    });
    setNewProduct({ name: '', category: 'Whisky', volume: 'Full (750ml)', price: 0, stock: 0, unit: 'Bottle', image: '' });
    setShowAddProductModal(false);
  };

  const saveSale = () => {
    if (!saleProduct) return;
    addCounterSale({
      id: `CS-${Date.now()}`,
      productId: saleProduct.id,
      productName: saleProduct.name,
      price: salePrice,
      quantity: saleQty,
      total: salePrice * saleQty,
      createdAt: new Date().toISOString()
    });
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
           {onRefresh && (
             <button onClick={handleManualRefresh} disabled={isRefreshing} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95 disabled:opacity-50">
               <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
             </button>
           )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '15px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#ef4444" fill="url(#clr)" strokeWidth={4} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'counter' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <button onClick={() => setShowCounterSaleModal(true)} className="bg-red-600 text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-4 shadow-2xl hover:bg-red-700 active:scale-95 transition-all text-xl uppercase">
            <Plus className="w-8 h-8" /> Record New Sale
          </button>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80">
                <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest"><th className="px-10 py-6">Time</th><th className="px-10 py-6">Item</th><th className="px-10 py-6 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                {(groupedSales[todayStr] || []).length > 0 ? (groupedSales[todayStr] || []).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5"><td className="px-10 py-8 font-bold text-slate-500">{new Date(s.createdAt).toLocaleTimeString()}</td><td className="px-10 py-8 font-bold dark:text-white">{s.productName}</td><td className="px-10 py-8 font-black text-red-500 text-right">Rs. {s.total.toLocaleString()}</td></tr>
                )) : (
                  <tr><td colSpan={3} className="px-10 py-20 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No terminal sales for today</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <button onClick={() => setShowAddProductModal(true)} className="bg-red-600 text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-4 shadow-2xl hover:bg-red-700 active:scale-95 transition-all text-xl uppercase">
            <Plus className="w-8 h-8" /> Add New Spirit
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl group">
                <div className="flex gap-8">
                  <img src={p.image} className="w-24 h-24 rounded-2xl object-cover shadow-lg" />
                  <div>
                    <h4 className="font-black text-2xl dark:text-white group-hover:text-red-600 transition-colors tracking-tight">{p.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{p.volume}</p>
                    <p className="text-xl font-black text-red-500 mt-2">Rs. {p.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => updateStock(p.id, p.stock + 12)} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors">Restock +12</button>
                  <button onClick={() => deleteProduct(p.id)} className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-16 animate-in fade-in duration-500">
          {/* Section 1: Pending Requests */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">New Applications</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Awaiting Access Approval</p>
              </div>
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
                        <button 
                          onClick={() => approveUser(c.id)}
                          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                          Approve Access
                        </button>
                        <Link to={`/admin/customer/${c.id}`} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 hover:text-white transition-all"><ArrowUpRight className="w-4 h-4" /></Link>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr><td colSpan={3} className="px-10 py-16 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No pending applications at the moment</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Approved Merchants */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <div>
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Verified Merchants</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Existing Distribution Partners</p>
              </div>
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
                        <span className="inline-flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> AUTHORIZED
                        </span>
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

      {/* Modals remain same, ensuring text is normal (no italics) */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowAddProductModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 p-10 space-y-8 overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black dark:text-white flex items-center gap-4 uppercase tracking-tighter"><Package className="text-red-600" /> Spirit Entry</h3>
            
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-6 bg-slate-50 dark:bg-slate-800/50 relative">
               {newProduct.image ? (
                 <img src={newProduct.image} className="h-40 w-40 object-cover rounded-xl shadow-xl" />
               ) : (
                 <Upload className="w-12 h-12 text-slate-500" />
               )}
               <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               <p className="mt-2 text-xs font-bold uppercase text-slate-400 tracking-widest">Upload Bottle Label</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <input type="text" placeholder="Brand Name" className="col-span-2 bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 dark:text-white font-bold" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              
              <select className="bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select className="bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.volume} onChange={e => setNewProduct({...newProduct, volume: e.target.value})}>
                {LIQUOR_VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              <input type="number" placeholder="Price (NPR)" className="bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
              <input type="number" placeholder="Initial Stock" className="bg-slate-100 dark:bg-slate-800 p-5 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
            </div>
            <button onClick={saveProduct} className="w-full bg-red-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl uppercase">Confirm Entry</button>
          </div>
        </div>
      )}

      {showCounterSaleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowCounterSaleModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 flex overflow-hidden min-h-[500px]">
            <div className="w-1/3 bg-slate-50 dark:bg-slate-950 p-8 border-r dark:border-white/5 overflow-y-auto">
              <input type="text" placeholder="Filter Vault..." className="w-full p-4 mb-6 rounded-xl bg-white dark:bg-slate-800 border-2 dark:border-slate-700 outline-none focus:border-red-600 dark:text-white font-bold" value={saleSearch} onChange={e => setSaleSearch(e.target.value)} />
              {products.filter(p => p.name.toLowerCase().includes(saleSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => { setSaleProduct(p); setSalePrice(p.price); }} className={`w-full text-left p-5 rounded-2xl mb-2 transition-all border-2 ${saleProduct?.id === p.id ? 'border-red-600 bg-red-600/10' : 'border-transparent bg-white dark:bg-slate-800 shadow-sm'}`}>
                  <p className="font-bold dark:text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.volume}</p>
                </button>
              ))}
            </div>
            <div className="flex-1 p-12 flex flex-col justify-between">
              {saleProduct ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <h3 className="text-4xl font-black text-red-600 tracking-tighter uppercase">Terminal Invoice</h3>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-6 shadow-inner border dark:border-white/5">
                    <img src={saleProduct.image} className="w-20 h-20 rounded-xl shadow-md" />
                    <div><p className="font-black text-2xl dark:text-white tracking-tight">{saleProduct.name}</p><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{saleProduct.volume}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Net Price</p><input type="number" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-2xl text-red-600 shadow-sm border dark:border-white/5" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
                    <div><p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Quantity</p><input type="number" className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-2xl dark:text-white shadow-sm border dark:border-white/5" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div>
                  </div>
                  <div className="pt-8 border-t dark:border-white/5 flex items-end justify-between">
                    <div><p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Payable</p><p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Rs. {(salePrice * saleQty).toLocaleString()}</p></div>
                    <button onClick={saveSale} className="bg-red-600 text-white px-10 py-5 rounded-[2rem] font-black text-xl hover:bg-red-700 active:scale-95 shadow-xl uppercase">Complete Sale</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 uppercase font-black gap-6 opacity-30"><ShoppingCart className="w-24 h-24" /> Select Spirit to Start</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;