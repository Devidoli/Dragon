import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState } from '../types';
import { EmailService } from '../services';
import { Mail, ArrowRight, Flame, Loader2, MonitorCheck, RefreshCw, AlertCircle } from 'lucide-react';

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
  const [email, setEmail] = useState(() => localStorage.getItem('dragon_last_email') || '');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'trusting'>('email');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  // Auto-check for trusted device on load
  useEffect(() => {
    const lastEmail = localStorage.getItem('dragon_last_email');
    if (lastEmail) {
      const isTrusted = localStorage.getItem(`dragon_trusted_device_${lastEmail.toLowerCase()}`) === 'true';
      if (isTrusted && users.length > 0) {
        handleSendCode(undefined, lastEmail);
      }
    }
  }, [users]);

  useEffect(() => {
    let timer: number;
    if (resendCooldown > 0) {
      timer = window.setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendCode = async (e?: React.FormEvent, directEmail?: string) => {
    e?.preventDefault();
    const cleanEmail = (directEmail || email).trim().toLowerCase();
    
    // Check if user exists
    let user = users.find(u => u.email === cleanEmail);
    const isAdmin = ADMIN_EMAILS.includes(cleanEmail);

    if (!user && !isAdmin) {
      if (!directEmail) setError('Merchant email not found in our database.');
      return;
    }

    // Save last email
    localStorage.setItem('dragon_last_email', cleanEmail);

    // Device Recognition Logic
    const isTrusted = localStorage.getItem(`dragon_trusted_device_${cleanEmail}`) === 'true';
    
    if (isTrusted) {
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
          setError('Trust token validation failed. Please re-enter email.');
        }
      }, 500);
      return;
    }

    // Normal OTP flow
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
      setError('Verification service unavailable. Ensure your Brevo API key and sender are verified.');
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase();
    if (otp === generatedOtp) {
      // Mark device as trusted
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
      setError('Invalid security code. Please check and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[400px] relative">
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-red-600/5 rounded-full blur-[100px]"></div>
        
        <div className="text-center mb-10 space-y-4 relative z-10">
          <div className="inline-flex p-4 bg-red-600 rounded-2xl shadow-xl mb-2">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">Dragon Suppliers</h1>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500">Official Merchant Portal</p>
        </div>

        <div className="glass p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative z-10">
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Access Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="merchant@example.com" 
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-medium focus:outline-none focus:border-red-500 transition-all text-base"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 text-red-400 text-xs font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSending} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authorize Entry"}
                {!isSending && <ArrowRight className="w-4 h-4" />}
              </button>
              
              <div className="pt-6 border-t border-white/5 text-center">
                <Link to="/signup" className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  Enroll New Merchant <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight uppercase">Security Shield</h3>
                <p className="text-slate-500 text-xs font-bold">Sent to: {email}</p>
              </div>
              
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  maxLength={4} 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="0000" 
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-4 text-center text-4xl font-black tracking-[0.5em] focus:outline-none focus:border-red-500 text-white placeholder:text-slate-800"
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 text-red-400 text-xs font-bold bg-red-500/5 p-4 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg text-sm uppercase tracking-widest active:scale-[0.98] transition-all"
              >
                Verify & Unlock
              </button>
              
              <div className="flex flex-col gap-4 pt-6 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => handleSendCode()} 
                  disabled={resendCooldown > 0 || isSending}
                  className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Security Code"}
                </button>
                <button type="button" onClick={() => setStep('email')} className="text-slate-600 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest underline underline-offset-4">Change Email</button>
              </div>
            </form>
          )}

          {step === 'trusting' && (
            <div className="py-12 flex flex-col items-center space-y-6 animate-in zoom-in duration-300">
              <div className="p-5 bg-emerald-500/10 rounded-full">
                 <MonitorCheck className="w-12 h-12 text-emerald-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight uppercase leading-none">Terminal Recognized</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Establishing Session...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;