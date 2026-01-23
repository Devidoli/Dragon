import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState, UserRole, UserStatus } from '../types';
import { EmailService, SupabaseService } from '../services';
import { ArrowRight, ShieldCheck, Flame, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

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
      setError('Failed to send verification code. Please check your internet or email settings.');
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
      setError('Invalid security code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex p-4 bg-red-600 rounded-2xl shadow-lg mb-2">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Enroll Merchant</h1>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500">B2B Application Terminal</p>
        </div>

        <div className="glass p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative">
          {step === 'details' ? (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Business Name</label>
                  <input required value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} placeholder="Enter Shop/Store Name" className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3.5 px-4 focus:border-red-500 outline-none font-medium text-white text-base" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Merchant Email</label>
                  <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="merchant@example.com" className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3.5 px-4 focus:border-red-500 outline-none font-medium text-white text-base" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+977-98..." className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3.5 px-4 focus:border-red-500 outline-none font-medium text-white text-base" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Full Address</label>
                  <input required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="City, Location" className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-3.5 px-4 focus:border-red-500 outline-none font-medium text-white text-base" />
                </div>
              </div>
              
              {error && (
                <div className="flex items-start gap-3 text-red-400 text-xs font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <button type="submit" disabled={isSending} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm uppercase tracking-widest transition-all active:scale-[0.98]">
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Information"}
              </button>
              
              <div className="text-center pt-6 border-t border-white/5">
                <Link to="/login" className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Already have an account? Login</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white uppercase">Security Check</h3>
                <p className="text-slate-500 text-xs font-bold">Verification code for {formData.email}</p>
              </div>
              <input required maxLength={4} value={formData.otp} onChange={(e) => setFormData({ ...formData, otp: e.target.value })} placeholder="0000" className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-4 text-center text-4xl font-black tracking-[0.5em] focus:border-red-500 text-white outline-none" />
              
              {error && (
                <div className="flex items-start gap-3 text-red-400 text-xs font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg text-sm uppercase tracking-widest active:scale-[0.98] transition-all">Submit Application</button>
              
              <div className="flex flex-col gap-4 pt-6 border-t border-white/5 text-center">
                <button 
                  type="button" 
                  onClick={() => handleNext()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
                <button type="button" onClick={() => setStep('details')} className="text-slate-600 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest underline underline-offset-4">Modify Details</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;