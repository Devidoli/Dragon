
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, Product, Order, AuthState, CounterSale, UserRole, UserStatus } from './types';
import { INITIAL_PRODUCTS, ADMIN_EMAILS } from './constants';
import { SupabaseService, SupabaseConfig } from './services';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Shop from './pages/Shop';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDetails from './pages/CustomerDetails';
import { LogOut, LayoutDashboard, Flame, Sun, Moon, Loader2, ShieldCheck, DatabaseZap } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('dragon_theme') as any) || 'dark');
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('dragon_auth');
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [counterSales, setCounterSales] = useState<CounterSale[]>([]);
  
  const refreshInterval = useRef<number | null>(null);

  const basename = window.location.hostname.includes('vercel.app') ? '/' : (
    window.location.pathname.length > 1 && window.location.pathname.includes('-') 
      ? window.location.pathname.split('/').slice(0, 2).join('/') 
      : '/'
  );

  // Removed products.length and users.length dependencies to prevent synchronization loops
  const refreshData = useCallback(async () => {
    try {
      const fetchSafely = async (table: string) => {
        try { 
          return await SupabaseService.fetchTable(table); 
        } catch (e) { 
          console.warn(`Fetch failed for ${table}:`, e); 
          return []; 
        }
      };

      const [p, u, o, cs] = await Promise.all([
        fetchSafely('products'),
        fetchSafely('users'),
        fetchSafely('orders'),
        fetchSafely('counter_sales')
      ]);

      const processedUsers: User[] = u.map((user: User) => {
        if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
          return { ...user, role: 'admin' as UserRole, status: 'approved' as UserStatus };
        }
        return user;
      });

      // Update state if data exists, or fall back to defaults
      setProducts(p.length > 0 ? p : (products.length === 0 ? INITIAL_PRODUCTS : products));
      setUsers(processedUsers);
      setOrders(o);
      setCounterSales(cs);
    } catch (err) {
      console.error("Critical error during data refresh:", err);
    }
  }, []); // Static callback to prevent infinite loops

  useEffect(() => {
    const init = async () => {
      await refreshData();
      setLoading(false);
    };
    init();
    
    // Refresh every 30 seconds for Admin panel visibility
    refreshInterval.current = window.setInterval(refreshData, 30000);
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [refreshData]);

  useEffect(() => {
    localStorage.setItem('dragon_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dragon_auth', JSON.stringify(auth));
  }, [auth]);

  const handleLogout = () => {
    localStorage.removeItem('dragon_auth');
    setAuth({ user: null, isAuthenticated: false });
  };

  const updateProductStock = async (id: string, newStock: number) => {
    const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
    setProducts(updated);
    await SupabaseService.update('products', id, { stock: newStock });
  };

  const addProduct = async (p: Product) => {
    setProducts(prev => [...prev, p]);
    await SupabaseService.upsert('products', p);
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await SupabaseService.delete('products', id);
  };

  const placeOrder = async (order: Order) => {
    setOrders(prev => [order, ...prev]);
    const success = await SupabaseService.upsert('orders', order);
    if (success) {
      for (const item of order.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          await updateProductStock(prod.id, newStock);
        }
      }
      await refreshData();
    }
  };

  const addCounterSale = async (sale: CounterSale) => {
    setCounterSales(prev => [sale, ...prev]);
    const success = await SupabaseService.upsert('counter_sales', sale);
    if (success) {
      const prod = products.find(p => p.id === sale.productId);
      if (prod) {
        const newStock = Math.max(0, prod.stock - sale.quantity);
        await updateProductStock(prod.id, newStock);
      }
      await refreshData();
    }
  };

  const approveUser = async (userId: string) => {
    const success = await SupabaseService.update('users', userId, { status: 'approved' });
    if (success) {
      await refreshData();
      return true;
    }
    return false;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
      <div className="relative">
        <div className="absolute inset-0 bg-red-600/30 blur-3xl animate-pulse"></div>
        <div className="p-8 bg-red-600 rounded-[2.5rem] shadow-2xl relative">
          <Flame className="w-16 h-16 text-white animate-bounce" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-white font-black text-2xl tracking-tighter uppercase">Dragon Hub</h2>
        <div className="flex items-center gap-2 justify-center">
           <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
           <span className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Syncing Terminal...</span>
        </div>
      </div>
    </div>
  );

  return (
    <Router basename={basename}>
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        {!SupabaseConfig.isConfigured && (
          <div className="bg-red-600/10 border-b border-red-500/20 py-2 px-6 flex items-center justify-center gap-3">
            <DatabaseZap className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Demo Mode: Database Credentials Missing. Data persists locally only.</span>
          </div>
        )}

        {auth.isAuthenticated && (
          <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 glass shadow-2xl">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-red-600 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="text-xl font-black tracking-tighter text-white uppercase">Dragon Suppliers</span>
                <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-red-500">Official B2B</span>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {auth.user?.role === 'admin' ? (
                <Link to="/admin" className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black text-white transition-all shadow-xl hover:-translate-y-1">
                  <LayoutDashboard className="w-4 h-4 text-orange-500" />
                  <span>ADMIN PANEL</span>
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 border border-white/5 rounded-2xl shadow-inner">
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px] tracking-widest uppercase">{auth.user?.shopName}</span>
                </div>
              )}
              
              <button onClick={handleLogout} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-lg active:scale-90">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
        )}

        <main className="flex-1">
          <Routes>
            <Route path="/login" element={auth.isAuthenticated ? <Navigate to="/" /> : <Login setAuth={setAuth} users={users} />} />
            <Route path="/signup" element={auth.isAuthenticated ? <Navigate to="/" /> : <Signup setAuth={setAuth} setUsers={setUsers} users={users} />} />
            <Route path="/" element={auth.isAuthenticated ? (auth.user?.role === 'admin' ? <Navigate to="/admin" /> : <Shop user={auth.user!} products={products} placeOrder={placeOrder} orders={orders} />) : <Navigate to="/login" />} />
            <Route path="/admin" element={auth.isAuthenticated && auth.user?.role === 'admin' ? <AdminDashboard users={users} products={products} orders={orders} counterSales={counterSales} approveUser={approveUser} addProduct={addProduct} deleteProduct={deleteProduct} updateStock={updateProductStock} addCounterSale={addCounterSale} onRefresh={refreshData} /> : <Navigate to="/login" />} />
            <Route path="/admin/customer/:id" element={auth.isAuthenticated && auth.user?.role === 'admin' ? <CustomerDetails users={users} orders={orders} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
