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
      setError('Merchant ID not recognized in our database.');
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
      }, 1000);
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
      if (isAdmin) {
        console.warn('--- DRAGON ADMIN BYPASS ---');
        console.warn(`Email: ${cleanEmail}`);
        console.warn(`Security Code: ${code}`);
        console.warn('Fix: Ensure VITE_BREVO_API_KEY is correct & olidevid203@gmail.com is a verified sender in Brevo dashboard.');
        console.warn('---------------------------');
        
        setGeneratedOtp(code);
        setStep('otp');
        setResendCooldown(30);
        setError('Verification service offline. Admin bypass active: check browser console (F12) for code.');
      } else {
        setError('Failed to send verification code. Ensure your Brevo sender is verified or contact support.');
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
      <div className="w-full max-w-[340px] relative">
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-600/5 rounded-full blur-[80px]"></div>
        
        <div className="text-center mb-8 space-y-2 relative z-10">
          <div className="inline-flex p-2.5 vibrant-gradient rounded-xl shadow-2xl shadow-red-500/10 mb-1">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase italic">Dragon Suppliers</h1>
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">Official B2B Terminal</p>
        </div>

        <div className="glass p-7 rounded-[2rem] shadow-2xl border border-white/5 relative z-10">
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Secure Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="merchant@gmail.com" 
                    className="w-full bg-slate-900/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white font-bold focus:outline-none focus:border-red-500/50 transition-all text-[11px]"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-[9px] font-bold bg-red-500/5 p-2.5 rounded-lg border border-red-500/10">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSending} 
                className="w-full vibrant-gradient text-white font-black py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Access Terminal"}
                {!isSending && <ArrowRight className="w-3 h-3" />}
              </button>
              
              <div className="pt-3 border-t border-white/5 text-center">
                <Link to="/signup" className="text-slate-500 hover:text-white transition-colors text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
                  Enroll New Merchant <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-md font-black text-white tracking-tight uppercase italic">Security Shield</h3>
                <p className="text-slate-500 text-[9px] font-bold italic">Verify: {email}</p>
              </div>
              
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  maxLength={4} 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="0000" 
                  className="w-full bg-slate-900/60 border border-white/5 rounded-xl py-2.5 text-center text-2xl font-black tracking-[0.4em] focus:outline-none focus:border-red-500 text-white placeholder:text-slate-800"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-[9px] font-bold bg-red-500/5 p-2.5 rounded-lg border border-red-500/10">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                className="w-full vibrant-gradient text-white font-black py-2.5 rounded-xl shadow-xl text-[9px] uppercase tracking-widest active:scale-[0.98] transition-all"
              >
                Unlock Dashboard
              </button>
              
              <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => handleSendCode()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="text-slate-500 hover:text-white transition-colors text-[8px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Retry in ${resendCooldown}s` : "Resend Signal"}
                </button>
                <button type="button" onClick={() => setStep('email')} className="text-slate-600 hover:text-white transition-colors text-[7px] font-black uppercase tracking-widest underline underline-offset-4">Change ID</button>
              </div>
            </form>
          )}

          {step === 'trusting' && (
            <div className="py-8 flex flex-col items-center space-y-3 animate-in zoom-in duration-300">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                 <MonitorCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center space-y-0.5">
                <h3 className="text-sm font-black text-white tracking-tight uppercase">Terminal Recognized</h3>
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] animate-pulse">Syncing Session...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;