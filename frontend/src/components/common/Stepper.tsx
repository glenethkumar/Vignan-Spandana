import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
}

interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  breadcrumb?: string;
  onStepClick?: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  breadcrumb,
  onStepClick,
}) => {
  return (
    <div className="w-full border-b border-hairline pb-4 pt-2">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-2 sm:gap-4 px-1">
        {steps.map((step) => {
          const isDone = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isClickable = onStepClick && step.id <= currentStep;

          return (
            <div
              key={step.id}
              onClick={() => isClickable && onStepClick(step.id)}
              className={`flex items-center gap-2.5 pb-2 border-b-2 transition-all duration-200 select-none shrink-0 ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              } ${
                isActive
                  ? 'border-ink text-ink font-semibold'
                  : isDone
                  ? 'border-transparent text-muted hover:text-ink'
                  : 'border-transparent text-muted/50'
              }`}
            >
              {/* Circle */}
              <div
                className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-ink text-white'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-neutral-100 text-muted'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.id}
              </div>

              {/* Label */}
              <span className={`text-sm ${isActive ? 'font-semibold text-ink' : 'font-medium'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {breadcrumb && (
        <div className="mt-3 text-sm text-muted font-medium flex items-center gap-2 px-1">
          <span>{breadcrumb}</span>
        </div>
      )}
    </div>
  );
};

