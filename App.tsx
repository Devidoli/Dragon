
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, Product, Order, AuthState, CounterSale, UserRole, UserStatus, OrderStatus } from './types';
import { INITIAL_PRODUCTS, ADMIN_EMAILS } from './constants';
import { SupabaseService } from './services';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Shop from './pages/Shop';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDetails from './pages/CustomerDetails';
import { LogOut, Flame, Sun, Moon, Loader2 } from 'lucide-react';

const getBasename = () => {
  return window.location.hostname.includes('vercel.app') ? '/' : (
    window.location.pathname.length > 1 && window.location.pathname.includes('-') 
      ? window.location.pathname.split('/').slice(0, 2).join('/') 
      : '/'
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
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
  const isRefreshing = useRef(false);
  const lastRefreshTime = useRef<number>(parseInt(localStorage.getItem('dragon_last_refresh') || '0', 10));

  const basename = useMemo(() => getBasename(), []);

  const refreshData = useCallback(async (force = false) => {
    const now = Date.now();
    const globalLastRefresh = parseInt(localStorage.getItem('dragon_last_refresh') || '0', 10);
    
    // Prevent refreshes happening too close to each other (min 30s gap across tabs)
    if (!force && (now - globalLastRefresh < 30000)) return;
    if (isRefreshing.current) return;
    
    // Only refresh if tab is visible, unless forced
    if (!force && document.visibilityState !== 'visible') return;

    isRefreshing.current = true;
    lastRefreshTime.current = now;
    localStorage.setItem('dragon_last_refresh', now.toString());
    
    try {
      // Fetch sequentially to avoid burst rate limits
      const uRes = await SupabaseService.getTable('users');
      await new Promise(r => setTimeout(r, 200)); // Small gap
      const pRes = await SupabaseService.getTable('products');
      await new Promise(r => setTimeout(r, 200));
      const oRes = await SupabaseService.getTable('orders');
      await new Promise(r => setTimeout(r, 200));
      const cRes = await SupabaseService.getTable('counter_sales');

      if (uRes.error || pRes.error || oRes.error || cRes.error) {
        const firstError = uRes.error || pRes.error || oRes.error || cRes.error;
        setDbError(firstError);
        // Auto-clear error after 5 seconds so it's not sticky
        setTimeout(() => setDbError(null), 5000);
      } else {
        setDbError(null);
      }

      const uData = uRes.data as User[];
      const processedUsers: User[] = uData.map((user: User) => {
        if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
          return { ...user, role: 'admin' as UserRole, status: 'approved' as UserStatus };
        }
        return user;
      });

      setUsers(processedUsers);
      
      setProducts(prev => {
        if (pRes.data.length > 0) return pRes.data;
        return prev.length === 0 ? INITIAL_PRODUCTS : prev;
      });
      
      setOrders(oRes.data);
      setCounterSales(cRes.data);
    } catch (err) {
      console.error("Critical error during data refresh:", err);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  useEffect(() => {
    refreshData(true).then(() => setLoading(false));
    
    const interval = window.setInterval(() => refreshData(false), 300000); // 5 minutes
    refreshInterval.current = interval;
    
    // Also refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  const updateProduct = async (id: string, updates: Partial<Product>, skipRefresh = false) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    await SupabaseService.update('products', id, updates);
    if (!skipRefresh) await refreshData();
  };

  const updateProductStock = async (id: string, newStock: number, skipRefresh = false) => {
    await updateProduct(id, { stock: newStock }, skipRefresh);
  };

  const addProduct = async (p: Product) => {
    setProducts(prev => [...prev, p]);
    await SupabaseService.upsert('products', p);
    await refreshData();
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await SupabaseService.delete('products', id);
  };

  const placeOrder = async (order: Order) => {
    setOrders(prev => [order, ...prev]);
    const res = await SupabaseService.upsert('orders', order);
    if (res.success) {
      const stockUpdates: { id: string, data: any }[] = [];
      for (const item of order.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          stockUpdates.push({ id: prod.id, data: { stock: newStock } });
        }
      }
      if (stockUpdates.length > 0) {
        await SupabaseService.updateMany('products', stockUpdates);
      }
      await refreshData();
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const currentOrder = orders.find(o => o.id === orderId);
    
    // Auto-restock logic if order is cancelled
    if (status === 'cancelled' && currentOrder && currentOrder.status !== 'cancelled') {
        const stockUpdates: { id: string, data: any }[] = [];
        for (const item of currentOrder.items) {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                const newStock = prod.stock + item.quantity;
                stockUpdates.push({ id: prod.id, data: { stock: newStock } });
            }
        }
        if (stockUpdates.length > 0) {
            await SupabaseService.updateMany('products', stockUpdates);
        }
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    await SupabaseService.update('orders', orderId, { status });
    await refreshData();
  };

  const addCounterSale = async (sale: CounterSale) => {
    setCounterSales(prev => [sale, ...prev]);
    const res = await SupabaseService.upsert('counter_sales', sale);
    if (res.success) {
      const prod = products.find(p => p.id === sale.productId);
      if (prod) {
        const newStock = Math.max(0, prod.stock - sale.quantity);
        await updateProductStock(prod.id, newStock, true);
      }
      await refreshData();
    }
  };

  const deleteCounterSale = async (id: string) => {
    setCounterSales(prev => prev.filter(s => s.id !== id));
    await SupabaseService.delete('counter_sales', id);
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
      <div className="p-8 bg-red-600 rounded-[2.5rem] shadow-2xl relative">
        <Flame className="w-16 h-16 text-white animate-bounce" />
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-white font-black text-2xl tracking-tighter uppercase">Dragon Hub</h2>
        <Loader2 className="w-4 h-4 text-red-500 animate-spin mx-auto" />
      </div>
    </div>
  );

  return (
    <Router basename={basename}>
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        {auth.isAuthenticated && (
          <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 glass shadow-2xl">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-red-600 rounded-2xl shadow-lg">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tighter text-white uppercase">Dragon Suppliers</span>
            </Link>

            <div className="flex items-center gap-4">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 bg-white/5 rounded-2xl text-slate-400">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {auth.user?.role === 'admin' ? (
                <Link to="/admin" className="px-5 py-2.5 bg-slate-800 rounded-2xl text-xs font-black text-white">ADMIN PANEL</Link>
              ) : (
                <div className="px-4 py-2 bg-slate-900/50 rounded-2xl text-[10px] font-bold text-slate-300 uppercase tracking-widest">{auth.user?.shopName}</div>
              )}
              
              <button onClick={handleLogout} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
        )}

        <main className="flex-1">
          <Routes>
            <Route path="/login" element={auth.isAuthenticated ? <Navigate to="/" /> : <Login setAuth={setAuth} users={users} />} />
            <Route path="/signup" element={auth.isAuthenticated ? <Navigate to="/" /> : <Signup setAuth={setAuth} setUsers={setUsers} users={users} />} />
            <Route path="/" element={auth.isAuthenticated ? (auth.user?.role === 'admin' ? <Navigate to="/admin" /> : <Shop user={auth.user!} products={products} placeOrder={placeOrder} orders={orders} updateOrderStatus={updateOrderStatus} />) : <Navigate to="/login" />} />
            <Route path="/admin" element={auth.isAuthenticated && auth.user?.role === 'admin' ? <AdminDashboard users={users} products={products} orders={orders} counterSales={counterSales} approveUser={approveUser} addProduct={addProduct} deleteProduct={deleteProduct} updateStock={updateProductStock} updateProduct={updateProduct} addCounterSale={addCounterSale} deleteCounterSale={deleteCounterSale} updateOrderStatus={updateOrderStatus} onRefresh={refreshData} dbError={dbError} /> : <Navigate to="/login" />} />
            <Route path="/admin/customer/:id" element={auth.isAuthenticated && auth.user?.role === 'admin' ? <CustomerDetails users={users} orders={orders} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
