import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import {
  PhoneCall,
  Clock,
  Languages,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Bus,
  Home as HomeIcon,
  Sparkles,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-xs font-semibold text-brand">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>COLLEGE-WIDE PARENT ENGAGEMENT</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink-900 tracking-tight leading-[1.1]">
              Connect with parents. <br />
              <span className="text-brand">Listen. Act. Resolve.</span>
            </h1>

            <p className="text-lg text-ink-600 max-w-xl leading-relaxed">
              VIIT's automated voice platform verifies daily attendance, delivers academic updates in Telugu and English, and routes campus feedback directly to faculty, hostel, and transport deans.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link to="/login">
                <Button size="lg" variant="primary" className="w-full sm:w-auto gap-2">
                  <span>Prepare your call list</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  How it works
                </Button>
              </a>
            </div>

            <div className="pt-4 flex items-center gap-6 text-xs text-ink-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand" />
                <span>Zero raw numbers exposed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success-text" />
                <span>Simulated demo safety</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity CSS Phone & Floating Cards Mockup (No Stock Photos) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-72 sm:w-80">
              {/* Outer Phone Shell */}
              <div className="w-full bg-ink-900 rounded-[40px] p-3 shadow-2xl border-4 border-ink-700">
                {/* Screen */}
                <div className="bg-surface rounded-[32px] overflow-hidden p-5 flex flex-col items-center border border-border">
                  {/* Speaker notch */}
                  <div className="w-20 h-4 bg-ink-900 rounded-full mb-6 mx-auto" />

                  {/* Calling Status Visualizer */}
                  <div className="w-20 h-20 rounded-full bg-brand-50 border-2 border-brand flex items-center justify-center mb-4 relative">
                    <PhoneCall className="w-8 h-8 text-brand animate-bounce" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-success-text rounded-full ring-2 ring-white" />
                  </div>

                  <div className="text-center space-y-1 mb-6">
                    <div className="text-xs font-semibold text-brand uppercase tracking-wider">AI Voice Call Active</div>
                    <div className="text-base font-bold text-ink-900">Parent of Aarav Sharma</div>
                    <div className="text-xs text-ink-500 font-mono">+91 98*** **345</div>
                  </div>

                  {/* Speech Bubble Sample */}
                  <div className="w-full bg-page rounded-xl p-3 border border-border text-left space-y-2 mb-4">
                    <div className="text-[11px] font-semibold text-brand">నమస్కారం సురేష్ గారు (Telugu)</div>
                    <div className="text-xs text-ink-700 leading-snug">
                      "మీ అబ్బాయి ఆరవ్ ఈరోజు కాలేజీకి రాలేదు. సెలవు కారణం తెలుపగలరా?"
                    </div>
                  </div>

                  {/* Quick End Call Button */}
                  <div className="w-12 h-12 rounded-full bg-danger-text/10 text-danger-text flex items-center justify-center font-bold text-xs mt-2">
                    01:14
                  </div>
                </div>
              </div>

              {/* Floating Card 1: Issue Alert (Orange Loop) */}
              <div className="absolute -left-8 top-16 bg-surface rounded-card p-3 border border-issue-border shadow-float flex items-center gap-3 animate-pulse">
                <div className="p-2 bg-issue-tint rounded-lg text-issue-icon">
                  <HomeIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-issue-text uppercase">Hostel Concern Detected</div>
                  <div className="text-xs text-ink-800 font-medium">Drinking water dispenser fix needed</div>
                </div>
              </div>

              {/* Floating Card 2: Attendance Verification */}
              <div className="absolute -right-6 bottom-16 bg-surface rounded-card p-3 border border-border shadow-float flex items-center gap-3">
                <div className="p-2 bg-success-tint rounded-lg text-success-text">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-success-text uppercase">Attendance Verified</div>
                  <div className="text-xs text-ink-800 font-medium">Parent acknowledged fever leave</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat Strip */}
      <section className="bg-surface border-y border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-brand">
                <PhoneCall className="w-5 h-5" />
                <span className="text-2xl sm:text-3xl font-extrabold text-ink-900">50+</span>
              </div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Simultaneous calls</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-brand">
                <Clock className="w-5 h-5" />
                <span className="text-2xl sm:text-3xl font-extrabold text-ink-900">~1 Min</span>
              </div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Concise conversations</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-brand">
                <Languages className="w-5 h-5" />
                <span className="text-2xl sm:text-3xl font-extrabold text-ink-900">Telugu & Eng</span>
              </div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Natural bilingual audio</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-brand">
                <RotateCcw className="w-5 h-5" />
                <span className="text-2xl sm:text-3xl font-extrabold text-ink-900">1 Smart Retry</span>
              </div>
              <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">If unanswered first time</p>
            </div>
          </div>
        </div>
      </section>

      {/* "A simple flow" Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="text-xs font-bold text-brand uppercase tracking-widest">Guided Process</div>
          <h2 className="text-3xl font-bold text-ink-900">A calm, guided 4-step flow</h2>
          <p className="text-sm text-ink-500">
            A staff member can prepare, validate, and launch a complete communication campaign in under 3 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Choose class', desc: 'Select department, year, and section. Faculty only see permitted classes.' },
            { step: '02', title: 'Prepare list', desc: 'Drop an attendance spreadsheet. Errors are flagged instantly with row numbers.' },
            { step: '03', title: 'Make it yours', desc: 'Pick Telugu or English, customize the short script, and choose feedback topics.' },
            { step: '04', title: 'Review & launch', desc: 'Faculty submits to Admin for sign-off. Admin approves and triggers live queue.' },
          ].map(item => (
            <div key={item.step} className="bg-surface rounded-card p-6 border border-border shadow-card space-y-3">
              <div className="text-xs font-bold text-brand uppercase tracking-widest font-mono">
                Step {item.step}
              </div>
              <h3 className="text-base font-bold text-ink-900">{item.title}</h3>
              <p className="text-xs text-ink-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* "Heard. Handled. Followed through." Section */}
      <section id="issue-resolution" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface rounded-card border border-border p-8 sm:p-12 shadow-card">
          <div className="max-w-3xl space-y-4 mb-10">
            <div className="text-xs font-bold text-issue-text uppercase tracking-widest">
              Campus Issue Resolution Loop
            </div>
            <h2 className="text-3xl font-bold text-ink-900">
              Heard. Handled. Followed through.
            </h2>
            <p className="text-sm text-ink-600 leading-relaxed">
              When a parent shares a concern during a call, the system never leaves it as a passive note. It immediately enters a closed-loop resolution workflow assigned to the respective authority.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-card bg-page border border-border space-y-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="text-sm font-bold text-ink-900">Alert the right owner</h4>
              <p className="text-xs text-ink-500 leading-relaxed">
                Concerns are categorized automatically: Hostel issues go to Hostel Dean, bus delays to Transport Correspondent, academic feedback to College Coordinator.
              </p>
            </div>

            <div className="p-5 rounded-card bg-page border border-border space-y-3">
              <div className="w-9 h-9 rounded-lg bg-issue-tint text-issue-icon flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="text-sm font-bold text-ink-900">Address the concern</h4>
              <p className="text-xs text-ink-500 leading-relaxed">
                The owner reviews the student profile and audio transcript, takes physical action, and documents the resolution notes in the portal.
              </p>
            </div>

            <div className="p-5 rounded-card bg-page border border-border space-y-3">
              <div className="w-9 h-9 rounded-lg bg-success-tint text-success-text flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="text-sm font-bold text-ink-900">Call back, confirm, close</h4>
              <p className="text-xs text-ink-500 leading-relaxed">
                An automated verification call asks the parent if they are satisfied. If Yes, it closes. If No, it reopens with +1 reopen count. At 3 reopens, Admin is alerted.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
