import React, { useState } from 'react';
import { BrandMark } from '../../components/common/BrandMark';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SelectCard } from '../../components/common/SelectCard';
import { Stepper } from '../../components/common/Stepper';
import { StatCard } from '../../components/common/StatCard';
import { Tabs } from '../../components/common/Tabs';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Banner } from '../../components/common/Banner';
import { Modal } from '../../components/common/Modal';
import { MountainRidge } from '../../components/common/MountainRidge';
import { ArrowRight, Mail, Building, FileSpreadsheet, Sparkles } from 'lucide-react';

export const StyleguidePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('components');
  const [selectedCard, setSelectedCard] = useState('cse');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(3);

  const wizardSteps = [
    { id: 1, label: 'Department' },
    { id: 2, label: 'Year' },
    { id: 3, label: 'Section' },
    { id: 4, label: 'Module' },
    { id: 5, label: 'Students' },
    { id: 6, label: 'Questions' },
    { id: 7, label: 'Review' },
  ];

  return (
    <div className="min-h-screen bg-page p-8 sm:p-12 text-left">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-hairline">
          <div>
            <span className="text-xs font-semibold tracking-eyebrow uppercase text-brand">
              Developer Sandbox
            </span>
            <h1 className="text-3xl font-display font-bold text-ink mt-1">
              Design System & Component Styleguide
            </h1>
            <p className="text-sm text-muted mt-1">
              Visual tokens and primitives extracted from the reference video.
            </p>
          </div>
          <BrandMark size="md" />
        </div>

        {/* Brand Tokens */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">1. Brand & Neutral Tokens</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div className="p-3 bg-ink text-white rounded-card text-xs font-semibold">
              Ink #111111
            </div>
            <div className="p-3 bg-brand text-white rounded-card text-xs font-semibold">
              Brand #014A97
            </div>
            <div className="p-3 bg-brand-dark text-white rounded-card text-xs font-semibold">
              Dark #0B2038
            </div>
            <div className="p-3 bg-brand-50 text-brand border border-brand-100 rounded-card text-xs font-semibold">
              Tint #EAF3FC
            </div>
            <div className="p-3 bg-issue-tint text-issue border border-issue-border rounded-card text-xs font-semibold">
              Alert #C2410C
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-card text-xs font-semibold">
              Success #10B981
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">2. Buttons</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" icon={<ArrowRight className="w-4 h-4" />}>
              Primary Pill Button
            </Button>
            <Button size="md" variant="secondary">
              Secondary Pill
            </Button>
            <Button size="md" variant="outline">
              Outline Pill
            </Button>
            <Button size="md" disabled>
              Disabled State
            </Button>
            <Button size="md" loading>
              Loading
            </Button>
            <Button size="md" onClick={() => setIsModalOpen(true)}>
              Open Modal Preview
            </Button>
          </div>
        </section>

        {/* Form Inputs */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">3. Inputs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <Input
              label="Standard Input"
              placeholder="you@college.edu"
              icon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Input with Error"
              defaultValue="invalid-format"
              error="Please enter a valid academic email"
            />
          </div>
        </section>

        {/* Stepper */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">4. 7-Step Stepper</h2>
          <Stepper
            steps={wizardSteps}
            currentStep={currentStep}
            breadcrumb="CSE / 3rd year / Section F / Attendance / mentoring"
            onStepClick={(step) => setCurrentStep(step)}
          />
        </section>

        {/* Select Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">5. SelectCards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SelectCard
              title="CSE"
              subtitle="Computer Science & Engineering"
              icon={<Building className="w-5 h-5" />}
              selected={selectedCard === 'cse'}
              onClick={() => setSelectedCard('cse')}
            />
            <SelectCard
              title="3rd year"
              subtitle="Batch of 2022–2026"
              watermark="03"
              selected={selectedCard === 'year3'}
              onClick={() => setSelectedCard('year3')}
            />
            <SelectCard
              title="Mentoring"
              subtitle="Attendance and academic guidance"
              badge={<Badge variant="brand">Active Module</Badge>}
              selected={selectedCard === 'module'}
              onClick={() => setSelectedCard('module')}
            />
          </div>
        </section>

        {/* Stats & Tabs */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">6. StatCards & Tabs</h2>
          <Tabs
            tabs={[
              { id: 'components', label: 'Campaigns', count: 12 },
              { id: 'history', label: 'Call history' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <StatCard title="Prepared campaigns" value="04" />
            <StatCard title="Student records" value={68} />
            <StatCard
              title="Completed calls"
              value="00"
              caption="Calling not connected"
            />
          </div>
        </section>

        {/* Banners */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">7. Banners & Error Messages</h2>
          <Banner
            variant="error"
            title="Upload Validation Error"
            action={<span className="font-semibold underline cursor-pointer">Download template</span>}
          >
            Missing required columns: roll_number, parent_phone. Please verify your roster.
          </Banner>
          <Banner variant="warning">
            3 open issues flagged from parent feedback require your attention.
          </Banner>
        </section>

        {/* Mountain Ridge */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">8. Mountain Ridge Vector SVG</h2>
          <div className="w-full h-32 rounded-panel border border-hairline overflow-hidden bg-gradient-to-b from-[#DEDEDE] to-[#FAFAFA]">
            <MountainRidge className="h-full" />
          </div>
        </section>

        {/* Empty State */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-ink">9. Empty State</h2>
          <EmptyState
            icon={<FileSpreadsheet className="w-6 h-6" />}
            title="No campaigns yet."
            description="Confirmed campaigns will appear here once submitted and verified."
            action={<Button size="sm">Create campaign ↗</Button>}
          />
        </section>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirm Campaign"
          subtitle="Are you ready to schedule this batch?"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>
                Confirm & Launch →
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-main leading-relaxed">
            This campaign will queue calls for 48 students in CSE 3rd Year Section F. Calls will be dispatched within calling hours.
          </p>
        </Modal>
      </div>
    </div>
  );
};
