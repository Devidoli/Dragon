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
      setError('No registered partner found with this email.');
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
          setError('Security sync error. Please verify manually.');
        }
      }, 1500);
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
      setError('Communication error. Verify your account status.');
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
      setError('Invalid code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg relative">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-red-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

        <div className="text-center mb-10 space-y-3 relative z-10">
          <div className="inline-flex p-5 vibrant-gradient rounded-[2rem] shadow-2xl shadow-red-500/20 mb-4 scale-110">
            <Flame className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Dragon Suppliers</h1>
          <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">B2B Merchant Terminal</p>
        </div>

        <div className="glass p-10 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10 relative z-10">
          <div className="absolute top-0 right-0 w-2 h-full vibrant-gradient rounded-r-[3rem] opacity-50"></div>
          
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Business Access Email</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within:text-red-500 transition-colors" />
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="merchant@gmail.com" 
                    className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-[1.5rem] py-5 pl-14 pr-6 text-white font-bold focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-lg"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-black text-center bg-red-500/10 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2">{error}</p>}

              <button 
                type="submit" 
                disabled={isSending} 
                className="w-full vibrant-gradient text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-red-500/30 flex items-center justify-center gap-3 text-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Open Session"}
                {!isSending && <ArrowRight className="w-6 h-6" />}
              </button>
              
              <div className="pt-6 border-t border-white/5 text-center">
                <Link to="/signup" className="text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  Apply for Distribution Account <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-red-500/10 rounded-2xl mb-2">
                  <ShieldCheck className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Security Check</h3>
                <p className="text-slate-400 text-sm font-medium">Verify login for: <span className="text-white underline">{email}</span></p>
              </div>
              
              <div className="relative">
                <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-red-500 opacity-20" />
                <input 
                  type="text" 
                  required 
                  maxLength={4} 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="0000" 
                  className="w-full bg-slate-900 border-2 border-slate-800 rounded-[2rem] py-6 text-center text-5xl font-black tracking-[0.5em] focus:outline-none focus:border-red-500 focus:ring-8 focus:ring-red-500/5 text-white shadow-inner"
                />
              </div>

              {error && <p className="text-red-400 text-sm font-black text-center">{error}</p>}
              
              <button 
                type="submit" 
                className="w-full vibrant-gradient text-white font-black py-6 rounded-[1.5rem] shadow-2xl text-xl hover:shadow-red-500/40 transition-all active:scale-95"
              >
                Authorize & Continue
              </button>
              
              <div className="flex flex-col gap-4 pt-6 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => handleSendCode()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Request New Code"}
                </button>
                <button type="button" onClick={() => setStep('email')} className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Change Access Email</button>
              </div>
            </form>
          )}

          {step === 'trusting' && (
            <div className="py-16 flex flex-col items-center space-y-6 animate-in zoom-in duration-500">
              <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full"></div>
                 <MonitorCheck className="w-20 h-20 text-emerald-500 relative" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-black text-white tracking-tighter">Identity Recognized</h3>
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Resuming Secure B2B Session...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;