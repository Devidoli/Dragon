import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState, UserRole, UserStatus } from '../types';
import { EmailService, SupabaseService } from '../services';
import { Mail, Store, MapPin, ArrowRight, ShieldCheck, Flame, Loader2, Phone, RefreshCw, AlertCircle } from 'lucide-react';

interface SignupProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  users: User[];
}

const ADMIN_EMAILS = [
  'olidevid203@gmail.com',
  'olidevid204@gmail.com',
  'olielina3@gmail.com',
  'pokharrajoli12@gmail.com'
];

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
      setError('Merchant ID already exists.');
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
      if (ADMIN_EMAILS.includes(cleanEmail)) {
        console.warn('--- DRAGON ADMIN BYPASS ---');
        console.warn(`Signup Debug Code: ${code}`);
        console.warn('---------------------------');
        setGeneratedOtp(code);
        setStep('otp');
        setResendCooldown(30);
        setError('Verification bypass active: check console for code.');
      } else {
        setError('Failed to send verification code. Ensure your Brevo sender is verified.');
      }
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
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex p-2.5 vibrant-gradient rounded-xl shadow-lg mb-1">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase italic">Merchant Enrollment</h1>
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Distribution Application</p>
        </div>

        <div className="glass p-7 rounded-[2rem] shadow-2xl border border-white/5 relative">
          {step === 'details' ? (
            <form onSubmit={handleNext} className="space-y-3.5">
              <div className="space-y-3">
                <input required value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} placeholder="Store/Business Name" className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-2.5 px-4 focus:border-red-500/50 outline-none font-bold text-white text-[11px]" />
                <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Merchant Email" className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-2.5 px-4 focus:border-red-500/50 outline-none font-bold text-white text-[11px]" />
                <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Contact Number" className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-2.5 px-4 focus:border-red-500/50 outline-none font-bold text-white text-[11px]" />
                <input required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Physical Address" className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-2.5 px-4 focus:border-red-500/50 outline-none font-bold text-white text-[11px]" />
              </div>
              
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-[9px] font-bold bg-red-500/5 p-2.5 rounded-lg border border-red-500/10">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <button type="submit" disabled={isSending} className="w-full vibrant-gradient text-white font-black py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest transition-all active:scale-[0.98]">
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify Merchant"}
              </button>
              
              <div className="text-center pt-3 border-t border-white/5">
                <Link to="/login" className="text-slate-500 hover:text-white transition-colors text-[8px] font-black uppercase tracking-[0.2em]">Return to Login Terminal</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="text-center space-y-1">
                <ShieldCheck className="w-8 h-8 text-red-500 mx-auto mb-1 opacity-50" />
                <h3 className="text-md font-black text-white uppercase italic">Final Validation</h3>
                <p className="text-slate-500 text-[9px] font-bold">Awaiting code for {formData.email}</p>
              </div>
              <input required maxLength={4} value={formData.otp} onChange={(e) => setFormData({ ...formData, otp: e.target.value })} placeholder="0000" className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2.5 text-center text-2xl font-black tracking-[0.4em] focus:border-red-500 text-white outline-none" />
              
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-[9px] font-bold bg-red-500/5 p-2.5 rounded-lg border border-red-500/10">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="w-full vibrant-gradient text-white font-black py-2.5 rounded-xl shadow-xl text-[9px] uppercase tracking-widest active:scale-[0.98] transition-all">Complete Application</button>
              
              <div className="flex flex-col gap-2 pt-3 border-t border-white/5 text-center">
                <button 
                  type="button" 
                  onClick={() => handleNext()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-white transition-colors text-[8px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Retry in ${resendCooldown}s` : "Request New Code"}
                </button>
                <button type="button" onClick={() => setStep('details')} className="text-slate-600 hover:text-white transition-colors text-[7px] font-black uppercase tracking-widest underline underline-offset-4">Edit Details</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;