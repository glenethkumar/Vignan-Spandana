import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  UserCheck,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { getActiveUser, setActiveUser } from '../../data/api';
import { INITIAL_USERS } from '../../data/initialData';
import { UserRole } from '../../data/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('mdsohel46940@gmail.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      // Find matching user or fallback to admin
      const matched = INITIAL_USERS.find(
        u => u.email.toLowerCase() === email.toLowerCase() || u.username === email.toLowerCase()
      ) || INITIAL_USERS[0];

      await setActiveUser(matched);
      showToast(`Welcome back, ${matched.fullName}`, 'success');
      setIsLoading(false);
      navigate('/app');
    }, 600);
  };

  const handleQuickDemoSelect = async (role: UserRole) => {
    const matched = INITIAL_USERS.find(u => u.role === role) || INITIAL_USERS[0];
    setEmail(matched.email);
    setPassword('password123');
    await setActiveUser(matched);
    showToast(`Loaded ${matched.fullName} (${matched.role})`, 'info');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-surface font-sans">
      {/* Left Panel: Mountain Topography & Narrative (50% desktop) */}
      <div className="hidden lg:flex lg:col-span-6 bg-page p-12 lg:p-16 flex-col justify-between relative overflow-hidden border-r border-border">
        {/* Soft grayscale mountain contour SVG */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-end justify-center opacity-60">
          <svg
            className="w-full h-[520px] object-cover"
            viewBox="0 0 800 520"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 520 L0 300 Q 200 180 400 280 T 800 240 L 800 520 Z"
              fill="#CBD5E1"
              opacity="0.4"
            />
            <path
              d="M0 520 L0 370 Q 180 250 420 340 T 800 320 L 800 520 Z"
              fill="#94A3B8"
              opacity="0.5"
            />
            <path
              d="M0 520 L0 440 Q 150 330 380 410 T 800 400 L 800 520 Z"
              fill="#64748B"
              opacity="0.6"
            />
          </svg>
        </div>

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center p-1.5 shadow-xs text-white">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <rect x="3" y="8" width="2.5" height="8" rx="1.25" fill="currentColor" />
              <rect x="8.5" y="4" width="2.5" height="16" rx="1.25" fill="currentColor" />
              <rect x="14" y="9" width="2.5" height="10" rx="1.25" fill="currentColor" />
              <rect x="19.5" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-ink-900 leading-tight">VIIT AI Feedback</div>
            <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
              DEPARTMENT OF CSE
            </div>
          </div>
        </div>

        {/* Center Display Headline & 3-Step Checklist */}
        <div className="relative z-10 space-y-10 max-w-lg my-auto py-12">
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-brand uppercase tracking-[0.18em]">
              VIIT · ADMIN WORKSPACE
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-ink-900 tracking-tight leading-[1.12]">
              A closer<br />campus starts<br />with you.
            </h1>
          </div>

          {/* 3 Step Flow Checklist */}
          <div className="space-y-4 pt-2">
            {[
              { num: '01', title: 'Choose your class' },
              { num: '02', title: 'Prepare your campaign' },
              { num: '03', title: 'Keep it all in view' },
            ].map(step => (
              <div key={step.num} className="flex items-center gap-4 text-sm font-semibold text-ink-800">
                <span className="w-6 h-6 rounded-full border border-ink-300 text-[11px] font-mono flex items-center justify-center text-ink-500 font-bold">
                  {step.num}
                </span>
                <span>{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Left Footer */}
        <div className="relative z-10 text-xs text-ink-400 font-medium">
          Student updates. Meaningful connections.
        </div>
      </div>

      {/* Right Panel: White Card Login Form (50% desktop) */}
      <div className="lg:col-span-6 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Top Back Link */}
        <div className="flex items-center justify-between pb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-ink-500 hover:text-ink-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Center Form Container */}
        <div className="my-auto space-y-6 w-full">
          {/* Rounded Lock Icon Box */}
          <div className="w-12 h-12 rounded-2xl bg-page border border-border flex items-center justify-center text-ink-700 shadow-xs">
            <Lock className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">
              ADMIN PORTAL
            </div>
            <h2 className="text-3xl font-extrabold text-ink-900 tracking-tight">
              Welcome back.
            </h2>
            <p className="text-sm text-ink-500">Sign in to your workspace.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-700">
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-ink-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-ink-900 placeholder:text-ink-400 focus:outline-hidden focus:border-brand focus:ring-2 focus:ring-brand-50"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-700">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-ink-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-surface text-sm text-ink-900 placeholder:text-ink-400 focus:outline-hidden focus:border-brand focus:ring-2 focus:ring-brand-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-ink-400 hover:text-ink-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button (Black Pill) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-full bg-brand-dark text-white text-sm font-semibold hover:bg-ink-900 transition-all shadow-card flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Opening workspace...' : 'Sign in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="pt-4 border-t border-border space-y-2">
            <div className="text-[10px] font-bold text-ink-400 uppercase tracking-wider flex items-center justify-between">
              <span>Quick Demo Role Sign In</span>
              <span className="text-brand font-semibold">Demo Mode</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { r: 'admin', label: 'Administrator', email: 'mdsohel46940@gmail.com' },
                { r: 'principal', label: 'Principal (Full Access)', email: 'principal@viit.ac.in' },
                { r: 'faculty', label: 'Faculty (CSE)', email: 'ramesh.k@viit.ac.in' },
                { r: 'hostel_dean', label: 'Hostel Dean', email: 'hostel.dean@viit.ac.in' },
              ].map(demo => (
                <button
                  key={demo.r}
                  type="button"
                  onClick={() => handleQuickDemoSelect(demo.r as UserRole)}
                  className="p-2 rounded-lg border border-border bg-page hover:bg-surface hover:border-brand-300 text-left transition-all"
                >
                  <div className="font-bold text-ink-800 text-[11px] truncate">{demo.label}</div>
                  <div className="text-[10px] text-ink-400 truncate">{demo.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Footer Security Note */}
        <div className="pt-6 text-center text-xs text-ink-400 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-ink-400" />
          <span>Authorized administrators only</span>
        </div>
      </div>
    </div>
  );
};
