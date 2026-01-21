import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, Product, Order, CounterSale } from '../types';
import { LIQUOR_VOLUMES, CATEGORIES } from '../constants';
import { Users, Package, TrendingUp, Plus, ArrowUpRight, Flame, Trash2, ShoppingCart, Upload } from 'lucide-react';
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
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, products, orders, counterSales, approveUser, addProduct, deleteProduct, updateStock, addCounterSale }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'inventory' | 'counter'>('stats');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCounterSaleModal, setShowCounterSaleModal] = useState(false);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  const pendingUsers = users.filter(u => u.status === 'pending' && u.role !== 'admin');
  const allCustomers = users.filter(u => u.role === 'customer');
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
        <div>
          <h1 className="text-5xl font-black dark:text-white flex items-center gap-4 text-slate-900 tracking-tighter">
            <Flame className="text-red-600 w-12 h-12" /> Control Center
          </h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs mt-2 italic">Official Dashboard</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800/50 backdrop-blur p-2 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-x-auto">
          {[
            { id: 'stats', label: 'Analytics', icon: TrendingUp },
            { id: 'counter', label: 'In-Store', icon: ShoppingCart },
            { id: 'users', label: 'Merchants', icon: Users },
            { id: 'inventory', label: 'Inventory', icon: Package }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all text-xs uppercase tracking-widest ${activeTab === tab.id ? 'vibrant-gradient text-white shadow-lg scale-105' : 'text-slate-400 hover:text-red-500'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border-t-8 border-red-600 shadow-xl">
            <TrendingUp className="text-red-600 w-12 h-12 mb-6" />
            <p className="text-slate-400 text-[10px] font-black uppercase">Revenue</p>
            <p className="text-4xl font-black dark:text-white text-slate-900 mt-2">Rs. {totalSales.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] lg:col-span-3 shadow-xl h-[400px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrends}>
                  <defs><linearGradient id="clr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" /> <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#ef4444" fill="url(#clr)" strokeWidth={4} />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'counter' && (
        <div className="space-y-8 animate-in fade-in">
          <button onClick={() => setShowCounterSaleModal(true)} className="vibrant-gradient text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-4 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl">
            <Plus className="w-8 h-8" /> Record New Sale
          </button>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80">
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest"><th className="px-10 py-6">Time</th><th className="px-10 py-6">Item</th><th className="px-10 py-6 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-slate-100">
                {(groupedSales[selectedHistoryDate || todayStr] || []).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5"><td className="px-10 py-8 font-black text-slate-500">{new Date(s.createdAt).toLocaleTimeString()}</td><td className="px-10 py-8 font-black dark:text-white">{s.productName}</td><td className="px-10 py-8 font-black text-red-500 text-right">Rs. {s.total.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-10 animate-in fade-in">
          <button onClick={() => setShowAddProductModal(true)} className="vibrant-gradient text-white px-10 py-5 rounded-[2rem] font-black flex items-center gap-4 shadow-2xl hover:scale-105 active:scale-95 transition-all text-xl">
            <Plus className="w-8 h-8" /> Add New Spirit
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl group">
                <div className="flex gap-8">
                  <img src={p.image} className="w-24 h-24 rounded-2xl object-cover" />
                  <div>
                    <h4 className="font-black text-2xl dark:text-white group-hover:text-red-600 transition-colors">{p.name}</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase">{p.volume}</p>
                    <p className="text-xl font-black text-red-500 mt-2">Rs. {p.price}</p>
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => updateStock(p.id, p.stock + 12)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase">Restock +12</button>
                  <button onClick={() => deleteProduct(p.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8 animate-in fade-in">
          <h2 className="text-3xl font-black dark:text-white flex items-center gap-4">Merchant Database</h2>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr className="text-slate-400 text-[10px] font-black uppercase"><th className="px-10 py-6">Shop</th><th className="px-10 py-6">Status</th><th className="px-10 py-6 text-right">Audit</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {allCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                      <td className="px-10 py-8 font-black dark:text-white">{c.shopName}</td>
                      <td className="px-10 py-8 uppercase text-[10px] font-black"><span className={c.status === 'approved' ? 'text-green-500' : 'text-red-500'}>{c.status}</span></td>
                      <td className="px-10 py-8 text-right"><Link to={`/admin/customer/${c.id}`} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg inline-block"><ArrowUpRight className="w-4 h-4 text-red-500" /></Link></td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {showAddProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowAddProductModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 p-10 space-y-8 overflow-y-auto max-h-[90vh]">
            <h3 className="text-3xl font-black dark:text-white flex items-center gap-4"><Package className="text-red-600" /> Spirit Entry</h3>
            
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl p-6 bg-slate-50 dark:bg-slate-800/50 relative">
               {newProduct.image ? (
                 <img src={newProduct.image} className="h-40 w-40 object-cover rounded-xl" />
               ) : (
                 <Upload className="w-12 h-12 text-slate-500" />
               )}
               <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               <p className="mt-2 text-xs font-black uppercase text-slate-400">Upload Bottle Label</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <input type="text" placeholder="Brand Name" className="col-span-2 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-red-500 dark:text-white font-bold" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              
              <select className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.volume} onChange={e => setNewProduct({...newProduct, volume: e.target.value})}>
                {LIQUOR_VOLUMES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>

              <input type="number" placeholder="Price (NPR)" className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
              <input type="number" placeholder="Initial Stock" className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl outline-none font-bold dark:text-white" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
            </div>
            <button onClick={saveProduct} className="w-full vibrant-gradient text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl">Confirm Addition</button>
          </div>
        </div>
      )}

      {showCounterSaleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowCounterSaleModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 flex overflow-hidden min-h-[500px]">
            <div className="w-1/3 bg-slate-50 dark:bg-slate-950 p-8 border-r dark:border-white/5 overflow-y-auto">
              <input type="text" placeholder="Filter Vault..." className="w-full p-3 mb-6 rounded-xl bg-white dark:bg-slate-800 border-2 dark:border-slate-700 outline-none focus:border-amber-500 dark:text-white font-bold" value={saleSearch} onChange={e => setSaleSearch(e.target.value)} />
              {products.filter(p => p.name.toLowerCase().includes(saleSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => { setSaleProduct(p); setSalePrice(p.price); }} className={`w-full text-left p-4 rounded-2xl mb-2 transition-all border-2 ${saleProduct?.id === p.id ? 'border-amber-500 bg-amber-500/10' : 'border-transparent bg-white dark:bg-slate-800'}`}>
                  <p className="font-black dark:text-white">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase">{p.volume}</p>
                </button>
              ))}
            </div>
            <div className="flex-1 p-12 flex flex-col justify-between">
              {saleProduct ? (
                <div className="space-y-8 animate-in fade-in">
                  <h3 className="text-4xl font-black text-amber-500 tracking-tighter">Terminal Invoice</h3>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center gap-6">
                    <img src={saleProduct.image} className="w-20 h-20 rounded-xl" />
                    <div><p className="font-black text-2xl dark:text-white">{saleProduct.name}</p><p className="text-xs text-slate-400 uppercase font-black">{saleProduct.volume}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div><p className="text-[10px] font-black uppercase text-slate-400 mb-2">Unit Price</p><input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-2xl text-amber-500" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
                    <div><p className="text-[10px] font-black uppercase text-slate-400 mb-2">Quantity</p><input type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black text-2xl dark:text-white" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div>
                  </div>
                  <div className="pt-8 border-t dark:border-white/5 flex items-end justify-between">
                    <div><p className="text-[10px] font-black uppercase text-slate-400">Net Payable</p><p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Rs. {(salePrice * saleQty).toLocaleString()}</p></div>
                    <button onClick={saveSale} className="bg-amber-500 text-white px-10 py-5 rounded-[2rem] font-black text-xl hover:scale-105 active:scale-95 shadow-xl">Complete Sale</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 uppercase font-black gap-4"><ShoppingCart className="w-24 h-24" /> Select Spirit to Start</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;