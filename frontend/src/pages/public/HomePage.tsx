import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Globe,
  RotateCcw,
  Users,
  Shield,
  GraduationCap,
  Building,
  Bus,
  ArrowRight,
  ExternalLink,
  Languages,
  Check,
  FileText,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const HomePage: React.FC = () => {
  const [phoneLang, setPhoneLang] = useState<'en' | 'te'>('en');

  return (
    <div className="min-h-screen bg-page text-ink-900 font-sans selection:bg-brand-50 selection:text-brand">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-page/90 backdrop-blur-md border-b border-border/80 h-20 flex items-center justify-between px-6 sm:px-12 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-dark flex items-center justify-center p-2 shadow-xs">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white">
              <rect x="3" y="8" width="2.5" height="8" rx="1.25" fill="currentColor" />
              <rect x="8.5" y="4" width="2.5" height="16" rx="1.25" fill="currentColor" />
              <rect x="14" y="9" width="2.5" height="10" rx="1.25" fill="currentColor" />
              <rect x="19.5" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-ink-900 leading-tight">VIIT AI Feedback</div>
            <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-[0.18em]">
              Department of CSE
            </div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-600">
          <a href="#home" className="hover:text-ink-900 transition-colors">Home</a>
          <a href="#how-it-works" className="hover:text-ink-900 transition-colors">How it works</a>
          <a href="#issue-resolution" className="hover:text-ink-900 transition-colors">Issue resolution</a>
        </nav>

        {/* Right CTA */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-ink-900 transition-all shadow-xs"
        >
          <span>Admin portal</span>
          <span className="font-mono text-xs">↗</span>
        </Link>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative pt-12 pb-24 overflow-hidden">
        {/* Mountain Landscape Background (Inline SVG Contours) */}
        <div className="absolute inset-0 pointer-events-none z-0 flex items-end justify-center opacity-70">
          <svg
            className="w-full h-[520px] max-w-7xl object-cover"
            viewBox="0 0 1440 520"
            fill="none"
            preserveAspectRatio="none"
          >
            {/* Soft background hill 1 */}
            <path
              d="M0 520 L0 320 Q 360 180 720 280 T 1440 220 L 1440 520 Z"
              fill="url(#hill-grad-1)"
              opacity="0.5"
            />
            {/* Midground hill 2 */}
            <path
              d="M0 520 L0 380 Q 280 260 620 340 T 1200 300 Q 1340 330 1440 370 L 1440 520 Z"
              fill="url(#hill-grad-2)"
              opacity="0.7"
            />
            {/* Foreground mountain ridgeline */}
            <path
              d="M0 520 L0 440 Q 220 340 500 410 T 1020 380 Q 1260 410 1440 450 L 1440 520 Z"
              fill="url(#hill-grad-3)"
              opacity="0.9"
            />
            <defs>
              <linearGradient id="hill-grad-1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="hill-grad-2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="hill-grad-3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748B" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border shadow-xs text-xs font-medium text-ink-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-ink-600">
              VIIT · INTELLIGENT PARENT COMMUNICATION
            </span>
          </div>

          {/* Large Bold Headlines */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-ink-900 tracking-tight leading-[1.08]">
              Connect with parents.
            </h1>
            <h2 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold text-ink-900 tracking-tight leading-[1.08]">
              Listen. Act. Resolve.
            </h2>
          </div>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-ink-500 max-w-xl mx-auto font-normal">
            Student updates. Parent feedback. One connected campus.
          </p>

          {/* Primary Action Button */}
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-brand-dark text-white text-sm font-semibold hover:bg-ink-900 transition-all shadow-card hover:scale-[1.02]"
            >
              <span>Prepare your call list</span>
              <span className="font-mono text-sm">↗</span>
            </Link>
          </div>

          {/* Interactive Phone Mockup with 4 Floating Cards */}
          <div className="pt-10 max-w-4xl mx-auto relative flex items-center justify-center">
            {/* Floating Card 1: Top Left */}
            <div className="hidden lg:flex absolute -left-6 top-12 p-4 bg-surface rounded-2xl border border-border/80 shadow-card items-center gap-3 w-64 text-left animate-in fade-in slide-in-from-left duration-500">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-ink-900 leading-tight">Student data, ready.</h4>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">Attendance · Marks · Feedback</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>

            {/* Floating Card 2: Top Right */}
            <div className="hidden lg:block absolute -right-6 top-8 p-4 bg-surface rounded-2xl border border-border/80 shadow-card w-72 text-left space-y-2.5 animate-in fade-in slide-in-from-right duration-500">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                  Summary saved
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink-900">Every conversation counts.</h4>
                <p className="text-[11px] text-ink-500 leading-relaxed mt-0.5">
                  Parent responses and call notes, together in one place.
                </p>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-ink-500 font-medium">
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-ink-400" />
                  <span>Ready for Excel</span>
                </span>
                <span className="font-mono text-xs">↗</span>
              </div>
            </div>

            {/* Floating Card 3: Bottom Left */}
            <div className="hidden lg:flex absolute -left-12 bottom-16 p-4 bg-surface rounded-2xl border border-border/80 shadow-card items-center gap-3 w-64 text-left animate-in fade-in slide-in-from-left duration-700">
              <div className="w-9 h-9 rounded-xl bg-page border border-border flex items-center justify-center shrink-0 text-ink-700 font-bold text-xs">
                文A
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-ink-900 leading-tight">A familiar conversation</h4>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">Telugu or English. Their choice.</p>
              </div>
            </div>

            {/* Floating Card 4: Bottom Right */}
            <div className="hidden lg:flex absolute -right-10 bottom-12 p-4 bg-surface rounded-2xl border border-border/80 shadow-card items-center gap-3 w-72 text-left animate-in fade-in slide-in-from-right duration-700">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-ink-900 leading-tight">A concern? We follow through.</h4>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">Assigned → Resolved → Confirmed</p>
              </div>
            </div>

            {/* Centered iPhone Frame */}
            <div className="w-[310px] sm:w-[330px] bg-ink-900 rounded-[44px] p-3 shadow-2xl border-4 border-ink-800">
              <div className="bg-surface rounded-[36px] overflow-hidden p-5 flex flex-col justify-between min-h-[440px] text-center relative">
                {/* Dynamic Island & Status Bar */}
                <div className="flex items-center justify-between text-[11px] font-bold text-ink-800 px-2 pt-1">
                  <span>9:41</span>
                  <div className="w-20 h-4 bg-ink-900 rounded-full mx-auto" />
                  <div className="flex items-center gap-1 text-[10px]">
                    <span>5G</span>
                    <div className="w-4 h-2 rounded-xs border border-ink-800 flex items-center p-0.5">
                      <div className="w-2 h-1 bg-ink-800" />
                    </div>
                  </div>
                </div>

                {/* In-Phone Header */}
                <div className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-ink-900 text-white font-bold text-[10px] flex items-center justify-center">
                      V
                    </span>
                    <span className="text-xs font-bold text-ink-900">VIIT AI Feedback</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-page border border-border text-ink-500">
                    PREVIEW
                  </span>
                </div>

                {/* In-Phone Body */}
                <div className="py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto shadow-xs">
                    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 stroke-[2] stroke-current">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-900 leading-tight">
                      A little conversation.<br />A better connection.
                    </h3>
                    <p className="text-[11px] text-ink-500 mt-1">
                      AI parent call · Attendance & mentoring
                    </p>
                  </div>

                  {/* Cyan Waveform Animation */}
                  <div className="flex items-center justify-center gap-1 h-8 pt-1">
                    {[12, 20, 28, 16, 24, 32, 18, 26, 14, 22, 30, 18, 24, 12].map((height, i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full bg-sky-500"
                        style={{
                          height: `${height}px`,
                          opacity: 0.7 + (i % 3) * 0.15,
                        }}
                      />
                    ))}
                  </div>

                  {/* Language Toggle Pills */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setPhoneLang('en')}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        phoneLang === 'en'
                          ? 'bg-ink-900 text-white shadow-xs'
                          : 'bg-page text-ink-600 hover:text-ink-900'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setPhoneLang('te')}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        phoneLang === 'te'
                          ? 'bg-ink-900 text-white shadow-xs'
                          : 'bg-page text-ink-600 hover:text-ink-900'
                      }`}
                    >
                      తెలుగు
                    </button>
                  </div>
                </div>

                {/* Assistant Speech Bubble */}
                <div className="p-3.5 rounded-2xl bg-page border border-border text-left space-y-1.5">
                  <div className="text-[9px] font-bold tracking-widest uppercase text-ink-400">
                    VIIT ASSISTANT
                  </div>
                  <p className="text-xs text-ink-800 leading-snug">
                    {phoneLang === 'en'
                      ? "Hello! I'm calling from VIIT about your child's attendance and academic progress."
                      : 'నమస్కారం! మీ అమ్మాయి/అబ్బాయి హాజరు మరియు పురోగతి గురించి విజ్ఞాన్ ఐఐటి నుండి కాల్ చేస్తున్నాము.'}
                  </p>
                  <div className="flex items-center justify-center gap-1 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-200" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Horizontal Stat Strip */}
      <section className="border-y border-border bg-surface py-5 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6 text-xs sm:text-sm font-semibold text-ink-700">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-ink-400" />
            <span>1-5 simultaneous calls</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-ink-400" />
            <span>~ 1 minute conversations</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-xs text-ink-400">文A</span>
            <span>Telugu & English</span>
          </div>
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-4 h-4 text-ink-400" />
            <span>One retry if unanswered</span>
          </div>
        </div>
      </section>

      {/* "A simple flow" Section */}
      <section id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <div className="text-[11px] font-bold text-brand uppercase tracking-[0.18em]">
            FROM DATA TO DIALOGUE
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink-900 tracking-tight">
            A simple flow.<br />A meaningful connection.
          </h2>
          <p className="text-sm sm:text-base text-ink-500 max-w-lg mx-auto pt-1">
            Attendance updates or honest feedback.<br />
            Every call starts with the right context.
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 01 */}
          <div className="p-8 rounded-card border border-border bg-surface shadow-xs hover:shadow-card transition-all flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-page border border-border flex items-center justify-center text-ink-800">
                <UploadCloud className="w-5 h-5" />
              </div>
              <span className="font-mono text-sm font-bold text-ink-400">01</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink-900">Start with student data</h3>
              <p className="text-xs sm:text-sm text-ink-500 leading-relaxed">
                Choose a class. Upload and confirm your student list.
              </p>
            </div>
          </div>

          {/* Card 02 */}
          <div className="p-8 rounded-card border border-border bg-surface shadow-xs hover:shadow-card transition-all flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-page border border-border flex items-center justify-center text-ink-800">
                <PhoneCall className="w-5 h-5" />
              </div>
              <span className="font-mono text-sm font-bold text-ink-400">02</span>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-ink-900">Prepare the conversation</h3>
              <p className="text-xs sm:text-sm text-ink-500 leading-relaxed">
                Choose mentoring or feedback. Set questions and preferences.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-page text-ink-700 font-semibold text-[11px] border border-border">
                  Attendance / mentoring
                </span>
                <span className="px-2.5 py-1 rounded-md bg-page text-ink-700 font-semibold text-[11px] border border-border">
                  Feedback
                </span>
              </div>
            </div>
          </div>

          {/* Card 03 */}
          <div className="p-8 rounded-card border border-border bg-surface shadow-xs hover:shadow-card transition-all flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-page border border-border flex items-center justify-center text-ink-800">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="font-mono text-sm font-bold text-ink-400">03</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink-900">Everything in view</h3>
              <p className="text-xs sm:text-sm text-ink-500 leading-relaxed">
                Review campaigns, student records, and call history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* "Heard. Handled. Followed through." Section */}
      <section id="issue-resolution" className="py-20 px-6 border-t border-border bg-page">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-issue-icon uppercase tracking-[0.18em]">
              <span className="w-2 h-2 rounded-full bg-issue-icon" />
              <span>THE CONVERSATION DOESN'T END HERE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-ink-900 tracking-tight leading-[1.12]">
              Heard. Handled.<br />Followed through.
            </h2>
            <p className="text-sm sm:text-base text-ink-600 leading-relaxed">
              When a parent raises a concern, it reaches the right owner. A follow-up call checks the resolution — and the loop continues until the parent confirms.
            </p>

            {/* Sub-links with icons */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-ink-700">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-ink-400" />
                <span>College coordinator</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-ink-400" />
                <span>Hostel dean</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-ink-400" />
                <span>Bus correspondent</span>
              </div>
            </div>
          </div>

          {/* Right Action Container */}
          <div className="lg:col-span-7 bg-surface p-6 sm:p-8 rounded-card border border-border shadow-card space-y-4">
            {/* Step 1 */}
            <div className="p-4 rounded-xl border border-border bg-page/40 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink-900">Alert the right owner</h4>
                <p className="text-xs text-ink-500 mt-0.5">Route the concern to college, hostel, or bus.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-xl border border-border bg-page/40 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-ink-900">Address the concern</h4>
                <p className="text-xs text-ink-500 mt-0.5">The designated owner takes action.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border border-border bg-page/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink-900">Call back. Confirm. Close.</h4>
                  <p className="text-xs text-ink-500 mt-0.5">AI follows up. The parent confirms resolution.</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>

            {/* Footer Note */}
            <div className="pt-2 text-center">
              <span className="text-xs text-ink-500 flex items-center justify-center gap-1.5 font-medium">
                <RotateCcw className="w-3.5 h-3.5 text-ink-400" />
                <span>Still unresolved? Follow up again.</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="border-t border-border bg-surface py-8 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-500">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-brand-dark flex items-center justify-center p-1 text-white">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <rect x="3" y="8" width="2.5" height="8" rx="1.25" fill="currentColor" />
                <rect x="8.5" y="4" width="2.5" height="16" rx="1.25" fill="currentColor" />
                <rect x="14" y="9" width="2.5" height="10" rx="1.25" fill="currentColor" />
                <rect x="19.5" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-ink-900">VIIT AI Feedback</span>
              <span className="mx-2 text-ink-300">•</span>
              <span>Department of CSE</span>
            </div>
          </div>

          <div className="text-center font-medium text-ink-400">
            Better conversations. Better follow-through.
          </div>

          <div>
            <Link to="/login" className="font-semibold text-ink-700 hover:text-ink-900 flex items-center gap-1">
              <span>Admin portal</span>
              <span className="font-mono text-xs">↗</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
