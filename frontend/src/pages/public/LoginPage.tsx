import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { INITIAL_USERS } from '../../data/initialData';
import { setActiveUser } from '../../data/api';
import { User } from '../../data/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@viit.ac.in');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check demo mode flag
  const isDemoMode = true; // Enabled for testing and evaluation

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Simulate network latency (250ms)
    setTimeout(async () => {
      const foundUser = INITIAL_USERS.find(
        u => u.email.toLowerCase() === email.toLowerCase().trim()
      );

      if (foundUser && password.length >= 4) {
        await setActiveUser(foundUser);
        setIsLoading(false);
        navigate('/app');
      } else {
        setIsLoading(false);
        setErrorMessage('Invalid institutional credentials. Please verify your email and password.');
      }
    }, 250);
  };

  const handleDemoAccountSelect = async (user: User) => {
    setEmail(user.email);
    setPassword('demo123');
    await setActiveUser(user);
    navigate('/app');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-surface">
      {/* Left Column: Institutional Brand & Process Steps (Like Reference Video) */}
      <div className="lg:col-span-5 bg-brand-dark text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Soft background shape */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-brand/20 blur-3xl pointer-events-none" />

        <div className="space-y-8 relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <img
              src="/viit-logo.png"
              alt="VIIT Emblem"
              className="w-12 h-12 object-contain rounded-full bg-white p-0.5 shadow-md"
            />
            <div>
              <div className="text-base font-bold text-white leading-tight">VIIT AI Feedback</div>
              <div className="text-xs font-medium text-brand-accent uppercase tracking-wider">
                Department of CSE
              </div>
            </div>
          </Link>

          <div className="space-y-3 pt-6">
            <div className="text-xs font-bold text-brand-accent uppercase tracking-widest">
              VIIT · ADMIN WORKSPACE
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
              A closer campus starts with you.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
              Verify attendance, listen to parent observations, and follow through on every student need in one focused workspace.
            </p>
          </div>

          {/* 3 Short Steps */}
          <div className="space-y-4 pt-4">
            {[
              { num: '01', title: 'Choose class', desc: 'Pick your academic department, semester, and section.' },
              { num: '02', title: 'Upload list', desc: 'Drop your day attendance sheet to detect absentees.' },
              { num: '03', title: 'Automated outreach', desc: 'Voice assistant contacts parents and registers feedback.' },
            ].map(step => (
              <div key={step.num} className="flex items-start gap-3.5">
                <span className="text-xs font-mono font-bold text-brand-accent px-2 py-0.5 rounded bg-white/10 shrink-0 mt-0.5">
                  {step.num}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                  <p className="text-xs text-slate-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Left Bottom Security Note */}
        <div className="pt-8 border-t border-white/10 text-xs text-slate-400 flex items-center gap-2 relative z-10">
          <ShieldCheck className="w-4 h-4 text-brand-accent shrink-0" />
          <span>Institutional encryption active. All parent numbers strictly masked.</span>
        </div>
      </div>

      {/* Right Column: Clean White Login Card */}
      <div className="lg:col-span-7 bg-page flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-surface rounded-card border border-border shadow-float p-8 sm:p-10 space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-ink-900 tracking-tight">Welcome back.</h2>
            <p className="text-sm text-ink-500">Sign in to your authorized staff account.</p>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2.5 p-3 rounded-lg bg-danger-tint border border-danger-border text-danger-text text-xs font-medium animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@viit.ac.in"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-surface border border-border rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-ink-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-surface border border-border rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-ink-400 hover:text-ink-600 absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full py-2.5 mt-2 gap-2"
              isLoading={isLoading}
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Demo Accounts Quick Dropdown (Shown only when isDemoMode=true) */}
          {isDemoMode && (
            <div className="pt-4 border-t border-border space-y-2">
              <div className="text-[11px] font-bold text-ink-400 uppercase tracking-wider text-center">
                Instant Demo Access (Click to sign in)
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoAccountSelect(INITIAL_USERS[0])}
                  className="p-2 rounded border border-border bg-page hover:bg-brand-50 hover:border-brand-100 text-left transition-colors"
                >
                  <div className="font-semibold text-ink-900">Admin</div>
                  <div className="text-[11px] text-ink-500">Dr. Ch. V. Rao</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoAccountSelect(INITIAL_USERS[2])}
                  className="p-2 rounded border border-border bg-page hover:bg-brand-50 hover:border-brand-100 text-left transition-colors"
                >
                  <div className="font-semibold text-ink-900">Faculty (CSE)</div>
                  <div className="text-[11px] text-ink-500">Prof. K. Ramesh</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoAccountSelect(INITIAL_USERS[5])}
                  className="p-2 rounded border border-border bg-page hover:bg-brand-50 hover:border-brand-100 text-left transition-colors"
                >
                  <div className="font-semibold text-ink-900">Hostel Dean</div>
                  <div className="text-[11px] text-ink-500">Mr. P. V. Ramana</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoAccountSelect(INITIAL_USERS[6])}
                  className="p-2 rounded border border-border bg-page hover:bg-brand-50 hover:border-brand-100 text-left transition-colors"
                >
                  <div className="font-semibold text-ink-900">Bus Correspondent</div>
                  <div className="text-[11px] text-ink-500">Mr. T. Naidu</div>
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-ink-400 pt-2">
            Authorized staff only · VIIT Autonomous Visakhapatnam
          </div>
        </div>
      </div>
    </div>
  );
};
