
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const basename = window.location.hostname.includes('vercel.app') ? '/' : (
    window.location.pathname.length > 1 && window.location.pathname.includes('-') 
      ? window.location.pathname.split('/').slice(0, 2).join('/') 
      : '/'
  );

  const refreshData = useCallback(async () => {
    try {
      const uRes = await SupabaseService.fetchTable('users');
      const pRes = await SupabaseService.fetchTable('products');
      const oRes = await SupabaseService.fetchTable('orders');
      const cRes = await SupabaseService.fetchTable('counter_sales');

      if (uRes.error) setDbError(uRes.error);
      else setDbError(null);

      const uData = uRes.data as User[];
      const processedUsers: User[] = uData.map((user: User) => {
        if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
          return { ...user, role: 'admin' as UserRole, status: 'approved' as UserStatus };
        }
        return user;
      });

      if (processedUsers.length === 0 && auth.user?.role === 'admin') {
         processedUsers.push(auth.user);
      }

      setUsers(processedUsers);
      setProducts(pRes.data.length > 0 ? pRes.data : (products.length === 0 ? INITIAL_PRODUCTS : products));
      setOrders(oRes.data);
      setCounterSales(cRes.data);
    } catch (err) {
      console.error("Critical error during data refresh:", err);
    }
  }, [auth.user, products.length]);

  useEffect(() => {
    const init = async () => {
      await refreshData();
      setLoading(false);
    };
    init();
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

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const currentOrder = orders.find(o => o.id === orderId);
    
    // Auto-restock logic if order is cancelled
    if (status === 'cancelled' && currentOrder && currentOrder.status !== 'cancelled') {
        for (const item of currentOrder.items) {
            const prod = products.find(p => p.id === item.productId);
            if (prod) {
                const newStock = prod.stock + item.quantity;
                await updateProductStock(prod.id, newStock);
            }
        }
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    await SupabaseService.update('orders', orderId, { status });
  };

  const addCounterSale = async (sale: CounterSale) => {
    setCounterSales(prev => [sale, ...prev]);
    const res = await SupabaseService.upsert('counter_sales', sale);
    if (res.success) {
      const prod = products.find(p => p.id === sale.productId);
      if (prod) {
        const newStock = Math.max(0, prod.stock - sale.quantity);
        await updateProductStock(prod.id, newStock);
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
            <Route path="/" element={auth.isAuthenticated ? (auth.user?.role === 'admin' ? <Navigate to="/admin" /> : <Shop user={auth.user!} products={products} placeOrder={placeOrder} orders={orders} />) : <Navigate to="/login" />} />
            <Route path="/admin" element={auth.isAuthenticated && auth.user?.role === 'admin' ? <AdminDashboard users={users} products={products} orders={orders} counterSales={counterSales} approveUser={approveUser} addProduct={addProduct} deleteProduct={deleteProduct} updateStock={updateProductStock} addCounterSale={addCounterSale} deleteCounterSale={deleteCounterSale} updateOrderStatus={updateOrderStatus} onRefresh={refreshData} dbError={dbError} /> : <Navigate to="/login" />} />
            <Route path="/admin/customer/:id" element={auth.isAuthenticated && auth.user?.role === 'admin' ? <CustomerDetails users={users} orders={orders} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
