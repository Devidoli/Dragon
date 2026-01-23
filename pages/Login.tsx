import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState } from '../types';
import { EmailService } from '../services';
import { Mail, ArrowRight, ShieldCheck, Flame, Loader2, KeyRound, MonitorCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface LoginProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  users: User[];
}

const ADMIN_EMAILS = [
  'olidevid203@gmail.com',
  'olidevid204@gmail.com',
  'olielina3@gmail.com',
  'pokharrajoli12@gmail.com'
];

const Login: React.FC<LoginProps> = ({ setAuth, users }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'trusting'>('email');
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

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    let user = users.find(u => u.email === cleanEmail);
    const isAdmin = ADMIN_EMAILS.includes(cleanEmail);

    if (!user && !isAdmin) {
      setError('Email not found in our distributor network.');
      return;
    }

    const isTrusted = localStorage.getItem(`dragon_trusted_device_${cleanEmail}`) === 'true';
    if (isTrusted && step === 'email') {
      setStep('trusting');
      setTimeout(() => {
        if (isAdmin) {
          user = user ? { ...user, role: 'admin', status: 'approved' } : {
            id: 'ADMIN-' + cleanEmail.split('@')[0],
            email: cleanEmail,
            role: 'admin',
            status: 'approved',
            shopName: 'Dragon Admin',
            address: 'Dragon HQ',
            phone: 'N/A',
            createdAt: new Date().toISOString()
          };
        }
        
        if (user) {
          setAuth({ user, isAuthenticated: true });
          navigate('/');
        } else {
          setStep('email');
          setError('Trust token expired. Please re-verify.');
        }
      }, 1200);
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
      // If Brevo fails but it's an admin, we bypass by showing the code in the console.
      if (isAdmin) {
        console.warn('!!! ADMIN DEBUG: Email dispatch failed. Use this code to login:', code);
        setGeneratedOtp(code);
        setStep('otp');
        setResendCooldown(30);
        setError('Email service is currently offline. Code sent to terminal console for Admin access.');
      } else {
        setError('Verification network error. Check Vercel environment variables or contact support.');
      }
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase();
    if (otp === generatedOtp) {
      localStorage.setItem(`dragon_trusted_device_${cleanEmail}`, 'true');
      
      let user = users.find(u => u.email === cleanEmail);
      const isAdmin = ADMIN_EMAILS.includes(cleanEmail);

      if (isAdmin) {
        user = user ? { ...user, role: 'admin', status: 'approved' } : {
          id: 'ADMIN-' + cleanEmail.split('@')[0],
          email: cleanEmail,
          role: 'admin',
          status: 'approved',
          shopName: 'Dragon Admin',
          address: 'Dragon HQ',
          phone: 'N/A',
          createdAt: new Date().toISOString()
        };
      }

      if (user) {
        setAuth({ user, isAuthenticated: true });
        navigate('/');
      }
    } else {
      setError('Invalid security code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[380px] relative">
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-red-600/5 rounded-full blur-[100px] animate-pulse"></div>
        
        <div className="text-center mb-10 space-y-3 relative z-10">
          <div className="inline-flex p-3 vibrant-gradient rounded-xl shadow-2xl shadow-red-500/20 mb-1">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white uppercase italic">Dragon Suppliers</h1>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Official B2B Merchant Terminal</p>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-2xl border border-white/5 relative z-10">
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Secure Email Access</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-red-500 transition-colors" />
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="merchant@gmail.com" 
                    className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-white font-bold focus:outline-none focus:border-red-500 transition-all text-xs"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-[10px] font-black leading-tight bg-red-500/5 p-3 rounded-lg border border-red-500/10 animate-in fade-in zoom-in-95">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSending} 
                className="w-full vibrant-gradient text-white font-black py-3 rounded-xl shadow-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Entry"}
                {!isSending && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
              
              <div className="pt-4 border-t border-white/5 text-center">
                <Link to="/signup" className="text-slate-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  Enroll New Merchant <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-white tracking-tight uppercase italic">Identity Verification</h3>
                <p className="text-slate-500 text-[10px] font-bold">Check <span className="text-slate-300 underline">{email}</span></p>
              </div>
              
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 opacity-10" />
                <input 
                  type="text" 
                  required 
                  maxLength={4} 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="0000" 
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-3 text-center text-3xl font-black tracking-[0.4em] focus:outline-none focus:border-red-500 text-white placeholder:text-slate-800"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-[10px] font-black bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                className="w-full vibrant-gradient text-white font-black py-3 rounded-xl shadow-xl text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all"
              >
                Unlock Dashboard
              </button>
              
              <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => handleSendCode()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="text-slate-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend In ${resendCooldown}s` : "Retry Security Signal"}
                </button>
                <button type="button" onClick={() => setStep('email')} className="text-slate-600 hover:text-white transition-colors text-[8px] font-black uppercase tracking-widest underline underline-offset-4">Modify Access Email</button>
              </div>
            </form>
          )}

          {step === 'trusting' && (
            <div className="py-10 flex flex-col items-center space-y-4 animate-in zoom-in duration-300">
              <div className="relative p-4 bg-emerald-500/10 rounded-full">
                 <MonitorCheck className="w-10 h-10 text-emerald-500 relative" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-md font-black text-white tracking-tight uppercase">Terminal Identified</h3>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">Establishing Session...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;