import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'alert' | 'brand' | 'outline';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    neutral: 'bg-neutral-100 text-neutral-700 border-transparent',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    alert: 'bg-issue-tint text-issue border-issue-border/50',
    brand: 'bg-brand-50 text-brand border-brand-100',
    outline: 'bg-white text-muted border-hairline',
  }[variant];

  const dotColors = {
    neutral: 'bg-neutral-500',
    success: 'bg-emerald-500',
    alert: 'bg-issue-icon',
    brand: 'bg-brand',
    outline: 'bg-neutral-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantStyles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors}`} />}
      <span>{children}</span>
    </span>
  );
};

