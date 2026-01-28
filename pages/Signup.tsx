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
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleNext = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    
    if (users.find(u => u.email === cleanEmail)) {
      setError('This merchant email is already registered.');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const success = await EmailService.sendOTP(cleanEmail, code);
    
    setIsProcessing(false);
    if (success) {
      setGeneratedOtp(code);
      setStep('otp');
    } else {
      setError('Failed to send verification code.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp !== generatedOtp) {
      setError('Invalid security code.');
      return;
    }

    setIsProcessing(true);
    setError('');

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

    const dbRes = await SupabaseService.upsert('users', newUser);
    
    if (dbRes.success) {
      setUsers(prev => [...prev, newUser]);
      setAuth({ user: newUser, isAuthenticated: true });
      navigate('/');
    } else {
      setIsProcessing(false);
      setError(`Database Error: ${dbRes.error}. (Tip: Ensure table 'users' exists and RLS is disabled)`);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex p-4 bg-red-600 rounded-2xl shadow-lg">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Enroll Merchant</h1>
        </div>

        <div className="glass p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative">
          {step === 'details' ? (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="space-y-4">
                <input required value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} placeholder="Business Name" className="w-full bg-slate-900 border border-white/10 rounded-xl py-3.5 px-4 text-white" />
                <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" className="w-full bg-slate-900 border border-white/10 rounded-xl py-3.5 px-4 text-white" />
                <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone Number" className="w-full bg-slate-900 border border-white/10 rounded-xl py-3.5 px-4 text-white" />
                <input required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Shop Address" className="w-full bg-slate-900 border border-white/10 rounded-xl py-3.5 px-4 text-white" />
              </div>
              
              {error && (
                <div className="flex items-start gap-3 text-red-400 text-xs font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <button type="submit" disabled={isProcessing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest transition-all">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Information"}
              </button>
              
              <div className="text-center pt-6">
                <Link to="/login" className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest">Login Instead</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-red-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white uppercase">Verification</h3>
                <p className="text-slate-500 text-xs font-bold">Sent to {formData.email}</p>
              </div>
              <input required maxLength={4} value={formData.otp} onChange={(e) => setFormData({ ...formData, otp: e.target.value })} placeholder="0000" className="w-full bg-slate-900 border border-white/10 rounded-xl py-4 text-center text-4xl font-black text-white" />
              
              {error && (
                <div className="flex items-start gap-3 text-red-400 text-xs font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={isProcessing} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl uppercase tracking-widest">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Complete Registration"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;