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
    if (users.find(u => u.email === formData.email.toLowerCase())) {
      setError('This email is already registered.');
      return;
    }
    
    setIsSending(true);
    setError('');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const success = await EmailService.sendOTP(formData.email, code);
    
    setIsSending(false);
    if (success) {
      setGeneratedOtp(code);
      setStep('otp');
      setResendCooldown(30);
    } else {
      setError('Failed to send verification code. Ensure your Brevo sender is verified.');
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
      setError('Invalid code.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-md">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex p-4 vibrant-gradient rounded-2xl shadow-xl mb-2">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Merchant Application</h1>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-2xl border border-white/10 relative">
          <div className="absolute top-0 right-0 w-1 h-full vibrant-gradient"></div>
          {step === 'details' ? (
            <form onSubmit={handleNext} className="space-y-5">
              <input required value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} placeholder="Business Shop Name" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white" />
              <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Business Gmail" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white" />
              <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="98XXXXXXXX" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white" />
              <input required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Physical Address" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none font-bold text-white" />
              {error && <p className="text-red-400 text-sm font-bold text-center bg-red-500/10 py-2 rounded-xl">{error}</p>}
              <button type="submit" disabled={isSending} className="w-full vibrant-gradient text-white font-black py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 text-lg">
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify Identity"}
              </button>
              <div className="text-center pt-2">
                <Link to="/login" className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Already have an account? Login</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="text-center">
                <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-2" />
                <h3 className="text-2xl font-black text-white">Enter Code</h3>
                <p className="text-slate-400 text-sm">Sent to: {formData.email}</p>
              </div>
              <input required maxLength={4} value={formData.otp} onChange={(e) => setFormData({ ...formData, otp: e.target.value })} placeholder="0000" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-4 text-center text-4xl font-black tracking-[0.5em] focus:ring-2 focus:ring-red-500 text-white" />
              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
              <button type="submit" className="w-full vibrant-gradient text-white font-black py-4 rounded-xl shadow-xl text-xl">Submit Application</button>
              
              <div className="flex flex-col gap-2 pt-2 text-center">
                <button 
                  type="button" 
                  onClick={() => handleNext()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
                <button type="button" onClick={() => setStep('details')} className="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Back to Details</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;