
import React from 'react';
import { Order, User } from '../types';
import { Flame } from 'lucide-react';

interface InvoiceProps {
  order: Order;
  user: User;
}

const Invoice: React.FC<InvoiceProps> = ({ order, user }) => {
  const today = new Date().toLocaleDateString('en-NP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="p-16 text-slate-900 bg-white min-h-[800px] flex flex-col print:p-0">
      <div className="flex justify-between items-start mb-20">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-red-600 rounded-[2rem] shadow-xl">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Dragon Suppliers</h1>
            <p className="text-[10px] text-slate-500 font-black tracking-[0.4em] uppercase mt-2">Official B2B Network Nepal</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-7xl font-black text-slate-100 mb-2 uppercase italic leading-none select-none">Invoice</h2>
          <div className="space-y-1">
            <p className="text-slate-900 text-sm font-black uppercase tracking-widest">Ref: {order.id}</p>
            <p className="text-slate-400 text-xs font-black tracking-widest uppercase italic">Generated: {today}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-20 mb-20">
        <div className="space-y-2">
          <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-4">Origin Hub</p>
          <p className="font-black text-2xl leading-none">Dragon Suppliers HQ</p>
          <p className="text-base text-slate-500 font-medium">Putalisadak, Kathmandu</p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Warehouse Node 01</p>
        </div>
        <div className="text-right space-y-2">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Merchant Entity</p>
          <p className="font-black text-2xl leading-none">{user.shopName}</p>
          <p className="text-base text-slate-500 font-medium">{user.address}</p>
          <p className="text-xs text-red-600 font-black uppercase tracking-widest mt-4 underline underline-offset-4">{user.email}</p>
        </div>
      </div>

      <div className="flex-1">
        <table className="w-full text-left mb-16">
          <thead>
            <tr className="border-b-8 border-slate-900">
              <th className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Spirit Description</th>
              <th className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Batch Qty</th>
              <th className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Unit Net</th>
              <th className="py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Sub-Total</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100">
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-8">
                    <p className="font-black text-2xl tracking-tight">{item.name}</p>
                    <p className="text-[11px] text-red-600 font-black uppercase tracking-widest mt-1">{item.volume}</p>
                </td>
                <td className="py-8 text-center font-black text-2xl">x{item.quantity}</td>
                <td className="py-8 text-right font-black text-slate-400">Rs. {item.price.toLocaleString()}</td>
                <td className="py-8 text-right font-black text-2xl tracking-tighter">Rs. {(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto border-t-4 border-slate-900 pt-10">
        <div className="flex justify-end">
          <div className="w-96 space-y-6">
            <div className="flex justify-between items-center text-slate-900 py-8 border-b-2 border-slate-100">
              <span className="font-black text-2xl uppercase tracking-tighter">Net Total</span>
              <span className="font-black text-5xl tracking-tighter text-red-600">Rs. {order.total.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <div className="inline-block px-6 py-3 bg-slate-900 rounded-2xl shadow-xl">
                 <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Payment Terms: COD ONLY</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32 border-t border-slate-100 pt-12 flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-xs font-black text-slate-400 italic">This is an automated batch invoice generated by Dragon Distro.</p>
          <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest">Digitally Audited & Signed</p>
        </div>
        <div className="text-right">
          <div className="w-64 border-b-4 border-slate-900 mb-4 ml-auto"></div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">Distribution Authority</p>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
