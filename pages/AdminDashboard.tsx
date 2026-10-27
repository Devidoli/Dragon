import React, { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Product, Order, CounterSale, OrderStatus, Expense, PaymentMethod } from '../types';
import ExpensesPanel from '../components/ExpensesPanel';
import { SupabaseService } from '../services';
import { 
  Users, Package, TrendingUp, ArrowUpRight, Flame, 
  ShoppingCart, Clock, RefreshCcw, Loader2, Check, 
  Plus, Minus, Trash2, LayoutGrid, Search, Edit,
  DollarSign, Activity, X, Upload, ChevronRight, Download, Eraser,
  FileText, History, CalendarDays, Truck, Boxes, ClipboardList, Filter, Wallet,
  QrCode, Banknote, ArrowLeftRight, Receipt, TrendingDown, Trophy, AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ---------- small helpers ----------
const LOW_STOCK_LIMIT = 10; // products with this many units or fewer are flagged on Analytics

const dayKey = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// How much of a POS row was paid in cash / by QR (older rows without payment info count as cash)
const cashOf = (s: CounterSale) =>
  s.paymentMethod ? (s.cashAmount ?? (s.paymentMethod === 'cash' ? s.total : 0)) : s.total;
const qrOf = (s: CounterSale) =>
  s.paymentMethod ? (s.qrAmount ?? (s.paymentMethod === 'qr' ? s.total : 0)) : 0;

interface Bill {
  key: string;
  createdAt: string;
  items: CounterSale[];
  total: number;
  cash: number;
  qr: number;
}
const billMethod = (b: { cash: number; qr: number }): PaymentMethod =>
  b.cash > 0 && b.qr > 0 ? 'split' : b.qr > 0 ? 'qr' : 'cash';

interface AdminDashboardProps {
  users: User[];
  products: Product[];
  orders: Order[];
  counterSales: CounterSale[];
  expenses: Expense[];
  addExpense: (e: Expense) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<void> | void;
  approveUser: (id: string) => Promise<boolean>;
  addProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  updateStock: (id: string, qty: number) => void;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  addCounterSale: (sale: CounterSale) => void;
  deleteCounterSale: (id: string) => void;
  addCounterSales: (sales: CounterSale[]) => Promise<'ok' | 'no-payment' | 'failed'>;
  deleteCounterSales: (ids: string[]) => Promise<void> | void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onRefresh?: () => void;
  dbError?: string | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, 
  products, 
  orders, 
  counterSales, 
  expenses,
  addExpense,
  deleteExpense,
  approveUser, 
  addProduct,
  deleteProduct,
  updateStock,
  updateProduct,
  addCounterSale,
  deleteCounterSale,
  addCounterSales,
  deleteCounterSales,
  updateOrderStatus,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'inventory' | 'counter' | 'expenses' | 'ledger' | 'orders'>('stats');
  const [orderFilter, setOrderFilter] = useState<OrderStatus | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Order Filter State
  const [orderCustomerSearch, setOrderCustomerSearch] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');

  // POS State
  const [posSearch, setPosSearch] = useState('');
  const [posCart, setPosCart] = useState<{product: Product, quantity: number, customPrice: number}[]>([]);
  const [posPayMethod, setPosPayMethod] = useState<PaymentMethod>('cash');
  const [posCashInput, setPosCashInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Analytics period
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today');
  
  // Vault Search State
  const [vaultSearch, setVaultSearch] = useState('');

  const filteredVaultProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(vaultSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(vaultSearch.toLowerCase())
    );
  }, [products, vaultSearch]);
  
  // Product Expansion State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
  // Units sold per product (store sales first, B2B orders break ties) so best sellers come first
  const soldByProduct = useMemo(() => {
    const store: Record<string, number> = {};
    const b2b: Record<string, number> = {};
    counterSales.forEach(s => { store[s.productId] = (store[s.productId] || 0) + s.quantity; });
    orders.forEach(o => {
      if (o.status === 'cancelled') return;
      o.items.forEach(i => { b2b[i.productId] = (b2b[i.productId] || 0) + i.quantity; });
    });
    return { store, b2b };
  }, [counterSales, orders]);

  const filteredPOSProducts = useMemo(() =>
    products
      .filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()) && p.stock > 0)
      .sort((a, b) =>
        (soldByProduct.store[b.id] || 0) - (soldByProduct.store[a.id] || 0) ||
        (soldByProduct.b2b[b.id] || 0) - (soldByProduct.b2b[a.id] || 0) ||
        a.name.localeCompare(b.name)
      ),
  [products, posSearch, soldByProduct]);

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

  const posTotal = posCart.reduce((sum, i) => sum + i.customPrice * i.quantity, 0);
  const splitCash = Math.min(Math.max(Number(posCashInput) || 0, 0), posTotal);
  const splitQr = round2(posTotal - splitCash);

  const processPOSCheckout = async () => {
    if (posCart.length === 0 || isCheckingOut) return;

    if (posPayMethod === 'split' && !(splitCash > 0 && splitCash < posTotal)) {
      alert('For a Cash + QR payment, enter the cash amount (more than 0 and less than the total). The rest is counted as QR.');
      return;
    }

    // One checkout = one bill: same bill id and same time for every item
    const now = new Date().toISOString();
    const stamp = Date.now();
    const billId = `BILL-${stamp}-${Math.random().toString(36).substr(2, 5)}`;
    let cashLeft = posPayMethod === 'cash' ? posTotal : posPayMethod === 'qr' ? 0 : splitCash;

    const sales: CounterSale[] = posCart.map((item, idx) => {
      const itemTotal = round2(item.customPrice * item.quantity);
      const isLast = idx === posCart.length - 1;
      let cashShare = 0;
      if (posPayMethod === 'cash') cashShare = itemTotal;
      else if (posPayMethod === 'split') {
        // Spread the cash amount across items so the parts always add up exactly
        cashShare = isLast ? round2(cashLeft) : round2(itemTotal * splitCash / posTotal);
        cashLeft -= cashShare;
      }
      return {
        id: `SALE-${stamp}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        productId: item.product.id,
        productName: item.product.name,
        price: item.customPrice,
        quantity: item.quantity,
        total: itemTotal,
        createdAt: now,
        billId,
        paymentMethod: posPayMethod,
        cashAmount: cashShare,
        qrAmount: round2(itemTotal - cashShare)
      };
    });

    setIsCheckingOut(true);
    const result = await addCounterSales(sales);
    setIsCheckingOut(false);

    if (result === 'failed') {
      alert('The sale could not be saved. Your cart is kept, please try again.');
      return;
    }
    if (result === 'no-payment') {
      alert('Sale saved, but the payment type could not be stored. Run the latest expenses_table.sql in Supabase.');
    }
    setPosCart([]);
    setPosPayMethod('cash');
    setPosCashInput('');
  };

  // Sales Ledger Logic: every checkout is shown as ONE bill, bills are grouped by day
  const billsByDate = useMemo(() => {
    const bills: Record<string, Bill> = {};
    counterSales.forEach(sale => {
      // Older sales have no bill id, but all items of one checkout share the same second
      const key = sale.billId || `t-${String(sale.createdAt).slice(0, 19)}`;
      if (!bills[key]) bills[key] = { key, createdAt: sale.createdAt, items: [], total: 0, cash: 0, qr: 0 };
      bills[key].items.push(sale);
      bills[key].total += sale.total;
      bills[key].cash += cashOf(sale);
      bills[key].qr += qrOf(sale);
    });

    const sortedBills = Object.values(bills).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const groups: Record<string, Bill[]> = {};
    sortedBills.forEach(bill => {
      const dateKey = new Date(bill.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(bill);
    });
    return groups;
  }, [counterSales]);

  const deleteBill = (bill: Bill) => {
    if (window.confirm(`Delete this bill (${bill.items.length} items, Rs. ${bill.total.toLocaleString()})?`)) {
      deleteCounterSales(bill.items.map(i => i.id));
    }
  };

  const downloadSalesCSV = () => {
    const sorted = [...counterSales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const headers = ['Bill', 'Transaction ID', 'Date', 'Product', 'Rate (Rs.)', 'Qty', 'Total (Rs.)', 'Payment', 'Cash (Rs.)', 'QR (Rs.)'];
    const rows = sorted.map(s => [
      s.billId || '',
      s.id,
      new Date(s.createdAt).toLocaleString(),
      `"${s.productName.replace(/"/g, '""')}"`,
      s.price,
      s.quantity,
      s.total,
      billMethod({ cash: cashOf(s), qr: qrOf(s) }),
      cashOf(s),
      qrOf(s)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Dragon_Sales_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const purgeSalesHistory = async () => {
    const confirmation = window.confirm(
      "WARNING: You are about to purge ALL physical store sales history. \n\n" +
      "This action only deletes the sales logs to save database space. \n" +
      "Your merchants, inventory, and vault data will remain safe. \n\n" +
      "Do you wish to proceed?"
    );
    
    if (confirmation) {
      setIsRefreshing(true);
      const ids = counterSales.map(s => s.id);
      // Batch delete
      await SupabaseService.deleteMany('counter_sales', ids);
      if (onRefresh) await onRefresh();
      setIsRefreshing(false);
      alert("Sales history purged successfully.");
    }
  };

  // Today's Sales Calculation (also used by the Income / Expenses tab)
  const todaySales = useMemo(() => {
    const today = new Date().toLocaleDateString('en-GB');
    const counterToday = counterSales.filter(s => new Date(s.createdAt).toLocaleDateString('en-GB') === today);
    const ordersToday = orders.filter(o => new Date(o.createdAt).toLocaleDateString('en-GB') === today && o.status !== 'cancelled');

    const counterTotal = counterToday.reduce((s, c) => s + c.total, 0);
    const ordersTotal = ordersToday.reduce((s, o) => s + o.total, 0);

    return counterTotal + ordersTotal;
  }, [counterSales, orders]);

  // Analytics for the selected period
  const analytics = useMemo(() => {
    const days = range === 'today' ? 1 : range === '7d' ? 7 : 30;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const inRange = (iso: string) => new Date(iso).getTime() >= start.getTime();

    const posRows = counterSales.filter(s => inRange(s.createdAt));
    const b2bOrders = orders.filter(o => o.status !== 'cancelled' && inRange(o.createdAt));
    const entries = expenses.filter(e => inRange(e.createdAt));

    const pos = posRows.reduce((t, r) => t + r.total, 0);
    const b2b = b2bOrders.reduce((t, o) => t + o.total, 0);
    const income = entries.filter(e => e.type === 'income').reduce((t, e) => t + e.amount, 0);
    const expense = entries.filter(e => e.type !== 'income').reduce((t, e) => t + e.amount, 0);
    const cash = posRows.reduce((t, r) => t + cashOf(r), 0);
    const qr = posRows.reduce((t, r) => t + qrOf(r), 0);

    // Day-by-day chart (always at least the last 7 days)
    const chartDays = range === '30d' ? 30 : 7;
    const trend: { key: string; name: string; Sales: number; Expenses: number }[] = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      trend.push({ key: dayKey(d), name: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), Sales: 0, Expenses: 0 });
    }
    const slot = (iso: string) => trend.find(t => t.key === dayKey(iso));
    counterSales.forEach(s => { const t = slot(s.createdAt); if (t) t.Sales += s.total; });
    orders.forEach(o => { if (o.status !== 'cancelled') { const t = slot(o.createdAt); if (t) t.Sales += o.total; } });
    expenses.forEach(e => { if (e.type !== 'income') { const t = slot(e.createdAt); if (t) t.Expenses += e.amount; } });

    // Best sellers in the period (store + B2B)
    const sellers: Record<string, { name: string; qty: number; revenue: number }> = {};
    const addSeller = (id: string, name: string, qty: number, revenue: number) => {
      if (!sellers[id]) sellers[id] = { name, qty: 0, revenue: 0 };
      sellers[id].qty += qty;
      sellers[id].revenue += revenue;
    };
    posRows.forEach(r => addSeller(r.productId, r.productName, r.quantity, r.total));
    b2bOrders.forEach(o => o.items.forEach(i => addSeller(i.productId, i.name, i.quantity, i.price * i.quantity)));
    const topSellers = Object.values(sellers).sort((a, b) => b.qty - a.qty).slice(0, 5);

    const label = range === 'today'
      ? new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      : `Last ${days} days`;

    return { pos, b2b, sales: pos + b2b, income, expense, net: pos + b2b + income - expense, cash, qr, trend, topSellers, label };
  }, [range, counterSales, orders, expenses]);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const pendingOrdersValue = pendingOrders.reduce((t, o) => t + o.total, 0);
  const lowStockProducts = products
    .filter(p => p.stock <= LOW_STOCK_LIMIT)
    .sort((a, b) => a.stock - b.stock);

  const pendingUsers = users.filter(u => u.role === 'customer' && (!u.status || u.status.toLowerCase() === 'pending'));
  const verifiedUsers = users.filter(u => u.role === 'customer' && u.status === 'approved');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProd(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Product = {
      id: `PROD-${Date.now()}`,
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

  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    await updateProduct(editingProduct.id, {
      name: editingProduct.name,
      price: Number(editingProduct.price),
      stock: Number(editingProduct.stock),
      category: editingProduct.category,
      volume: editingProduct.volume
    });
    
    setShowEditModal(false);
    setEditingProduct(null);
  };

  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500',
    packed: 'bg-blue-500/10 text-blue-500',
    dispatched: 'bg-orange-500/10 text-orange-500',
    delivered: 'bg-emerald-500/10 text-emerald-500',
    cancelled: 'bg-red-500/10 text-red-500',
  };

  const filteredOrders = useMemo(() => {
    let sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (orderFilter !== 'all') {
      sorted = sorted.filter(o => o.status === orderFilter);
    }

    if (orderCustomerSearch) {
      sorted = sorted.filter(o => 
        o.shopName.toLowerCase().includes(orderCustomerSearch.toLowerCase()) ||
        o.id.toLowerCase().includes(orderCustomerSearch.toLowerCase())
      );
    }

    if (orderStartDate) {
      const start = new Date(orderStartDate);
      start.setHours(0, 0, 0, 0);
      sorted = sorted.filter(o => new Date(o.createdAt) >= start);
    }

    if (orderEndDate) {
      const end = new Date(orderEndDate);
      end.setHours(23, 59, 59, 999);
      sorted = sorted.filter(o => new Date(o.createdAt) <= end);
    }

    return sorted;
  }, [orders, orderFilter, orderCustomerSearch, orderStartDate, orderEndDate]);

  const handleCancelOrder = (id: string) => {
    if (window.confirm("Are you sure you want to cancel this order? Stock will be returned to inventory.")) {
      updateOrderStatus(id, 'cancelled');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
      {/* Navigation Header */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="p-4 bg-red-600 rounded-[1.5rem] shadow-xl">
            <Flame className="text-white w-10 h-10" /> 
          </div>
          <div>
            <h1 className="text-4xl font-black dark:text-white text-slate-900 tracking-tighter uppercase leading-none">Admin Hub</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Distribution Control Center</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 w-full bg-white dark:bg-slate-800/50 backdrop-blur p-2 rounded-[1.75rem] border border-slate-200 dark:border-slate-700 shadow-xl">
          {[
            { id: 'stats', label: 'Analytics', icon: TrendingUp },
            { id: 'orders', label: 'B2B Orders', icon: ClipboardList },
            { id: 'counter', label: 'POS Terminal', icon: ShoppingCart },
            { id: 'expenses', label: 'Income/Expenses', icon: Wallet },
            { id: 'ledger', label: 'History', icon: CalendarDays },
            { id: 'users', label: 'Merchants', icon: Users },
            { id: 'inventory', label: 'Vault', icon: Package }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold transition-all text-[10px] uppercase tracking-widest whitespace-nowrap ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-red-500'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <button onClick={handleManualRefresh} className="ml-auto px-4 py-3.5 text-slate-500 hover:text-red-500"><RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {/* Analytics View */}
      {activeTab === 'stats' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Business Snapshot</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{analytics.label}</p>
            </div>
            <div className="flex gap-1 p-1.5 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-fit">
              {([
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' }
              ] as const).map(r => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${range === r.id ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-red-500'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Money in / out */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Sales', value: `Rs. ${analytics.sales.toLocaleString()}`, sub: `Store Rs. ${analytics.pos.toLocaleString()} • B2B Rs. ${analytics.b2b.toLocaleString()}`, icon: Activity, color: 'text-red-500', valueColor: 'dark:text-white' },
              { label: 'Other Income', value: `Rs. ${analytics.income.toLocaleString()}`, sub: 'Money in, not from sales', icon: Wallet, color: 'text-emerald-500', valueColor: 'text-emerald-500' },
              { label: 'Expenses', value: `Rs. ${analytics.expense.toLocaleString()}`, sub: 'Money spent', icon: TrendingDown, color: 'text-orange-500', valueColor: 'text-red-600' },
              { label: 'Net Balance', value: `Rs. ${analytics.net.toLocaleString()}`, sub: 'Sales + Income - Expenses', icon: TrendingUp, color: analytics.net >= 0 ? 'text-emerald-500' : 'text-red-500', valueColor: analytics.net >= 0 ? 'text-emerald-500' : 'text-red-600' }
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl space-y-4">
                <div className={`p-3 w-fit rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.valueColor}`}>{stat.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trend + payment split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl space-y-8">
              <div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Sales vs Expenses</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Day by day • last {analytics.trend.length} days</p>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} interval={analytics.trend.length > 10 ? 3 : 0} />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : `${v}`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.1)' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
                      formatter={(v: number) => `Rs. ${v.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Bar dataKey="Sales" fill="#dc2626" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#d97706" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl space-y-8">
              <div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Store Payments</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">POS sales only</p>
              </div>
              {(analytics.cash + analytics.qr) > 0 ? (
                <div className="space-y-6">
                  <div className="h-4 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(analytics.cash / (analytics.cash + analytics.qr)) * 100}%` }} />
                    <div className="bg-blue-500 h-full" style={{ width: `${(analytics.qr / (analytics.cash + analytics.qr)) * 100}%` }} />
                  </div>
                  {[
                    { label: 'Cash', amount: analytics.cash, dot: 'bg-emerald-500', icon: Banknote },
                    { label: 'QR', amount: analytics.qr, dot: 'bg-blue-500', icon: QrCode }
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${row.dot}`} />
                        <row.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{row.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-black dark:text-white tracking-tighter">Rs. {row.amount.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-slate-400">{((row.amount / (analytics.cash + analytics.qr)) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Sales made before payment types were added are counted as cash.</p>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center opacity-30">
                  <ShoppingCart className="w-12 h-12 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No store sales yet</p>
                </div>
              )}
            </div>
          </div>

          {/* What needs doing + what sells */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl space-y-6">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
                <Clock className="w-5 h-5 text-red-500" /> Needs Attention
              </h3>
              <div className="space-y-3">
                <button onClick={() => { setOrderFilter('pending'); setActiveTab('orders'); }} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl hover:ring-2 hover:ring-red-500/30 transition-all text-left">
                  <div>
                    <p className="font-black dark:text-white text-sm">Pending B2B orders</p>
                    <p className="text-[10px] font-bold text-slate-500">Rs. {pendingOrdersValue.toLocaleString()} waiting</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${pendingOrders.length > 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>{pendingOrders.length}</span>
                </button>
                <button onClick={() => setActiveTab('users')} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl hover:ring-2 hover:ring-red-500/30 transition-all text-left">
                  <div>
                    <p className="font-black dark:text-white text-sm">Merchants to approve</p>
                    <p className="text-[10px] font-bold text-slate-500">{verifiedUsers.length} approved so far</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${pendingUsers.length > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>{pendingUsers.length}</span>
                </button>
                <button onClick={() => setActiveTab('inventory')} className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl hover:ring-2 hover:ring-red-500/30 transition-all text-left">
                  <div>
                    <p className="font-black dark:text-white text-sm">Low or out of stock</p>
                    <p className="text-[10px] font-bold text-slate-500">{LOW_STOCK_LIMIT} units or fewer</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${lowStockProducts.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>{lowStockProducts.length}</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl space-y-6">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Restock Soon
              </h3>
              <div className="space-y-3">
                {lowStockProducts.slice(0, 6).map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-black dark:text-white text-sm truncate">{p.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{p.volume}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${p.stock === 0 ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {p.stock === 0 ? 'Out' : `${p.stock} left`}
                    </span>
                  </div>
                ))}
                {lowStockProducts.length === 0 && (
                  <p className="text-sm font-bold text-slate-400 py-6 text-center">All products are well stocked.</p>
                )}
                {lowStockProducts.length > 6 && (
                  <button onClick={() => setActiveTab('inventory')} className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1">
                    See all {lowStockProducts.length} <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl space-y-6">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-500" /> Top Sellers
              </h3>
              <div className="space-y-4">
                {analytics.topSellers.map((t, i) => (
                  <div key={t.name + i} className="flex items-center gap-4">
                    <span className="w-8 h-8 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-black dark:text-white text-sm truncate">{t.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{t.qty} sold • Rs. {t.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {analytics.topSellers.length === 0 && (
                  <p className="text-sm font-bold text-slate-400 py-6 text-center">No sales in this period.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Management View */}
      {activeTab === 'orders' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">B2B Supply Orders</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Dispatch Queue</p>
              </div>
            </div>
            
            {/* Status Filter Bar */}
            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border dark:border-white/5 overflow-x-auto scrollbar-hide">
              {(['all', 'pending', 'packed', 'dispatched', 'delivered', 'cancelled'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${orderFilter === f ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by Merchant or ID..." 
                value={orderCustomerSearch}
                onChange={e => setOrderCustomerSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 font-bold dark:text-white shadow-xl focus:ring-4 focus:ring-red-500/10 text-xs"
              />
            </div>
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-xl">
              <div className="flex-1 flex flex-col px-3">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                <input 
                  type="date" 
                  value={orderStartDate}
                  onChange={e => setOrderStartDate(e.target.value)}
                  className="bg-transparent border-none p-0 text-xs font-bold dark:text-white focus:ring-0"
                />
              </div>
              <div className="w-px h-8 bg-slate-100 dark:bg-white/5" />
              <div className="flex-1 flex flex-col px-3">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                <input 
                  type="date" 
                  value={orderEndDate}
                  onChange={e => setOrderEndDate(e.target.value)}
                  className="bg-transparent border-none p-0 text-xs font-bold dark:text-white focus:ring-0"
                />
              </div>
            </div>
            <button 
              onClick={() => {
                setOrderCustomerSearch('');
                setOrderStartDate('');
                setOrderEndDate('');
                setOrderFilter('all');
              }}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl"
            >
              <RefreshCcw className="w-4 h-4" /> Reset Filters
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                  <th className="px-10 py-6">Order ID & Date</th>
                  <th className="px-10 py-6">Merchant Shop</th>
                  <th className="px-10 py-6">Fulfillment Total</th>
                  <th className="px-10 py-6">Current Status</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5">
                {filteredOrders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-all ${expandedOrderId === order.id ? 'bg-slate-50 dark:bg-white/5' : ''}`}>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-3">
                          {order.status === 'pending' && <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />}
                          <div>
                            <p className="font-black dark:text-white text-lg tracking-tight">#{order.id.split('-').pop()}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <p className="font-black dark:text-white">{order.shopName}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{order.customerEmail}</p>
                      </td>
                      <td className="px-10 py-8">
                        <p className="text-xl font-black text-red-600 tracking-tighter">Rs. {order.total.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">COD Payment</p>
                      </td>
                      <td className="px-10 py-8">
                        <select 
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-none outline-none cursor-pointer shadow-sm ${statusColors[order.status]}`}
                        >
                          <option value="pending" className="bg-slate-900 text-yellow-500">PENDING</option>
                          <option value="packed" className="bg-slate-900 text-blue-500">PACKED</option>
                          <option value="dispatched" className="bg-slate-900 text-orange-500">DISPATCHED</option>
                          <option value="delivered" className="bg-slate-900 text-emerald-500">DELIVERED</option>
                          <option value="cancelled" className="bg-slate-900 text-red-500">CANCELLED</option>
                        </select>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                            <button 
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-red-500 transition-all flex items-center gap-2"
                            >
                                <Boxes className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Items</span>
                            </button>
                            {order.status !== 'cancelled' && (
                                <button 
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                                    title="Cancel Order"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-slate-100/30 dark:bg-slate-950/20">
                        <td colSpan={5} className="px-10 py-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                            {order.items.map((item, idx) => {
                              const product = products.find(p => p.id === item.productId);
                              return (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-lg hover:border-red-500/30 transition-all">
                                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden flex-shrink-0">
                                    {product?.image ? (
                                      <img src={product.image} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-6 h-6 text-slate-300" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-black dark:text-white text-sm leading-tight">{item.name}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.volume || '750ml'}</p>
                                    <p className="text-[10px] font-black text-red-600 mt-1 uppercase">Order Qty: {item.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black dark:text-white text-xs">Rs. {item.price.toLocaleString()}</p>
                                    <p className="text-[9px] text-slate-400 font-bold">Total: Rs. {(item.price * item.quantity).toLocaleString()}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-32 text-center">
                      <ClipboardList className="w-20 h-20 text-slate-800 mx-auto mb-4 opacity-20" />
                      <p className="text-slate-500 font-black uppercase tracking-[0.4em] opacity-40">No orders match this filter</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger History View */}
      {activeTab === 'ledger' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-600 rounded-2xl shadow-lg">
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Physical Ledger</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Historical Retail Records</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={downloadSalesCSV}
                className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl border dark:border-white/5 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>
              <button 
                onClick={purgeSalesHistory}
                className="px-6 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-red-700 transition-all"
              >
                <Eraser className="w-4 h-4" /> Purge Logs
              </button>
            </div>
          </div>

          <div className="space-y-12">
            {(Object.entries(billsByDate) as [string, Bill[]][]).map(([dateLabel, bills]) => (
              <div key={dateLabel} className="space-y-6">
                <div className="flex flex-wrap items-center gap-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap">
                    {dateLabel}
                  </h3>
                  <div className="h-px flex-1 min-w-[40px] bg-slate-200 dark:bg-white/5" />
                  <div className="flex items-center gap-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest">
                    <span className="text-emerald-500">Cash Rs. {bills.reduce((t, b) => t + b.cash, 0).toLocaleString()}</span>
                    <span className="text-blue-500">QR Rs. {bills.reduce((t, b) => t + b.qr, 0).toLocaleString()}</span>
                    <span className="text-slate-400">Daily Total:</span>
                    <span className="text-sm text-red-600">Rs. {bills.reduce((t, b) => t + b.total, 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {bills.map((bill, idx) => {
                    const method = billMethod(bill);
                    return (
                      <div key={bill.key} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 bg-slate-50 dark:bg-slate-950/50">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-red-600/10 text-red-500 rounded-xl"><Receipt className="w-5 h-5" /></div>
                            <div>
                              <p className="font-black dark:text-white tracking-tight">Bill {bills.length - idx}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {new Date(bill.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} • {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {(method === 'cash' || method === 'split') && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <Banknote className="w-3.5 h-3.5" /> Cash{method === 'split' ? ` Rs. ${bill.cash.toLocaleString()}` : ''}
                              </span>
                            )}
                            {(method === 'qr' || method === 'split') && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <QrCode className="w-3.5 h-3.5" /> QR{method === 'split' ? ` Rs. ${bill.qr.toLocaleString()}` : ''}
                              </span>
                            )}
                            <p className="font-black text-red-600 text-2xl tracking-tighter">Rs. {bill.total.toLocaleString()}</p>
                            <button onClick={() => deleteBill(bill)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Delete bill">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="divide-y dark:divide-white/5">
                          {bill.items.map(item => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-8 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                              <p className="col-span-12 sm:col-span-5 font-black dark:text-white tracking-tight">{item.productName}</p>
                              <p className="col-span-4 sm:col-span-2 sm:text-right font-bold text-slate-500 text-sm">Rs. {item.price.toLocaleString()}</p>
                              <p className="col-span-3 sm:col-span-2 text-center">
                                <span className="font-black dark:text-white px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">x{item.quantity}</span>
                              </p>
                              <p className="col-span-5 sm:col-span-3 text-right font-black dark:text-white tracking-tighter">Rs. {item.total.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {counterSales.length === 0 && (
              <div className="flex flex-col items-center justify-center py-40 glass rounded-[3rem] border-dashed border-4 border-slate-200 dark:border-slate-800">
                <FileText className="w-20 h-20 text-slate-200 dark:text-slate-800 mb-6" />
                <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">No Sales Recorded</h3>
                <p className="text-slate-500 font-bold mt-2">Transactions from POS will appear here grouped by date.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POS Terminal View */}
      {activeTab === 'counter' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in zoom-in-95 duration-500">
          <div className="lg:col-span-1 space-y-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search catalog..." 
                value={posSearch}
                onChange={e => setPosSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-5 pl-14 pr-6 font-bold dark:text-white shadow-xl focus:ring-4 focus:ring-red-500/10"
              />
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
              {filteredPOSProducts.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => addToPOSCart(p)}
                  className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl flex items-center gap-4 border border-transparent hover:border-red-500 transition-all text-left group shadow-lg"
                >
                  <img src={p.image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                  <div className="flex-1">
                    <p className="font-black dark:text-white text-sm leading-tight">{p.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{p.volume} • Stock: {p.stock} • Sold: {soldByProduct.store[p.id] || 0}</p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border dark:border-white/5 shadow-2xl flex flex-col min-h-[500px]">
             <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter text-red-600">POS Checkout</h2>
                <span className="bg-slate-100 dark:bg-slate-800 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{posCart.length} Items</span>
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

             <div className="pt-8 border-t dark:border-white/5 space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Method</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'qr', label: 'QR', icon: QrCode },
                      { id: 'split', label: 'Cash + QR', icon: ArrowLeftRight }
                    ] as const).map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPosPayMethod(m.id)}
                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${posPayMethod === m.id ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500'}`}
                      >
                        <m.icon className="w-4 h-4" /> {m.label}
                      </button>
                    ))}
                  </div>

                  {posPayMethod === 'split' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Paid in Cash (Rs.)</label>
                        <input
                          type="number"
                          min="0"
                          value={posCashInput}
                          onChange={e => setPosCashInput(e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-black dark:text-white text-sm focus:ring-4 focus:ring-red-500/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Paid by QR (Rs.)</label>
                        <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 px-6 font-black dark:text-white text-sm">
                          {splitQr.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div>
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payable</p>
                     <p className="text-5xl font-black text-red-600 tracking-tighter">
                       Rs. {posTotal.toLocaleString()}
                     </p>
                  </div>
                  <button 
                    onClick={processPOSCheckout}
                    disabled={posCart.length === 0 || isCheckingOut}
                    className="w-full md:w-auto px-12 py-5 bg-red-600 text-white font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCheckingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Sale
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Expenses View */}
      {activeTab === 'expenses' && (
        <ExpensesPanel
          expenses={expenses}
          todaySales={todaySales}
          addExpense={addExpense}
          deleteExpense={deleteExpense}
        />
      )}

      {/* Vault Inventory View */}
      {activeTab === 'inventory' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-500">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-red-500" />
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Vault Management</h2>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full sm:w-64 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search vault..." 
                    value={vaultSearch}
                    onChange={e => setVaultSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-3 pl-12 pr-4 font-bold dark:text-white shadow-xl focus:ring-4 focus:ring-red-500/10 text-xs"
                  />
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Expand Catalog
                </button>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 dark:bg-slate-950/50">
                 <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                   <th className="px-10 py-6">Product</th>
                   <th className="px-10 py-6">Stock</th>
                   <th className="px-10 py-6">Price</th>
                   <th className="px-10 py-6 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y dark:divide-white/5">
                 {filteredVaultProducts.map(p => (
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
                         <div className={`w-3 h-3 rounded-full ${p.stock > 10 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                         <span className="font-black dark:text-white text-xl">{p.stock} <span className="text-[10px] text-slate-500 tracking-widest">{p.unit}s</span></span>
                       </div>
                     </td>
                     <td className="px-10 py-8 font-black dark:text-slate-400 tracking-tighter">Rs. {p.price.toLocaleString()}</td>
                     <td className="px-10 py-8 text-right">
                       <div className="flex items-center justify-end gap-3">
                         <button onClick={() => handleEditProduct(p)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-blue-500 transition-colors" title="Edit Product"><Edit className="w-4 h-4" /></button>
                         <button onClick={() => updateStock(p.id, p.stock - 1)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-red-500 transition-colors"><Minus className="w-4 h-4" /></button>
                         <button onClick={() => updateStock(p.id, p.stock + 1)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:text-emerald-500 transition-colors"><Plus className="w-4 h-4" /></button>
                         <button onClick={() => deleteProduct(p.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Merchant Management View */}
      {activeTab === 'users' && (
        <div className="space-y-16 animate-in fade-in duration-500">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-orange-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Queue</h2>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-white/5">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
                    <th className="px-10 py-6">Shop Name</th>
                    <th className="px-10 py-6">Email</th>
                    <th className="px-10 py-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5">
                  {pendingUsers.map(c => (
                    <tr key={c.id} className="hover:bg-orange-500/5 transition-all">
                      <td onClick={() => navigate(`/admin/customer/${c.id}`)} className="px-10 py-8 cursor-pointer">
                         <p className="font-black dark:text-white text-lg tracking-tight">{c.shopName || "Anonymous merchant"}</p>
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
                          Authorize
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-16 text-center opacity-20 font-black uppercase tracking-widest">No pending merchants</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Check className="w-8 h-8 text-emerald-500" />
              <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Partners</h2>
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
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner Profile</span>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest underline">Order History</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Catalog Addition Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl" onClick={() => setShowAddModal(false)} />
          <form onSubmit={handleSaveProduct} className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,1)] space-y-8 animate-in zoom-in-95">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">New Spirit</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X /></button>
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
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Identity</label>
                   <input required value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="e.g. Signature Premier" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                      <select value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white">
                        {['Whisky', 'Vodka', 'Rum', 'Gin', 'Beer', 'Wine', 'Juice'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Batch Volume</label>
                      <input required value={newProd.volume} onChange={e => setNewProd({...newProd, volume: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="750ml / 650ml" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price (Rs.)</label>
                      <input required type="number" value={newProd.price} onChange={e => setNewProd({...newProd, price: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="0.00" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Initial Reserve</label>
                      <input required type="number" value={newProd.stock} onChange={e => setNewProd({...newProd, stock: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" placeholder="Units" />
                   </div>
                </div>
             </div>

             <button type="submit" className="w-full py-5 bg-red-600 text-white font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
                Confirm & Add
             </button>
          </form>
        </div>
      )}
      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-2xl" onClick={() => setShowEditModal(false)} />
          <form onSubmit={handleUpdateProduct} className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,1)] space-y-8 animate-in zoom-in-95">
             <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Edit Product</h2>
                <button type="button" onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X /></button>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Name</label>
                   <input required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                      <select value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white">
                        {['Whisky', 'Vodka', 'Rum', 'Gin', 'Beer', 'Wine', 'Juice'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Volume</label>
                      <input required value={editingProduct.volume} onChange={e => setEditingProduct({...editingProduct, volume: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price (Rs.)</label>
                      <input required type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock</label>
                      <input required type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 font-bold dark:text-white" />
                   </div>
                </div>
             </div>

             <button type="submit" className="w-full py-5 bg-red-600 text-white font-black rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
                Update Product
             </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
