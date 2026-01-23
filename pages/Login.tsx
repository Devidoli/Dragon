import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState } from '../types';
import { EmailService } from '../services';
import { Mail, ArrowRight, ShieldCheck, Flame, Loader2, KeyRound, MonitorCheck, RefreshCw } from 'lucide-react';

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
      setError('Failed to send verification code. Please check your internet or contact support.');
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
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md relative">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-red-600/10 rounded-full blur-[80px] animate-pulse"></div>
        
        <div className="text-center mb-8 space-y-2 relative z-10">
          <div className="inline-flex p-4 vibrant-gradient rounded-2xl shadow-xl shadow-red-500/10 mb-2">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Dragon Suppliers</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">B2B Merchant Terminal</p>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-2xl border border-white/5 relative z-10">
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Access Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-red-500 transition-colors" />
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="merchant@gmail.com" 
                    className="w-full bg-slate-900/40 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white font-semibold focus:outline-none focus:border-red-500 transition-all text-sm"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs font-bold text-center bg-red-500/5 py-2.5 rounded-lg animate-in fade-in slide-in-from-top-1">{error}</p>}

              <button 
                type="submit" 
                disabled={isSending} 
                className="w-full vibrant-gradient text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Entry"}
                {!isSending && <ArrowRight className="w-4 h-4" />}
              </button>
              
              <div className="pt-4 border-t border-white/5 text-center">
                <Link to="/signup" className="text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                  Request Access Account <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-white tracking-tight">Verify Identity</h3>
                <p className="text-slate-400 text-[11px]">Code sent to <span className="text-slate-200">{email}</span></p>
              </div>
              
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500 opacity-20" />
                <input 
                  type="text" 
                  required 
                  maxLength={4} 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="0000" 
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-4 text-center text-3xl font-bold tracking-[0.4em] focus:outline-none focus:border-red-500 text-white"
                />
              </div>

              {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
              
              <button 
                type="submit" 
                className="w-full vibrant-gradient text-white font-bold py-3.5 rounded-xl shadow-lg text-sm active:scale-[0.98] transition-all"
              >
                Confirm Verification
              </button>
              
              <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => handleSendCode()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Retry in ${resendCooldown}s` : "Resend Security Code"}
                </button>
                <button type="button" onClick={() => setStep('email')} className="text-slate-600 hover:text-white transition-colors text-[9px] font-bold uppercase tracking-widest">Use Different Email</button>
              </div>
            </form>
          )}

          {step === 'trusting' && (
            <div className="py-12 flex flex-col items-center space-y-4 animate-in zoom-in duration-300">
              <div className="relative">
                 <MonitorCheck className="w-16 h-16 text-emerald-500 relative" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">Identity Recognized</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Initializing Secure Terminal...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;