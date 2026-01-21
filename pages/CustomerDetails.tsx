import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Order } from '../types';
import { ChevronLeft, Package, Calendar, FileText, ShoppingCart, User as UserIcon, Mail, Flame } from 'lucide-react';
import Invoice from '../components/Invoice';

interface CustomerDetailsProps {
  users: User[];
  orders: Order[];
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ users, orders }) => {
  const { id } = useParams<{ id: string }>();
  const customer = users.find(u => u.id === id);
  const customerOrders = orders
    .filter(o => o.customerId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (!customer) return <div className="p-10 text-center font-black">Merchant not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/admin" className="inline-flex items-center gap-2 text-red-500 font-black uppercase tracking-widest text-xs hover:translate-x-[-4px] transition-transform mb-10 bg-red-500/10 px-4 py-2 rounded-full">
        <ChevronLeft className="w-5 h-5" /> Return to Admin Panel
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="glass p-10 rounded-[3rem] border-2 border-red-600/10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <Flame className="w-24 h-24 text-red-600" />
             </div>
            <div className="w-24 h-24 bg-red-600/10 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
              <UserIcon className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter leading-none">{customer.shopName}</h2>
            <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">{customer.address}</p>
            
            <div className="mt-12 space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Primary Contact</p>
                <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-red-500" />
                    <p className="font-black text-white text-lg">{customer.phone}</p>
                </div>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Authorized Since</p>
                <p className="font-black text-white text-lg">{new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Merchant Status</p>
                <span className={`inline-block mt-1 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  customer.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {customer.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-3xl font-black text-white flex items-center gap-4 tracking-tight">
            <ShoppingCart className="text-red-600 w-8 h-8" /> Fulfillment History
          </h3>
          
          <div className="space-y-6">
            {customerOrders.map(order => (
              <div key={order.id} className="glass p-8 rounded-[2.5rem] border border-white/5 hover:border-red-500/30 transition-all group shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-slate-800 rounded-[1.75rem] group-hover:bg-red-600/10 transition-all border border-white/5">
                      <Package className="w-8 h-8 text-slate-500 group-hover:text-red-500 transition-colors" />
                    </div>
                    <div>
                      <p className="font-black text-white text-2xl tracking-tighter">Order #{order.id}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-black uppercase tracking-widest mt-1">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                        <span className="opacity-30">•</span>
                        <span>{order.items.length} Spirits</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-8">
                    <div className="text-right">
                      <p className="text-3xl font-black text-red-500 tracking-tighter">Rs. {order.total.toLocaleString()}</p>
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.1em]">Cash on Delivery</span>
                    </div>
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="p-4 bg-slate-800 text-slate-400 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-xl group-hover:scale-110 active:scale-90"
                    >
                      <FileText className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {customerOrders.length === 0 && (
              <div className="text-center py-24 glass rounded-[3rem] border border-dashed border-slate-700">
                <Package className="w-20 h-20 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest">No order records found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white text-slate-900 rounded-[3rem] overflow-hidden max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
            <div className="max-h-[85vh] overflow-y-auto">
              <Invoice order={selectedOrder} user={customer} />
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-4">
              <button 
                onClick={() => window.print()}
                className="px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl text-lg"
              >
                Print Invoice
              </button>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-700 transition-all text-lg"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetails;