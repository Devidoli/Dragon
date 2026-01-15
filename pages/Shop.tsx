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
    setTimeout(() => setIsOrdered(false), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {user.status === 'pending' && (
        <div className="mb-8 p-6 glass border-l-4 border-red-600 bg-red-600/10 rounded-[2rem] flex items-start gap-4 animate-pulse">
          <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div className="space-y-1">
            <h3 className="text-xl font-black text-red-500">Unverified Account</h3>
            <p className="text-slate-600 dark:text-slate-300">Welcome, <span className="text-red-600 dark:text-white font-bold">{user.shopName}</span>! Access is restricted until admin approval. Please wait for verification.</p>
          </div>
        </div>
      )}

      {isOrdered && lastOrder && (
        <div className="mb-8 p-6 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
            <div>
              <h3 className="text-xl font-bold text-green-500">Order Successful!</h3>
              <p className="text-slate-600 dark:text-slate-300">Order #{lastOrder.id} confirmed for COD.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <FileText className="w-5 h-5 text-red-500" />
            <span className="font-bold dark:text-white">Invoice</span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-8 mb-12">
        {/* Category Pill Navigation - Matching User's Provided Image */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-8 py-3 rounded-[1.25rem] font-black transition-all shadow-md text-sm whitespace-nowrap border-2 ${
                  filter === cat 
                    ? 'vibrant-gradient text-white border-transparent scale-105 shadow-red-500/30' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Quick search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-12 pr-4 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all font-bold dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Categorized Product Feed */}
      <div className="space-y-16 mb-24">
        {Object.entries(groupedProducts).map(([category, items]) => (
          <div key={category} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {category} <span className="text-red-600 font-black">.</span>
              </h2>
              <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {items.length} Products
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {items.map(product => (
                <div key={product.id} className="group bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-red-500 dark:hover:border-red-500/50 transition-all hover:shadow-[0_25px_60px_-15px_rgba(239,68,68,0.15)] hover:-translate-y-3 flex flex-col h-full">
                  <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-500/10">
                      {product.category}
                    </div>
                  </div>
                  <div className="p-7 space-y-5 flex flex-col flex-1">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-red-600 transition-colors line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{product.volume}</p>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{product.unit}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Unit Price</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Rs. {product.price.toLocaleString()}</span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-tighter ${product.stock > 10 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                        {product.stock} Left
                      </div>
                    </div>
                    <button
                      disabled={user.status !== 'approved' || product.stock === 0}
                      onClick={() => addToCart(product)}
                      className={`w-full py-4 rounded-[1.5rem] font-black flex items-center justify-center gap-2 transition-all ${
                        user.status === 'approved' && product.stock > 0
                          ? 'vibrant-gradient text-white shadow-xl active:scale-95 hover:shadow-red-500/30' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-700 cursor-not-allowed border-2 border-transparent'
                      }`}
                    >
                      <Plus className="w-5 h-5" /> Add to Batch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedProducts).length === 0 && (
          <div className="text-center py-40 glass rounded-[3rem] border-dashed border-2">
            <Package className="w-20 h-20 text-slate-300 dark:text-slate-800 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-400">No stock found matching your search.</h3>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-8 right-8 vibrant-gradient text-white p-6 rounded-[2.5rem] shadow-[0_30px_60px_-10px_rgba(239,68,68,0.6)] flex items-center gap-4 animate-bounce hover:scale-105 active:scale-95 transition-all z-40 border-4 border-white/20 dark:border-slate-900/20"
        >
          <div className="relative">
            <ShoppingCart className="w-8 h-8" />
            <span className="absolute -top-3 -right-3 bg-white text-red-600 w-8 h-8 rounded-full text-xs font-black flex items-center justify-center shadow-lg">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <div className="text-left border-l border-white/20 pl-4">
            <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Bill Estimate</p>
            <p className="font-black text-2xl tracking-tighter">Rs. {cartTotal.toLocaleString()}</p>
          </div>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b dark:border-white/10 flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Flame className="text-red-600 w-8 h-8" /> Your Batch
              </h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between gap-4 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border dark:border-white/5">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{item.name}</h4>
                    <p className="text-slate-400 text-xs font-bold">{item.volume}</p>
                    <p className="text-red-600 font-black mt-2">Rs. {item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm">
                    <button onClick={() => updateCartQuantity(item.productId, -1)} className="p-1 hover:text-red-500 transition-colors">
                      <Minus className="w-5 h-5 dark:text-white" />
                    </button>
                    <span className="w-8 text-center font-black text-xl dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateCartQuantity(item.productId, 1)} className="p-1 hover:text-green-500 transition-colors">
                      <Plus className="w-5 h-5 dark:text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 border-t dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-slate-400 font-black uppercase text-[10px] tracking-widest">
                  <span>Batch Subtotal</span>
                  <span>Rs. {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="font-black text-xl dark:text-white">Payable Amount</span>
                  <span className="text-4xl font-black text-red-600 tracking-tighter">Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={cart.length === 0}
                className="w-full vibrant-gradient text-white font-black py-5 rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-2xl"
              >
                Place COD Order
              </button>
              <p className="text-center text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Authentic B2B Distro Nepal</p>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && lastOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowInvoiceModal(false)} />
          <div className="relative bg-white text-slate-900 rounded-[2.5rem] overflow-hidden max-w-2xl w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="max-h-[80vh] overflow-y-auto">
              <Invoice order={lastOrder} user={user} />
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-4 border-t">
              <button 
                onClick={() => window.print()}
                className="px-6 py-3 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-lg"
              >
                Print Invoice
              </button>
              <button 
                onClick={() => setShowInvoiceModal(false)}
                className="px-6 py-3 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all"
              >
                Close Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;