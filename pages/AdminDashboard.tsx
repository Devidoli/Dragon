import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Product, Order, CounterSale, UserStatus } from '../types';
import { 
  Users, Package, TrendingUp, ArrowUpRight, Flame, 
  ShoppingCart, Clock, RefreshCcw, Loader2, Check, 
  Plus, Minus, Trash2, LayoutGrid, Search, AlertCircle, 
  DollarSign, Activity, X, Upload, ChevronRight, Edit3
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'inventory' | 'counter'>('stats');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // POS State
  const [posSearch, setPosSearch] = useState('');
  const [posCart, setPosCart] = useState<{product: Product, quantity: number, customPrice: number}[]>([]);
  
  // Product Expansion State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProd, setNewProd] = useState({ 
    name: '', category: 'Whisky', price: '', stock: '', volume: 'Full (750ml)', image: '' 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // POS Logic
  const filteredPOSProducts = useMemo(() => 
    products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()) && p.stock > 0),
  [products, posSearch]);

  const addToPOSCart = (p: Product) => {
    const existing = posCart.find(item => item.product.id === p.id);
    if (existing) {
      setPosCart(posCart.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setPosCart([...posCart, { product: p, quantity: 1, customPrice: p.price }]);
    }
    setPosSearch('');
  };

  const removeFromPOSCart = (id: string) => setPosCart(posCart.filter(i => i.product.id !== id));

  const updateCartItem = (id: string, updates: Partial<{quantity: number, customPrice: number}>) => {
    setPosCart(posCart.map(item => item.product.id === id ? { ...item, ...updates } : item));
  };

  const processPOSCheckout = async () => {
    if (posCart.length === 0) return;
    for (const item of posCart) {
      const sale: CounterSale = {
        id: `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: item.product.id,
        productName: item.product.name,
        price: item.customPrice,
        quantity: item.quantity,
        total: item.customPrice * item.quantity,
        createdAt: new Date().toISOString()
      };
      await addCounterSale(sale);
    }
    setPosCart([]);
    alert("Checkout Complete: Store Inventory Updated.");
  };

  // Product Expansion Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProd({ ...newProd, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Product = {
      id: `P-${Date.now()}`,
      name: newProd.name,
      category: newProd.category,
      price: Number(newProd.price),
      stock: Number(newProd.stock),
      volume: newProd.volume,
      image: newProd.image || 'https://picsum.photos/seed/spirit/400/400',
      unit: 'Bottle'
    };
    addProduct(p);
    setShowAddModal(false);
    setNewProd({ name: '', category: 'Whisky', price: '', stock: '', volume: 'Full (750ml)', image: '' });
  };

  // Stats Calculations
  const totalWholesale = orders.reduce((s, o) => s + o.total, 0);
  const totalCounter = counterSales.reduce((s, c) => s + c.total, 0);
  const totalRevenue = totalWholesale + totalCounter;
  const totalStockValue = products.reduce((s, p) => s + (p.price * p.stock), 0);

  const chartData = [
    { name: 'Wholesale', value: totalWholesale, color: '#dc2626' },
    { name: 'Store POS', value: totalCounter, color: '#d97706' }
  ];

  const pendingUsers = users.filter(u => u.role === 'customer' && (!u.status || u.status.toLowerCase() === 'pending'));
  const verifiedUsers = users.filter(u => u.role === 'customer' && u.status === 'approved');

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
            { id: 'counter', label: 'Store POS', icon: ShoppingCart },
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
              { label: 'Total Sales', value: `Rs. ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
              { label: 'Merchant Network', value: users.length, icon: Users, color: 'text-blue-500' },
              { label: 'Inventory Value', value: `Rs. ${totalStockValue.toLocaleString()}`, icon: Package, color: 'text-red-500' },
              { label: 'Units in Stock', value: products.reduce((s, p) => s + p.stock, 0), icon: LayoutGrid, color: 'text-orange-500' }
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
                <h3 className="text-3xl font-black text-white leading-tight tracking-tighter uppercase">Channel Mix</h3>
                <p className="text-red-200 text-xs font-bold leading-relaxed">Direct counter sales account for {((totalCounter / (totalRevenue || 1)) * 100).toFixed(1)}% of your revenue.</p>
              </div>
              <button onClick={() => setActiveTab('inventory')} className="mt-8 bg-white text-red-600 font-black px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                Manage Vault <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'counter' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in zoom-in-95 duration-500">
          {/* POS Catalog */}
          <div className="lg:col-span-1 space-y-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                value={posSearch}
                onChange={e => setPosSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-5 pl-14 pr-6 font-bold dark:text-white shadow-xl focus:ring-4 focus:ring-red-500/10"
              />
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {filteredPOSProducts.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => addToPOSCart(p)}
                  className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl flex items-center gap-4 border border-transparent hover:border-red-500 transition-all text-left group shadow-lg"
                >
                  <img src={p.image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                  <div className="flex-1">
                    <p className="font-black dark:text-white text-sm leading-tight">{p.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.volume} • Stock: {p.stock}</p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                </button>
              ))}
            </div>
          </div>

          {/* POS Cart/Billing */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border dark:border-white/5 shadow-2xl flex flex-col min-h-[600px]">
             <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Checkout Terminal</h2>
                <span className="bg-red-500/10 text-red-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{posCart.length} Items</span>
             </div>

             <div className="flex-1 space-y-6 overflow-y-auto pr-4 scrollbar-hide mb-8">
                {posCart.map(item => (
                  <div key={item.product.id} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border dark:border-white/5">
                    <div className="md:col-span-2">
                       <p className="font-black dark:text-white">{item.product.name}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase">{item.product.volume}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateCartItem(item.product.id, {quantity: Math.max(1, item.quantity - 1)})} className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400"><Minus className="w-3 h-3"/></button>
                      <span className="font-black dark:text-white w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartItem(item.product.id, {quantity: item.quantity + 1})} className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-400"><Plus className="w-3 h-3"/></button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500">Rs.</span>
                        <input 
                          type="number" 
                          value={item.customPrice}
                          onChange={e => updateCartItem(item.product.id, {customPrice: Number(e.target.value)})}
                          className="w-28 bg-white dark:bg-slate-900 border-none rounded-xl py-2 pl-9 text-right font-black dark:text-white text-xs"
                        />
                      </div>
                      <button onClick={() => removeFromPOSCart(item.product.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
                {posCart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-20 opacity-20">
                    <ShoppingCart className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase tracking-widest">Cart is Empty</p>
                  </div>
                )}
             </div>

             <div className="pt-8 border-t dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Payable</p>
                   <p className="text-5xl font-black text-red-600 tracking-tighter">
                     Rs. {posCart.reduce((s, i) => s + (i.customPrice * i.quantity), 0).toLocaleString()}
                   </p>
                </div>
                <button 
                  onClick={processPOSCheckout}
                  disabled={posCart.length === 0}
                  className="w-full md:w-auto px-12 py-5 bg-red-600 text-white font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  Finalize Billing
                </button>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-red-500" />
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Vault Management</h2>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Expand Inventory
              </button>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 dark:bg-slate-950/50">
                 <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                   <th className="px-10 py-6">Product</th>
                   <th className="px-10 py-6">Stock Status</th>
                   <th className="px-10 py-6">Wholesale Price</th>
                   <th className="px-10 py-6 text-right">Controls</th>
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
        <div className="space-y-16 animate-in fade-in duration-500">
          {/* Applications Queue */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-orange-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Authorization Queue</h2>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                    <th className="px-10 py-6">Shop Name</th>
                    <th className="px-10 py-6">Merchant Email</th>
                    <th className="px-10 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {pendingUsers.map(c => (
                    <tr key={c.id} className="hover:bg-orange-500/5 transition-all">
                      <td onClick={() => navigate(`/admin/customer/${c.id}`)} className="px-10 py-8 cursor-pointer">
                         <p className="font-black dark:text-white text-lg tracking-tight">{c.shopName || "Anonymous hub"}</p>
                         <p className="text-[10px] font-bold text-slate-500 uppercase">{c.address}</p>
                      </td>
                      <td className="px-10 py-8 text-sm font-bold text-slate-500">{c.email}</td>
                      <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleApprove(c.id)} 
                          disabled={approvingId === c.id}
                          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                          {approvingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve
                        </button>
                        <Link to={`/admin/customer/${c.id}`} className="p-4 bg-slate-800 rounded-2xl text-slate-400"><ArrowUpRight className="w-4 h-4"/></Link>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-16 text-center opacity-20 italic font-black uppercase tracking-widest">All applications processed</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verified Directory */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Check className="w-8 h-8 text-emerald-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Verified Partners</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {verifiedUsers.map(v => (
                <div 
                  key={v.id} 
                  onClick={() => navigate(`/admin/customer/${v.id}`)}
                  className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl hover:-translate-y-2 transition-all cursor-pointer group"
                >
                   <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                         <Users className="w-6 h-6 text-emerald-500" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                   </div>
                   <h4 className="font-black dark:text-white text-xl tracking-tight">{v.shopName}</h4>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 mb-4">{v.address}</p>
                   <div className="pt-4 border-t dark:border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant Profile</span>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest underline">View Orders</span>
                   </div>
                </div>
              ))}
              {verifiedUsers.length === 0 && <p className="col-span-full text-center py-10 opacity-20 italic font-black uppercase">No verified merchants yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Catalog Expansion Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl" onClick={() => setShowAddModal(false)} />
          <form onSubmit={handleSaveProduct} className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,1)] space-y-8 animate-in zoom-in-95">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Catalog Expansion</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-2 text-slate-400"><X /></button>
             </div>

             <div className="space-y-6">
                <div className="flex justify-center">
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full h-48 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-4 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
                   >
                      {newProd.image ? (
                        <img src={newProd.image} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-slate-300 group-hover:text-red-500 transition-colors mb-2" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Product Photo</p>
                        </>
                      )}
                   </div>
                   <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Name</label>
                   <input required value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="e.g. Signature Premier" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Spirit Type</label>
                      <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white">
                        {['Whisky', 'Vodka', 'Rum', 'Gin', 'Beer', 'Wine', 'Juice'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Volume</label>
                      <input required value={newProd.volume} onChange={e => setNewProd({...newProd, volume: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="750ml / 650ml / 1L" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Wholesale Price (Rs.)</label>
                      <input required type="number" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="0.00" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Initial Stock</label>
                      <input required type="number" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="Quantity" />
                   </div>
                </div>
             </div>

             <button type="submit" className="w-full py-5 bg-red-600 text-white font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
                Confirm & Add to Vault
             </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;