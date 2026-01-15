import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, Product, Order, AuthState, CounterSale } from './types.ts';
import { INITIAL_PRODUCTS } from './constants.ts';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Shop from './pages/Shop.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import CustomerDetails from './pages/CustomerDetails.tsx';
import { LogOut, Mail, LayoutDashboard, Flame, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('dragon_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('dragon_auth');
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('dragon_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('dragon_users');
    const defaultAdmins = ['admin@dragon.com', 'owner@dragon.com'];
    
    const initialUsers: User[] = defaultAdmins.map((email, index) => ({
      id: `admin-${index + 1}`,
      email: email,
      phone: '9800000000',
      shopName: 'Dragon Headquarters',
      address: 'Kathmandu, Nepal',
      role: 'admin',
      status: 'approved',
      createdAt: new Date().toISOString()
    }));

    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('dragon_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [counterSales, setCounterSales] = useState<CounterSale[]>(() => {
    const saved = localStorage.getItem('dragon_counter_sales');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('dragon_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dragon_auth', JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    localStorage.setItem('dragon_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('dragon_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('dragon_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('dragon_counter_sales', JSON.stringify(counterSales));
  }, [counterSales]);

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
  };

  const updateProductStock = (id: string, newStock: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
  };

  const addProduct = (p: Product) => {
    setProducts(prev => [...prev, p]);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const placeOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
    order.items.forEach(item => {
      setProducts(prev => prev.map(p => p.id === item.productId ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p));
    });
  };

  const addCounterSale = (sale: CounterSale) => {
    setCounterSales(prev => [sale, ...prev]);
    setProducts(prev => prev.map(p => p.id === sale.productId ? { ...p, stock: Math.max(0, p.stock - sale.quantity) } : p));
  };

  const approveUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
    if (auth.user?.id === userId) {
      setAuth(prev => ({ ...prev, user: { ...prev.user!, status: 'approved' } }));
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <Router>
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        {auth.isAuthenticated && (
          <nav className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-2xl">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 vibrant-gradient rounded-xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-amber-500">
                Dragon Suppliers
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                title="Toggle Dark/Light Mode"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
              </button>

              {auth.user?.role === 'admin' ? (
                <Link to="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                  <LayoutDashboard className="w-5 h-5 text-amber-500" />
                  <span className="hidden sm:inline font-medium">Admin</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800">
                  <Mail className="w-4 h-4 text-red-500" />
                  <span className="hidden sm:inline font-medium text-xs sm:text-sm">{auth.user?.email}</span>
                </div>
              )}
              
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </nav>
        )}

        <main className="flex-1">
          <Routes>
            <Route path="/login" element={
              auth.isAuthenticated ? <Navigate to="/" /> : <Login setAuth={setAuth} users={users} />
            } />
            <Route path="/signup" element={
              auth.isAuthenticated ? <Navigate to="/" /> : <Signup setAuth={setAuth} setUsers={setUsers} users={users} />
            } />
            <Route path="/" element={
              auth.isAuthenticated ? (
                auth.user?.role === 'admin' ? <Navigate to="/admin" /> : <Shop user={auth.user!} products={products} placeOrder={placeOrder} orders={orders} />
              ) : <Navigate to="/login" />
            } />
            <Route path="/admin" element={
              auth.isAuthenticated && auth.user?.role === 'admin' ? 
                <AdminDashboard 
                  users={users} 
                  products={products} 
                  orders={orders} 
                  counterSales={counterSales}
                  approveUser={approveUser} 
                  addProduct={addProduct} 
                  deleteProduct={deleteProduct}
                  updateStock={updateProductStock} 
                  addCounterSale={addCounterSale}
                /> 
                : <Navigate to="/login" />
            } />
            <Route path="/admin/customer/:id" element={
              auth.isAuthenticated && auth.user?.role === 'admin' ? 
                <CustomerDetails users={users} orders={orders} /> 
                : <Navigate to="/login" />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;