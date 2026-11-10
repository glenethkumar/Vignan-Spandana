import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'issue' | 'brand';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  const variantStyles = {
    default: 'bg-page text-ink-700 border border-border',
    brand: 'bg-brand-50 text-brand border border-brand-100',
    success: 'bg-success-tint text-success-text border border-success-border',
    warning: 'bg-warning-tint text-warning-text border border-warning-border',
    danger: 'bg-danger-tint text-danger-text border border-danger-border',
    issue: 'bg-issue-tint text-issue-text border border-issue-border',
  };

  return (
    <span
      className={cn('inline-flex items-center rounded-full font-medium tracking-wide', sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};
