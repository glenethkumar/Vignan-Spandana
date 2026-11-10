import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Headphones,
  FileText,
  CheckCircle,
  CheckCheck,
  Languages,
  Bell,
  PhoneCall,
  Clock,
  RotateCcw,
  Upload,
  Layers,
  Wrench,
  Building,
  Home,
  Bus,
  Wifi,
  Battery,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { MountainRidge } from '../../components/common/MountainRidge';

export const HomePage: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<'en' | 'te'>('en');

  return (
    <div className="w-full flex flex-col items-center overflow-x-hidden">
      {/* =========================================================================
          SECTION 1: HERO & PHONE MOCKUP WITH 4 TILTED FLOATING CARDS
         ========================================================================= */}
      <section className="w-full max-w-[1222px] px-6 pt-12 sm:pt-16 pb-12 flex flex-col items-center text-center relative">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 border border-hairline text-[11px] font-bold tracking-eyebrow uppercase text-text-main mb-6 animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span>VIIT · Intelligent Parent Communication</span>
        </div>

        {/* H1 Headline (Two Lines) */}
        <h1 className="font-display text-5xl sm:text-6xl md:text-[72px] font-bold text-ink tracking-tightest leading-[0.95] max-w-4xl animate-fade-up">
          Connect with parents.
          <br />
          <span className="text-neutral-500">Listen. Act. Resolve.</span>
        </h1>

        {/* Subhead */}
        <p className="mt-6 text-base sm:text-lg text-[#555555] max-w-xl font-normal leading-relaxed animate-fade-up">
          Student updates. Parent feedback. One connected campus.
        </p>

        {/* CTA Button */}
        <div className="mt-8 mb-14 animate-fade-up">
          <Link to="/login">
            <Button
              size="lg"
              className="h-[52px] px-8 text-[15px] font-semibold rounded-btn shadow-md hover:shadow-lg gap-2"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Prepare your call list
            </Button>
          </Link>
        </div>

        {/* Hero Visual Area: Phone Mockup, 4 Floating Cards & Mountain Ridge */}
        <div className="relative w-full max-w-[960px] flex items-center justify-center min-h-[580px] mt-2">
          {/* SVG Mountain Ridge Peeking Behind Phone */}
          <div className="absolute inset-x-0 bottom-[-40px] h-[340px] z-0 opacity-80 pointer-events-none">
            <MountainRidge className="h-full" fadeToWhite={true} />
          </div>

          {/* =====================================================================
              CARD 1: TOP LEFT (-4 deg tilt) - "Student data, ready."
             ===================================================================== */}
          <div
            style={{ '--card-tilt': '-4deg' } as React.CSSProperties}
            className="hidden lg:flex absolute top-4 left-4 z-10 w-[240px] p-4 bg-white rounded-card border border-hairline shadow-soft animate-float text-left flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-icon-box bg-brand-50 text-brand flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <div className="font-display font-bold text-sm text-ink">
                Student data, ready.
              </div>
              <div className="text-xs text-muted font-medium mt-0.5">
                Attendance · Marks · Feedback
              </div>
            </div>
          </div>

          {/* =====================================================================
              CARD 2: TOP RIGHT (+4 deg tilt) - "Every conversation counts."
             ===================================================================== */}
          <div
            style={{ '--card-tilt': '4deg' } as React.CSSProperties}
            className="hidden lg:flex absolute top-2 right-4 z-10 w-[260px] p-4 bg-white rounded-card border border-hairline shadow-soft animate-float text-left flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-icon-box bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Summary saved
              </span>
            </div>
            <div>
              <div className="font-display font-bold text-sm text-ink">
                Every conversation counts.
              </div>
              <div className="text-xs text-muted leading-relaxed mt-0.5">
                Parent responses and call notes, together in one place.
              </div>
            </div>
            <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-semibold text-brand">
              <span>Ready for Excel ↗</span>
            </div>
          </div>

          {/* =====================================================================
              CARD 3: BOTTOM LEFT (+3 deg tilt) - "A familiar conversation"
             ===================================================================== */}
          <div
            style={{ '--card-tilt': '3deg' } as React.CSSProperties}
            className="hidden lg:flex absolute bottom-12 left-6 z-10 w-[230px] p-4 bg-white rounded-card border border-hairline shadow-soft animate-float text-left flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-icon-box bg-icon-box text-text-main flex items-center justify-center">
                <Languages className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1 text-brand">
                <span className="w-1.5 h-3 bg-brand rounded-full wave-bar-1" />
                <span className="w-1.5 h-5 bg-brand rounded-full wave-bar-2" />
                <span className="w-1.5 h-3 bg-brand rounded-full wave-bar-3" />
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-sm text-ink">
                A familiar conversation
              </div>
              <div className="text-xs text-muted mt-0.5">
                Telugu or English. Their choice.
              </div>
            </div>
          </div>

          {/* =====================================================================
              CARD 4: BOTTOM RIGHT (-3 deg tilt) - "A concern? We follow through."
             ===================================================================== */}
          <div
            style={{ '--card-tilt': '-3deg' } as React.CSSProperties}
            className="hidden lg:flex absolute bottom-14 right-6 z-10 w-[250px] p-4 bg-issue-tint rounded-card border border-issue-border shadow-soft animate-float text-left flex-col gap-2"
          >
            <div className="w-8 h-8 rounded-icon-box bg-white text-issue-icon shadow-xs flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="font-display font-bold text-sm text-issue">
                A concern? We follow through.
              </div>
              <div className="text-xs text-issue/90 font-medium mt-0.5">
                Assigned → Resolved → Confirmed
              </div>
            </div>
          </div>

          {/* =====================================================================
              CENTER: GENERIC PHONE MOCKUP (280px wide, radius 44px, dark 6px frame)
             ===================================================================== */}
          <div className="relative z-20 w-[280px] bg-white rounded-phone border-[6px] border-[#111111] shadow-2xl overflow-hidden flex flex-col text-left">
            {/* Dynamic Island & Status Bar */}
            <div className="pt-3 px-5 flex items-center justify-between text-[11px] font-bold text-ink select-none">
              <span>9:41</span>
              {/* Dynamic Island Pill */}
              <div className="w-20 h-4 bg-[#111111] rounded-full" />
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Phone Screen Inner Container */}
            <div className="p-4 pt-3 flex flex-col gap-4">
              {/* App Brand Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-ink text-white flex items-center justify-center font-bold text-[10px]">
                    V
                  </div>
                  <span className="text-xs font-bold text-ink">VIIT AI Feedback</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-neutral-300 text-muted uppercase">
                  Preview
                </span>
              </div>

              {/* Headphones Center Avatar */}
              <div className="flex flex-col items-center justify-center pt-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#E0F2FE] flex items-center justify-center text-brand">
                    <Headphones className="w-8 h-8" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <p className="mt-3 font-display font-bold text-sm text-center text-ink max-w-[190px]">
                  A little conversation. A better connection.
                </p>
              </div>

              {/* Live Audio Wave Graphic */}
              <div className="flex items-center justify-center gap-1.5 h-8 py-1">
                <span className="w-1 h-3 bg-brand-accent rounded-full wave-bar-1" />
                <span className="w-1 h-6 bg-brand-accent rounded-full wave-bar-2" />
                <span className="w-1 h-8 bg-brand-accent rounded-full wave-bar-3" />
                <span className="w-1 h-5 bg-brand-accent rounded-full wave-bar-4" />
                <span className="w-1 h-7 bg-brand-accent rounded-full wave-bar-5" />
                <span className="w-1 h-4 bg-brand-accent rounded-full wave-bar-2" />
                <span className="w-1 h-6 bg-brand-accent rounded-full wave-bar-1" />
              </div>

              {/* Language Switcher Pills */}
              <div className="flex items-center justify-center gap-2 select-none">
                <button
                  onClick={() => setSelectedLang('en')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedLang === 'en'
                      ? 'bg-ink text-white shadow-xs'
                      : 'bg-neutral-100 text-muted hover:text-ink'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setSelectedLang('te')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedLang === 'te'
                      ? 'bg-ink text-white shadow-xs'
                      : 'bg-neutral-100 text-muted hover:text-ink'
                  }`}
                >
                  తెలుగు
                </button>
              </div>

              {/* Sample Call Script Card */}
              <div className="p-3 bg-page rounded-xl border border-hairline text-left text-xs leading-relaxed text-text-main">
                {selectedLang === 'en' ? (
                  <p>
                    <span className="font-bold text-ink">VIIT Assistant:</span>{' '}
                    "Hello, I'm calling from VIIT about your child's attendance and academic progress."
                  </p>
                ) : (
                  <p>
                    <span className="font-bold text-ink">VIIT సహాయకుడు:</span>{' '}
                    "నమస్కారం, మీ అమ్మాయి/అబ్బాయి కళాశాల హాజరు మరియు విద్యా పురోగతి గురించి విజ్ఞాన్ నుండి మాట్లాడుతున్నాము."
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="py-2 flex justify-center">
              <div className="w-24 h-1 bg-neutral-300 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: 4-ITEM STAT STRIP
         ========================================================================= */}
      <section className="w-full border-t border-b border-hairline bg-white py-8 flex justify-center">
        <div className="w-full max-w-[1222px] px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-icon-box bg-icon-box flex items-center justify-center text-text-main shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-sm text-ink">
                1–5 simultaneous calls
              </div>
              <div className="text-xs text-muted">Controlled throughput</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-icon-box bg-icon-box flex items-center justify-center text-text-main shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-sm text-ink">
                ~1 minute conversations
              </div>
              <div className="text-xs text-muted">Concise & respectful</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-icon-box bg-icon-box flex items-center justify-center text-text-main shrink-0">
              <Languages className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-sm text-ink">
                Telugu & English
              </div>
              <div className="text-xs text-muted">Natural regional dialogue</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 justify-center sm:justify-start">
            <div className="w-10 h-10 rounded-icon-box bg-icon-box flex items-center justify-center text-text-main shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-sm text-ink">
                One retry if unanswered
              </div>
              <div className="text-xs text-muted">Automated schedule</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: "FROM DATA TO DIALOGUE" (3 SOFT CARDS)
         ========================================================================= */}
      <section
        id="how-it-works"
        className="w-full max-w-[1222px] px-6 py-20 flex flex-col items-center text-center"
      >
        <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand mb-3">
          From Data to Dialogue
        </span>
        <h2 className="font-display text-4xl sm:text-5xl font-bold text-ink tracking-tight">
          A simple flow. A meaningful connection.
        </h2>
        <p className="mt-3 text-base text-muted max-w-xl font-normal leading-relaxed">
          Attendance updates or honest feedback. Every call starts with the right context.
        </p>

        {/* 3 Soft Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Card 01 */}
          <div className="p-8 bg-soft-card rounded-panel-lg border border-hairline shadow-xs flex flex-col justify-between min-h-[262px] hover:shadow-soft transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-icon-box bg-white border border-hairline flex items-center justify-center text-ink shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <span className="font-display text-2xl font-bold text-neutral-300">
                01
              </span>
            </div>
            <div className="mt-6">
              <h3 className="font-display text-[22px] font-bold text-ink tracking-tight">
                Start with student data
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed font-normal">
                Choose a class. Upload and confirm your student list.
              </p>
            </div>
          </div>

          {/* Card 02 */}
          <div className="p-8 bg-soft-card rounded-panel-lg border border-hairline shadow-xs flex flex-col justify-between min-h-[262px] hover:shadow-soft transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-icon-box bg-white border border-hairline flex items-center justify-center text-ink shadow-xs">
                <PhoneCall className="w-5 h-5" />
              </div>
              <span className="font-display text-2xl font-bold text-neutral-300">
                02
              </span>
            </div>
            <div className="mt-6">
              <h3 className="font-display text-[22px] font-bold text-ink tracking-tight">
                Prepare the conversation
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed font-normal">
                Choose mentoring or feedback. Set questions and preferences.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-hairline text-muted">
                  Attendance / mentoring
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-hairline text-muted">
                  Feedback
                </span>
              </div>
            </div>
          </div>

          {/* Card 03 */}
          <div className="p-8 bg-soft-card rounded-panel-lg border border-hairline shadow-xs flex flex-col justify-between min-h-[262px] hover:shadow-soft transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-icon-box bg-white border border-hairline flex items-center justify-center text-ink shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <span className="font-display text-2xl font-bold text-neutral-300">
                03
              </span>
            </div>
            <div className="mt-6">
              <h3 className="font-display text-[22px] font-bold text-ink tracking-tight">
                Everything in view
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed font-normal">
                Review campaigns, student records, and call history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: "THE CONVERSATION DOESN'T END HERE" (ISSUE RESOLUTION LOOP)
         ========================================================================= */}
      <section
        id="issue-resolution"
        className="w-full border-t border-hairline py-20 flex justify-center bg-white"
      >
        <div className="w-full max-w-[1222px] px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-left">
          {/* Left Column: Explanatory Copy */}
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-eyebrow uppercase text-issue mb-3">
              <span className="w-2 h-2 rounded-full bg-issue-icon" />
              <span>The conversation doesn't end here</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-ink tracking-tight leading-tight">
              Heard. Handled.
              <br />
              Followed through.
            </h2>
            <p className="mt-5 text-base text-muted leading-relaxed font-normal">
              When a parent raises a concern, it reaches the right owner. A follow-up call checks the resolution, and the loop continues until the parent confirms.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-icon-box border border-hairline text-xs font-semibold text-text-main">
                <Building className="w-3.5 h-3.5 text-muted" />
                <span>College coordinator</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-icon-box border border-hairline text-xs font-semibold text-text-main">
                <Home className="w-3.5 h-3.5 text-muted" />
                <span>Hostel dean</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-icon-box border border-hairline text-xs font-semibold text-text-main">
                <Bus className="w-3.5 h-3.5 text-muted" />
                <span>Bus correspondent</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3-Step Action Card Container (#F5F5F5 rounded panel) */}
          <div className="p-8 sm:p-10 bg-[#F5F5F5] rounded-panel-lg border border-hairline shadow-soft flex flex-col gap-4">
            {/* Row 1: Alert owner */}
            <div className="p-4 bg-white rounded-card border border-hairline flex items-center gap-4">
              <div className="w-10 h-10 rounded-icon-box bg-icon-box flex items-center justify-center text-ink shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-ink">
                  Alert the right owner
                </div>
                <div className="text-xs text-muted mt-0.5">
                  Routes to college, hostel, or bus.
                </div>
              </div>
            </div>

            {/* Row 2: Address concern */}
            <div className="p-4 bg-white rounded-card border border-hairline flex items-center gap-4">
              <div className="w-10 h-10 rounded-icon-box bg-issue-tint text-issue-icon flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="font-display font-bold text-sm text-ink">
                  Address the concern
                </div>
                <div className="text-xs text-muted mt-0.5">
                  The designated owner takes action.
                </div>
              </div>
            </div>

            {/* Row 3: Call back, confirm & close */}
            <div className="p-4 bg-white rounded-card border border-hairline flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-icon-box bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-ink">
                    Call back. Confirm. Close.
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    Automated confirmation loop.
                  </div>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            <div className="pt-2 text-center text-xs font-semibold text-muted">
              Not resolved? Follow up again.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
