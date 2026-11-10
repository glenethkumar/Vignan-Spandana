import React from 'react';
import { Check } from 'lucide-react';

interface SelectCardProps {
  selected?: boolean;
  onClick?: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  watermark?: string;
  badge?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const SelectCard: React.FC<SelectCardProps> = ({
  selected = false,
  onClick,
  title,
  subtitle,
  icon,
  watermark,
  badge,
  className = '',
  children,
  disabled = false,
}) => {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative flex flex-col justify-between p-6 sm:p-7 rounded-card border transition-all duration-200 select-none cursor-pointer ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-page border-hairline'
          : selected
          ? 'bg-brand-50 border-brand shadow-sm ring-1 ring-brand'
          : 'bg-white border-hairline hover:border-neutral-300 hover:shadow-soft'
      } ${className}`}
    >
      {/* Top row: Icon / Watermark + Radio circle */}
      <div className="flex items-start justify-between w-full mb-4">
        {icon ? (
          <div
            className={`w-11 h-11 rounded-icon-box flex items-center justify-center transition-colors ${
              selected ? 'bg-white text-brand shadow-xs' : 'bg-icon-box text-text-main'
            }`}
          >
            {icon}
          </div>
        ) : watermark ? (
          <span className="font-display text-4xl sm:text-5xl font-bold text-neutral-400 select-none">
            {watermark}
          </span>
        ) : (
          <div />
        )}

        {/* Radio Check Circle */}
        <div
          className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-150 ${
            selected
              ? 'bg-brand text-white'
              : 'border-2 border-neutral-300 bg-white hover:border-neutral-400'
          }`}
        >
          {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        {badge && <div className="mb-2">{badge}</div>}
        <h3 className="font-display text-xl sm:text-[22px] font-bold text-ink tracking-tight leading-snug">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm sm:text-base text-muted font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

