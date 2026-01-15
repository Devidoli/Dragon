import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState } from '../types.ts';
import { Mail, Store, MapPin, ArrowRight, ShieldCheck, Flame, Loader2, Phone } from 'lucide-react';

interface SignupProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  users: User[];
}

const Signup: React.FC<SignupProps> = ({ setAuth, setUsers, users }) => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    shopName: '',
    address: '',
    otp: ''
  });
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid business email');
      return;
    }
    if (users.find(u => u.email === formData.email)) {
      setError('This email is already linked to a merchant account');
      return;
    }
    
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setError('');
      setStep('otp');
      alert(`[Dragon Suppliers] Your verification code is: 1234`);
    }, 1500);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp === '1234') {
      const newUser: User = {
        id: `DRGN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        shopName: formData.shopName,
        address: formData.address,
        role: 'customer',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      setUsers(prev => [...prev, newUser]);
      setAuth({ user: newUser, isAuthenticated: true });
      navigate('/');
    } else {
      setError('Invalid code. Use 1234.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex p-4 vibrant-gradient rounded-2xl shadow-xl mb-2">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Merchant Application</h1>
          <p className="text-slate-400 font-medium">Wholesale Network (Nepal Only)</p>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-2xl border border-white/10 relative">
          <div className="absolute top-0 right-0 w-1 h-full vibrant-gradient"></div>

          {step === 'details' ? (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business Shop Name</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    required
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="e.g., Everest Liquor Palace"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business Gmail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="merchant@gmail.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="98XXXXXXXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Physical Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., Putalisadak, Kathmandu"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
              
              <button
                type="submit"
                disabled={isSending}
                className="w-full vibrant-gradient text-white font-black py-4 rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify Identity"} 
                {!isSending && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="text-center space-y-2">
                <ShieldCheck className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-2xl font-black text-white">Security Check</h3>
                <p className="text-slate-400 text-sm">Verification Sent to {formData.email}</p>
              </div>
              <input
                required
                maxLength={4}
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                placeholder="4-Digit Code"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-4 text-center text-4xl font-black tracking-[0.5em] focus:ring-2 focus:ring-red-500 text-white"
              />
              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
              <button
                type="submit"
                className="w-full vibrant-gradient text-white font-black py-4 rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xl"
              >
                Submit Application
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-8 text-slate-400 font-medium">
          Registered Merchant?{' '}
          <Link to="/login" className="text-red-500 font-black hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;