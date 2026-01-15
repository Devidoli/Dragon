import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, AuthState } from '../types.ts';
import { Mail, ArrowRight, ShieldCheck, Flame, Loader2, KeyRound } from 'lucide-react';

interface LoginProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ setAuth, users }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid business email');
      return;
    }
    
    const user = users.find(u => u.email === cleanEmail);
    if (!user) {
      setError('No registered partner found with this email.');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setError('');
      setStep('otp');
      alert(`[Dragon Suppliers] Your access code is: 1234`);
    }, 1200);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '1234') {
      const user = users.find(u => u.email === email.toLowerCase());
      if (user) {
        setAuth({ user, isAuthenticated: true });
        navigate('/');
      }
    } else {
      setError('Invalid code. Use 1234 for demo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex p-5 vibrant-gradient rounded-3xl shadow-2xl animate-pulse">
            <Flame className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Dragon Suppliers</h1>
          <p className="text-slate-400 font-medium tracking-wide italic">B2B Merchant Portal (Nepal)</p>
        </div>

        <div className="glass p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full vibrant-gradient"></div>
          
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300 px-1">Registered Business Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="merchant@example.com"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-white font-bold"
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
              <button
                type="submit"
                disabled={isSending}
                className="w-full vibrant-gradient text-white font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
              >
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify Merchant"}
                {!isSending && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-2 text-center">
                <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <h3 className="text-xl font-black text-white">Security Verification</h3>
                <p className="text-slate-400 text-sm">Sent to <span className="text-white font-bold">{email}</span></p>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="0000"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-12 text-center text-4xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-red-500 text-white"
                />
              </div>
              {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
              <button
                type="submit"
                className="w-full vibrant-gradient text-white font-black py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xl"
              >
                Authenticate & Enter
              </button>
              <button type="button" onClick={() => setStep('email')} className="w-full py-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
                Use Different Email
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-8 text-slate-400 font-medium">
          New Business Partner?{' '}
          <Link to="/signup" className="text-red-500 font-black hover:underline">Apply for Partnership</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;