import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { BrandMark } from '../../components/common/BrandMark';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { MountainRidge } from '../../components/common/MountainRidge';
import { useAuth, DEMO_USERS } from '../../data/api';

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        // 800ms loading transition overlay as specified
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 800);
      } else {
        setIsLoading(false);
        setError('Invalid email or password. Please verify your credentials.');
      }
    } catch {
      setIsLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleSelectDemoUser = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
    setShowDemoAccounts(false);
    setError('');
  };

  // Full-screen loading overlay after successful login
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAFAFA] flex flex-col items-center justify-center animate-fade-up">
        <div className="flex flex-col items-center gap-6">
          <BrandMark size="lg" />
          <div className="flex items-center gap-3">
            <svg
              className="animate-spin h-5 w-5 text-brand"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-display font-semibold text-ink text-base">
              Opening your workspace...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white selection:bg-brand-50 selection:text-brand text-left">
      {/* =========================================================================
          LEFT 50% PANEL: SOFT GREYSCALE SKY GRADIENT WITH MOUNTAIN SILHOUETTES
         ========================================================================= */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#DEDEDE] via-[#ECECEC] to-[#F8F8F8] flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Top Header */}
        <div className="z-10 flex flex-col gap-8">
          <Link to="/" className="no-underline">
            <BrandMark size="md" />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-neutral-300 text-[11px] font-bold tracking-eyebrow uppercase text-text-main w-fit">
            <span>VIIT · ADMIN WORKSPACE</span>
          </div>
        </div>

        {/* Center Headline & 3 Numbered Steps */}
        <div className="z-10 my-auto py-8">
          <h1 className="font-display text-5xl xl:text-[68px] font-bold text-[#1F2933] tracking-tightest leading-[1.0] max-w-lg">
            A closer campus
            <br />
            starts with you.
          </h1>

          <div className="mt-10 flex flex-col gap-4 max-w-md">
            <div className="flex items-center gap-4 text-text-main font-semibold text-base">
              <span className="w-8 h-8 rounded-full border border-neutral-400 bg-white/60 flex items-center justify-center text-xs font-bold text-muted shrink-0">
                01
              </span>
              <span>Choose your class</span>
            </div>

            <div className="flex items-center gap-4 text-text-main font-semibold text-base">
              <span className="w-8 h-8 rounded-full border border-neutral-400 bg-white/60 flex items-center justify-center text-xs font-bold text-muted shrink-0">
                02
              </span>
              <span>Prepare your campaign</span>
            </div>

            <div className="flex items-center gap-4 text-text-main font-semibold text-base">
              <span className="w-8 h-8 rounded-full border border-neutral-400 bg-white/60 flex items-center justify-center text-xs font-bold text-muted shrink-0">
                03
              </span>
              <span>Keep it all in view</span>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="z-10 flex items-center justify-between text-xs text-muted font-medium pt-8 border-t border-neutral-300/60">
          <span>Student updates. Meaningful connections.</span>
          <div className="flex items-center gap-2">
            <img
              src="/viit-logo.png"
              alt="VIIT Emblem"
              className="w-5 h-5 object-contain opacity-80"
            />
            <span className="font-semibold text-text-main">
              Vignan's Institute of Information Technology
            </span>
          </div>
        </div>

        {/* Vector SVG Mountain Ridge at Bottom */}
        <div className="absolute inset-x-0 bottom-0 h-64 z-0 pointer-events-none opacity-90">
          <MountainRidge className="h-full" fadeToWhite={false} />
        </div>
      </div>

      {/* =========================================================================
          RIGHT 50% PANEL: CLEAN WHITE SIGN-IN FORM (394px CENTERED COLUMN)
         ========================================================================= */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-between p-8 sm:p-12 xl:p-16 min-h-screen">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
          <div className="lg:hidden">
            <BrandMark size="sm" showSubtitle={false} />
          </div>
        </div>

        {/* Centered Form Column (394px) */}
        <div className="w-full max-w-[394px] mx-auto my-auto py-10 flex flex-col">
          {/* 58px Rounded Icon Box with Lock */}
          <div className="w-[58px] h-[58px] rounded-2xl bg-icon-box border border-hairline flex items-center justify-center text-ink shadow-soft mb-6">
            <Lock className="w-6 h-6" />
          </div>

          <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand mb-1">
            Admin Portal
          </span>
          <h2 className="font-display text-4xl sm:text-[44px] font-bold text-ink tracking-tight leading-tight">
            Welcome back.
          </h2>
          <p className="mt-1.5 text-sm text-muted font-normal">
            Sign in to your workspace.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              icon={<Mail className="w-4 h-4" />}
              autoComplete="username"
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              icon={<Lock className="w-4 h-4" />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted hover:text-ink p-1 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="p-3 rounded-input bg-red-50 border border-red-200 text-xs font-semibold text-red-600 animate-fade-up">
                {error}
              </div>
            )}

            {/* Black Pill Button (52px high, radius 28px) */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-[52px] rounded-btn font-bold text-base shadow-soft hover:shadow-md mt-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign in
            </Button>
          </form>

          {/* Security Note */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-muted select-none">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized staff only</span>
          </div>

          {/* Demo Accounts Dropdown (Only in Demo Mode) */}
          {IS_DEMO_MODE && (
            <div className="mt-8 pt-6 border-t border-hairline flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                <span>Demo accounts quick-select</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showDemoAccounts ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showDemoAccounts && (
                <div className="mt-3 w-full p-2 bg-[#F9FAFB] rounded-input border border-hairline flex flex-col gap-1 text-xs animate-fade-up">
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => handleSelectDemoUser(u.email)}
                      className="w-full px-3 py-2 text-left rounded-md hover:bg-white hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-ink">{u.fullName || u.username}</div>
                        <div className="text-[11px] text-muted">{u.email}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200/70 text-text-main uppercase">
                        {u.role.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted/70 select-none">
          VIIT AI Feedback · Intelligent Parent Communication
        </div>
      </div>
    </div>
  );
};
