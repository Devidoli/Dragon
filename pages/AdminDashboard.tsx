import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale } from '../types.ts';
import { LIQUOR_VOLUMES } from '../constants.ts';
import { Users, Package, TrendingUp, CheckCircle, Clock, Plus, ArrowUpRight, Search, Flame, Mail, Image as ImageIcon, X, Trash2, ShoppingCart, Calendar, History, ChevronRight, ArrowLeft, AlertTriangle, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';

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
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, products, orders, counterSales, approveUser, addProduct, deleteProduct, updateStock, addCounterSale }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'inventory' | 'counter'>('stats');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCounterSaleModal, setShowCounterSaleModal] = useState(false);
  
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  // Stats Logic
  const pendingUsers = users.filter(u => u.status === 'pending' && u.role !== 'admin');
  const allCustomers = users.filter(u => u.role === 'customer');
  const totalOrderSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalCounterSales = counterSales.reduce((sum, s) => sum + s.total, 0);
  const totalSales = totalOrderSales + totalCounterSales;

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock < 20).sort((a, b) => a.stock - b.stock);
  }, [products]);

  const todayStr = new Date().toDateString();
  
  const groupedSales = useMemo(() => {
    const groups: Record<string, CounterSale[]> = {};
    counterSales.forEach(sale => {
      const d = new Date(sale.createdAt).toDateString();
      if (!groups[d]) groups[d] = [];
      groups[d].push(sale);
    });
    return groups;
  }, [counterSales]);

  const historyDates = useMemo(() => {
    return Object.keys(groupedSales)
      .filter(d => d !== todayStr)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedSales, todayStr]);

  const currentViewSales = useMemo(() => {
    const dateToView = selectedHistoryDate || todayStr;
    return groupedSales[dateToView] || [];
  }, [groupedSales, selectedHistoryDate, todayStr]);

  // Analytics Logic
  const salesTrends = useMemo(() => {
    const data = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const onlineTotal = orders.filter(o => new Date(o.createdAt).toDateString() === ds).reduce((s,o) => s+o.total, 0);
      const counterTotal = counterSales.filter(s => new Date(s.createdAt).toDateString() === ds).reduce((s,x) => s+x.total, 0);
      data.push({ 
        day: d.toLocaleDateString([], { weekday: 'short' }), 
        revenue: onlineTotal + counterTotal
      });
    }
    return data;
  }, [orders, counterSales]);

  const categoryMix = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => o.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || 'General';
        map[cat] = (map[cat] || 0) + (item.price * item.quantity);
    }));
    counterSales.forEach(s => {
        const prod = products.find(p => p.id === s.productId);
        const cat = prod?.category || 'Counter Sale';
        map[cat] = (map[cat] || 0) + s.total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders, counterSales, products]);

  const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899'];

  // Add Product Form Logic
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    category: 'Whisky', 
    volume: 'Full (750ml)', 
    price: 0, 
    stock: 0, 
    unit: 'Bottle', 
    image: '',
    customVolume: '' 
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSaveProduct = () => {
    const volumeValue = newProduct.volume === 'Custom' ? newProduct.customVolume : newProduct.volume;
    const product: Product = {
      ...newProduct,
      volume: volumeValue,
      id: `PROD-${Date.now()}`
    };
    addProduct(product);
    setNewProduct({ name: '', category: 'Whisky', volume: 'Full (750ml)', price: 0, stock: 0, unit: 'Bottle', image: '', customVolume: '' });
    setShowAddProductModal(false);
  };

  // Add Counter Sale Logic
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [salePrice, setSalePrice] = useState(0);
  const [saleQty, setSaleQty] = useState(1);
  const [saleSearch, setSaleSearch] = useState('');

  const filteredInventory = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(saleSearch.toLowerCase()));
  }, [products, saleSearch]);

  const selectProductForSale = (p: Product) => {
    setSaleProduct(p);
    setSalePrice(p.price); 
    setSaleQty(1);
  };

  const handleSaveCounterSale = () => {
    if (!saleProduct) return;
    const sale: CounterSale = {
      id: `CS-${Date.now()}`,
      productId: saleProduct.id,
      productName: saleProduct.name,
      price: salePrice,
      quantity: saleQty,
      total: salePrice * saleQty,
      createdAt: new Date().toISOString()
    };
    addCounterSale(sale);
    setSaleProduct(null);
    setSalePrice(0);
    setSaleQty(1);
    setSaleSearch('');
    setShowCounterSaleModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black dark:text-white tracking-tighter flex items-center gap-4 text-slate-900">
            <Flame className="text-red-600 w-12 h-12" /> Control Center
          </h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs mt-2">Logistics & Merchant Verification</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800/50 backdrop-blur p-2 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide shadow-xl">
          {[
            { id: 'stats', label: 'Analytics', icon: TrendingUp },
            { id: 'counter', label: 'In-Store', icon: ShoppingCart },
            { id: 'users', label: 'Merchants', icon: Users },
            { id: 'inventory', label: 'Inventory', icon: Package }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedHistoryDate(null);
              }}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all text-xs uppercase tracking-widest whitespace-nowrap ${
                activeTab === tab.id ? 'vibrant-gradient text-white shadow-2xl' : 'text-slate-400 hover:text-red-500'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'stats' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border-t-8 border-red-600 shadow-xl">
              <TrendingUp className="text-red-600 w-12 h-12 mb-6" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Gross Revenue</p>
              <p className="text-4xl font-black dark:text-white text-slate-900 mt-2 tracking-tighter">Rs. {totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border-t-8 border-amber-500 shadow-xl">
              <ShoppingCart className="text-amber-500 w-12 h-12 mb-6" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Counter Volume</p>
              <p className="text-4xl font-black dark:text-white text-slate-900 mt-2 tracking-tighter">Rs. {totalCounterSales.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border-t-8 border-violet-600 shadow-xl">
              <Users className="text-violet-600 w-12 h-12 mb-6" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">Active Partners</p>
              <p className="text-4xl font-black dark:text-white text-slate-900 mt-2 tracking-tighter">{allCustomers.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border-t-8 border-emerald-500 shadow-xl relative overflow-hidden">
              <Package className="text-emerald-500 w-12 h-12 mb-6" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">SKU Count</p>
              <p className="text-4xl font-black dark:text-white text-slate-900 mt-2 tracking-tighter">{products.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-12 rounded-[3rem] shadow-xl">
              <h3 className="text-2xl font-black dark:text-white text-slate-900 mb-12 flex items-center gap-4">
                <TrendingUp className="text-red-600" /> Revenue Stream
              </h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrends}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem', color: 'white' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#ef4444" fillOpacity={1} fill="url(#colorRev)" strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] shadow-xl">
              <h3 className="text-2xl font-black dark:text-white text-slate-900 mb-10 flex items-center gap-4">
                <PieChartIcon className="text-violet-600" /> Distribution
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryMix}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryMix.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem', color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 space-y-3">
                {categoryMix.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between border-b dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{c.name}</span>
                    </div>
                    <span className="text-sm font-black dark:text-white text-slate-900">Rs. {c.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Counter Sales Tab */}
      {activeTab === 'counter' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <h2 className="text-4xl font-black dark:text-white text-slate-900 flex items-center gap-4 tracking-tight">
              <ShoppingCart className="w-10 h-10 text-amber-500" /> Counter Terminal
            </h2>
            <button onClick={() => setShowCounterSaleModal(true)} className="vibrant-gradient text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-4 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl">
              <Plus className="w-8 h-8" /> Record New Sale
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                  <History className="w-5 h-5 text-red-500" /> Sale History
                </h3>
                <div className="space-y-3">
                  {historyDates.map(date => (
                    <button key={date} onClick={() => setSelectedHistoryDate(date)} className={`w-full p-5 rounded-2xl text-left transition-all border-2 ${selectedHistoryDate === date ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-transparent bg-slate-50 dark:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-700'}`}>
                      <p className={`font-black text-sm ${selectedHistoryDate === date ? 'text-red-600' : 'dark:text-white text-slate-900'}`}>{date}</p>
                      <p className="text-[10px] font-black text-slate-500 uppercase mt-1">{groupedSales[date].length} Invoices Issued</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/80">
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">
                      <th className="px-10 py-6">Timestamp</th>
                      <th className="px-10 py-6">Spirit Description</th>
                      <th className="px-10 py-6">Batch Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                    {currentViewSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                        <td className="px-10 py-8 font-black text-slate-500 dark:text-slate-400 text-sm">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-10 py-8">
                          <p className="font-black text-xl dark:text-white text-slate-900">{sale.productName}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase">Rs. {sale.price.toLocaleString()} x {sale.quantity}</p>
                        </td>
                        <td className="px-10 py-8 font-black text-2xl text-red-600 dark:text-red-500 tracking-tighter">Rs. {sale.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    {currentViewSales.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-10 py-40 text-center text-slate-300 dark:text-slate-700 font-black uppercase tracking-widest text-3xl opacity-20 italic">No Sales Data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merchants Tab */}
      {activeTab === 'users' && (
        <div className="space-y-12">
          {pendingUsers.length > 0 && (
            <div className="space-y-8">
              <h2 className="text-4xl font-black text-red-600 flex items-center gap-4 tracking-tight">
                <Clock className="w-10 h-10" /> Pending Approval
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {pendingUsers.map(user => (
                  <div key={user.id} className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border-4 border-red-600/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-2 h-full vibrant-gradient"></div>
                    <div className="space-y-2 mb-8">
                      <h4 className="text-3xl font-black dark:text-white text-slate-900 tracking-tight leading-none group-hover:text-red-600 transition-colors">{user.shopName}</h4>
                      <p className="text-red-500 font-black flex items-center gap-2 text-xs uppercase tracking-widest"><Mail className="w-4 h-4" /> {user.email}</p>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-10 font-bold bg-slate-50 dark:bg-slate-900 p-6 rounded-[1.5rem] border dark:border-white/5">
                      {user.address}
                    </div>
                    <button onClick={() => approveUser(user.id)} className="w-full vibrant-gradient text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl">Grant Partnership</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h2 className="text-4xl font-black dark:text-white text-slate-900 flex items-center gap-4 tracking-tight">
                <Users className="w-10 h-10 text-red-600" /> Merchant Network
              </h2>
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-red-600 transition-colors" />
                <input type="text" placeholder="Search entity..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-800 border-2 dark:border-slate-700 rounded-[1.5rem] py-4 pl-16 pr-6 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none font-black text-slate-900 dark:text-white"/>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em]">
                    <th className="px-12 py-8">Merchant Entity</th>
                    <th className="px-12 py-8">Authorization</th>
                    <th className="px-12 py-8 text-right">Vault Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                  {allCustomers
                    .filter(c => c.shopName.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.includes(searchTerm))
                    .map(customer => (
                      <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                        <td className="px-12 py-10">
                          <p className="font-black dark:text-white text-slate-900 text-2xl tracking-tighter group-hover:text-red-600 transition-colors">{customer.shopName}</p>
                          <p className="text-xs text-slate-400 font-black uppercase tracking-[0.15em] mt-1">{customer.email}</p>
                        </td>
                        <td className="px-12 py-10">
                          <span className={`inline-block px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${customer.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>{customer.status}</span>
                        </td>
                        <td className="px-12 py-10 text-right">
                          <Link to={`/admin/customer/${customer.id}`} className="bg-slate-900 dark:bg-slate-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:vibrant-gradient hover:shadow-2xl transition-all inline-flex items-center gap-3">Audit Details <ArrowUpRight className="w-4 h-4" /></Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-4xl font-black dark:text-white text-slate-900 flex items-center gap-4 tracking-tight">
              <Package className="w-10 h-10 text-red-600" /> Spirits Vault
            </h2>
            <button onClick={() => setShowAddProductModal(true)} className="vibrant-gradient text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-4 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl">
              <Plus className="w-8 h-8" /> Add New Spirit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.map(product => (
              <div key={product.id} className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 hover:border-red-500 transition-all group shadow-xl">
                <div className="flex gap-8">
                  <div className="w-28 h-28 rounded-[2rem] overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-900 flex-shrink-0 group-hover:scale-110 transition-transform">
                    {product.image ? (
                      <img src={product.image} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-10 h-10" /></div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-black dark:text-white text-slate-900 text-2xl group-hover:text-red-600 transition-colors leading-tight">{product.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.volume} • {product.category}</p>
                    <p className="text-2xl font-black text-red-600 tracking-tighter mt-2">Rs. {product.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-10 space-y-5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Reserve</span>
                    <span className={`text-3xl font-black ${product.stock < 20 ? 'text-red-600 animate-pulse' : 'text-emerald-500'}`}>{product.stock} {product.unit}s</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-4 overflow-hidden shadow-inner border dark:border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${product.stock < 20 ? 'bg-red-600' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (product.stock / 200) * 100)}%` }}
                    />
                  </div>
                  <div className="flex gap-4 pt-6 border-t dark:border-white/5 border-slate-100">
                    <button onClick={() => updateStock(product.id, product.stock + 12)} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black transition-all hover:bg-slate-700 uppercase tracking-widest">Restock Case (+12)</button>
                    <button onClick={() => deleteProduct(product.id)} className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-6 h-6" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;