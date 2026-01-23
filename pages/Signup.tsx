import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState, UserRole, UserStatus } from '../types';
import { EmailService, SupabaseService } from '../services';
import { Mail, Store, MapPin, ArrowRight, ShieldCheck, Flame, Loader2, Phone, RefreshCw } from 'lucide-react';

interface SignupProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  users: User[];
}

const Signup: React.FC<SignupProps> = ({ setAuth, setUsers, users }) => {
  const [formData, setFormData] = useState({ email: '', phone: '', shopName: '', address: '', otp: '' });
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let timer: number;
    if (resendCooldown > 0) {
      timer = window.setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleNext = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    
    if (users.find(u => u.email === cleanEmail)) {
      setError('This merchant email is already registered.');
      return;
    }
    
    setIsSending(true);
    setError('');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const success = await EmailService.sendOTP(cleanEmail, code);
    
    setIsSending(false);
    if (success) {
      setGeneratedOtp(code);
      setStep('otp');
      setResendCooldown(30);
    } else {
      setError('Verification failed. Check your email or try again later.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp === generatedOtp) {
      const newUser: User = {
        id: `DRGN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        shopName: formData.shopName,
        address: formData.address,
        role: 'customer' as UserRole,
        status: 'pending' as UserStatus,
        createdAt: new Date().toISOString()
      };
      await SupabaseService.upsert('users', newUser);
      setUsers(prev => [...prev, newUser]);
      setAuth({ user: newUser, isAuthenticated: true });
      navigate('/');
    } else {
      setError('Security code mismatch.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex p-3 vibrant-gradient rounded-2xl shadow-lg mb-2">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Merchant Application</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Authorized Distribution Enrollment</p>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-2xl border border-white/5 relative">
          {step === 'details' ? (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="space-y-4">
                <input required value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} placeholder="Business Name" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:ring-1 focus:ring-red-500 outline-none font-semibold text-white text-sm" />
                <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Merchant Gmail" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:ring-1 focus:ring-red-500 outline-none font-semibold text-white text-sm" />
                <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone Number (98...)" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:ring-1 focus:ring-red-500 outline-none font-semibold text-white text-sm" />
                <input required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Store Address" className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 focus:ring-1 focus:ring-red-500 outline-none font-semibold text-white text-sm" />
              </div>
              
              {error && <p className="text-red-400 text-xs font-bold text-center bg-red-500/5 py-2.5 rounded-lg">{error}</p>}
              
              <button type="submit" disabled={isSending} className="w-full vibrant-gradient text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98]">
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
              </button>
              
              <div className="text-center pt-4">
                <Link to="/login" className="text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">Back to Login Terminal</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="text-center">
                <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white">Security Check</h3>
                <p className="text-slate-400 text-[11px]">Verification code sent to email</p>
              </div>
              <input required maxLength={4} value={formData.otp} onChange={(e) => setFormData({ ...formData, otp: e.target.value })} placeholder="0000" className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-4 text-center text-3xl font-bold tracking-[0.4em] focus:ring-1 focus:ring-red-500 text-white outline-none" />
              {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
              <button type="submit" className="w-full vibrant-gradient text-white font-bold py-3.5 rounded-xl shadow-lg text-sm active:scale-[0.98] transition-all">Enroll Merchant</button>
              
              <div className="flex flex-col gap-3 pt-4 text-center">
                <button 
                  type="button" 
                  onClick={() => handleNext()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Request New Code"}
                </button>
                <button type="button" onClick={() => setStep('details')} className="text-slate-600 hover:text-white transition-colors text-[9px] font-bold uppercase tracking-widest">Edit Merchant Details</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;