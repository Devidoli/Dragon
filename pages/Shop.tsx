import React, { useState, useMemo } from 'react';
import { User, Product, Order, OrderItem } from '../types.ts';
import { CATEGORIES } from '../constants.ts';
import { ShoppingCart, Package, Search, Plus, Minus, X, AlertCircle, CheckCircle2, FileText, Flame, Filter, ChevronRight } from 'lucide-react';
import Invoice from '../components/Invoice.tsx';

interface ShopProps {
  user: User;
  products: Product[];
  orders: Order[];
  placeOrder: (order: Order) => void;
}

const Shop: React.FC<ShopProps> = ({ user, products, placeOrder, orders }) => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesFilter = filter === 'All' || p.category === filter;
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [products, filter, search]);

  const groupedProducts = useMemo(() => {
    if (filter !== 'All') return { [filter]: filteredProducts };
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts, filter]);

  const addToCart = (product: Product) => {
    if (user.status !== 'approved') return;
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, volume: product.volume }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    const newOrder: Order = {
      id: `DRGN-${Date.now()}`,
      customerId: user.id,
      customerEmail: user.email,
      shopName: user.shopName,
      items: cart,
      total: cartTotal,
      status: 'pending',
      paymentMethod: 'COD',
      createdAt: new Date().toISOString()
    };
    placeOrder(newOrder);
    setLastOrder(newOrder);
    setCart([]);
    setIsOrdered(true);
    setShowCart(false);
    setTimeout(() => setIsOrdered(false), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      {user.status === 'pending' && (
        <div className="mb-8 p-8 glass border-l-8 border-red-600 bg-red-600/10 rounded-[2.5rem] flex items-start gap-6 animate-pulse shadow-2xl">
          <AlertCircle className="w-10 h-10 text-red-500 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-red-500 uppercase tracking-tighter">Verification in Progress</h3>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Welcome, <span className="text-red-600 dark:text-white font-black underline">{user.shopName}</span>. Your account is currently being audited by the Dragon Distribution network. Ordering is restricted until authorization is granted.</p>
          </div>
        </div>
      )}

      {isOrdered && lastOrder && (
        <div className="mb-8 p-8 bg-green-500/10 border-2 border-green-500/30 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top duration-700 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-green-500 rounded-2xl shadow-lg">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-green-500 tracking-tighter">Dispatch Confirmed!</h3>
              <p className="text-slate-600 dark:text-slate-300 font-bold uppercase tracking-widest text-xs">Batch #{lastOrder.id} is pending delivery.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-8 py-4 rounded-2xl transition-all border-2 border-slate-200 dark:border-slate-700 shadow-xl hover:scale-105 active:scale-95"
          >
            <FileText className="w-6 h-6 text-red-500" />
            <span className="font-black dark:text-white uppercase tracking-widest text-sm">Download Invoice</span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-8 mb-16">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto overflow-x-auto pb-4 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-10 py-4 rounded-[1.75rem] font-black transition-all shadow-xl text-sm whitespace-nowrap border-2 ${
                  filter === cat 
                    ? 'vibrant-gradient text-white border-transparent scale-110 shadow-red-500/40 z-10' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-red-600 transition-colors" />
            <input
              type="text"
              placeholder="Search spirits inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border-2 dark:border-slate-800 rounded-[2rem] py-4 pl-16 pr-8 focus:ring-8 focus:ring-red-500/5 focus:border-red-500 outline-none transition-all font-black dark:text-white shadow-2xl"
            />
          </div>
        </div>
      </div>

      <div className="space-y-24 mb-32">
        {/* Added explicit type cast to resolve 'unknown' type error for items in Object.entries */}
        {(Object.entries(groupedProducts) as [string, Product[]][]).map(([category, items]) => (
          <div key={category} className="space-y-10 animate-in fade-in slide-in-from-bottom-8">
            <div className="flex items-center gap-6">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                {category} <span className="text-red-600 font-black">.</span>
              </h2>
              <div className="h-1 flex-1 bg-slate-200 dark:bg-slate-800/50 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-100 dark:bg-slate-800 px-5 py-2 rounded-full border dark:border-white/5">
                {items.length} Batch SKUs
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {items.map(product => (
                <div key={product.id} className="group bg-white dark:bg-slate-800 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-white/5 hover:border-red-500 dark:hover:border-red-500/50 transition-all hover:shadow-[0_40px_80px_-20px_rgba(239,68,68,0.2)] hover:-translate-y-4 flex flex-col h-full shadow-xl">
                  <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900/50">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000" />
                    <div className="absolute top-6 right-6 px-4 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-500/20 shadow-xl">
                      {product.category}
                    </div>
                  </div>
                  <div className="p-8 space-y-6 flex flex-col flex-1">
                    <div className="space-y-1">
                      <h3 className="font-black text-2xl text-slate-900 dark:text-white group-hover:text-red-600 transition-colors line-clamp-1 tracking-tight">{product.name}</h3>
                      <div className="flex items-center gap-3">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{product.volume}</p>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{product.unit}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t dark:border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Cost</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Rs. {product.price.toLocaleString()}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest ${product.stock > 10 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                        {product.stock} Units
                      </div>
                    </div>
                    <button
                      disabled={user.status !== 'approved' || product.stock === 0}
                      onClick={() => addToCart(product)}
                      className={`w-full py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 transition-all text-lg shadow-2xl ${
                        user.status === 'approved' && product.stock > 0
                          ? 'vibrant-gradient text-white active:scale-95 hover:shadow-red-500/50' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-6 h-6" /> Add to Batch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedProducts).length === 0 && (
          <div className="text-center py-48 glass rounded-[4rem] border-dashed border-4 border-slate-200 dark:border-slate-800 shadow-inner">
            <Package className="w-24 h-24 text-slate-300 dark:text-slate-800 mx-auto mb-8 animate-bounce" />
            <h3 className="text-3xl font-black text-slate-400 uppercase tracking-widest">Zero Vault Matches.</h3>
            <p className="text-slate-500 font-bold mt-2 italic">Try a broader spirit description</p>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-10 right-10 vibrant-gradient text-white p-8 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(239,68,68,0.7)] flex items-center gap-6 animate-bounce hover:scale-110 active:scale-95 transition-all z-[100] border-8 border-white/20 dark:border-slate-900/30"
        >
          <div className="relative">
            <ShoppingCart className="w-10 h-10" />
            <span className="absolute -top-4 -right-4 bg-white text-red-600 w-10 h-10 rounded-full text-sm font-black flex items-center justify-center shadow-2xl border-4 border-red-500">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <div className="text-left border-l-2 border-white/30 pl-6">
            <p className="text-[10px] font-black uppercase opacity-80 tracking-[0.3em]">Batch Estimate</p>
            <p className="font-black text-3xl tracking-tighter">Rs. {cartTotal.toLocaleString()}</p>
          </div>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full flex flex-col shadow-[0_0_150px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-700 border-l dark:border-white/5">
            <div className="p-10 border-b dark:border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tighter">
                  <Flame className="text-red-600 w-10 h-10" /> Your Batch
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{user.shopName} Terminal</p>
              </div>
              <button onClick={() => setShowCart(false)} className="p-4 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[1.5rem] transition-all group">
                <X className="w-8 h-8 text-slate-400 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between gap-6 p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/40 border-2 dark:border-white/5 hover:border-red-500/20 transition-all shadow-xl group">
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white text-2xl tracking-tighter group-hover:text-red-500 transition-colors">{item.name}</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">{item.volume}</p>
                    <p className="text-red-600 font-black text-lg mt-3 tracking-tighter">Rs. {item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-[1.75rem] shadow-2xl border dark:border-white/5">
                    <button onClick={() => updateCartQuantity(item.productId, -1)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 rounded-xl transition-all">
                      <Minus className="w-6 h-6" />
                    </button>
                    <span className="w-10 text-center font-black text-2xl dark:text-white tracking-tighter">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.productId, 1)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-600 rounded-xl transition-all">
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <ShoppingCart className="w-32 h-32 text-slate-400 mb-6" />
                    <p className="text-xl font-black uppercase tracking-widest">Cart is Vacant</p>
                 </div>
              )}
            </div>

            <div className="p-10 border-t-8 border-slate-900 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 space-y-8 shadow-[0_-40px_80px_-20px_rgba(0,0,0,0.1)]">
              <div className="space-y-4">
                <div className="flex justify-between text-slate-400 font-black uppercase text-xs tracking-[0.2em]">
                  <span>Liquor Net Total</span>
                  <span>Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="font-black text-2xl dark:text-white tracking-tighter leading-none">Net Payable</span>
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest italic">Includes Distribution Fee</p>
                  </div>
                  <span className="text-6xl font-black text-red-600 tracking-tighter shadow-sm">Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={cart.length === 0}
                className="w-full vibrant-gradient text-white font-black py-7 rounded-[2.5rem] shadow-[0_30px_60px_-10px_rgba(239,68,68,0.5)] hover:scale-[1.03] active:scale-95 transition-all text-3xl tracking-tighter border-b-8 border-red-800"
              >
                Confirm Dispatch (COD)
              </button>
              <div className="flex items-center justify-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-center text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">Dragon Suppliers Official B2B Security</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && lastOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={() => setShowInvoiceModal(false)} />
          <div className="relative bg-white text-slate-900 rounded-[3rem] overflow-hidden max-w-3xl w-full shadow-[0_0_150px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500">
            <div className="max-h-[85vh] overflow-y-auto scrollbar-hide">
              <Invoice order={lastOrder} user={user} />
            </div>
            <div className="p-8 bg-slate-50 border-t flex flex-col sm:flex-row justify-end gap-6">
              <button 
                onClick={() => window.print()}
                className="px-12 py-5 bg-red-600 text-white font-black rounded-[1.75rem] hover:bg-red-700 transition-all shadow-2xl text-xl flex items-center justify-center gap-3"
              >
                <FileText className="w-6 h-6" /> Print Hardcopy
              </button>
              <button 
                onClick={() => setShowInvoiceModal(false)}
                className="px-12 py-5 bg-slate-900 text-white font-black rounded-[1.75rem] hover:bg-slate-700 transition-all text-xl"
              >
                Return to Shop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;