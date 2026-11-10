import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'issue';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantStyles = {
    primary: 'bg-brand text-white hover:bg-brand-700 active:bg-brand-800 focus:ring-brand shadow-sm',
    secondary: 'bg-brand-50 text-brand hover:bg-brand-100 focus:ring-brand',
    outline: 'border border-border bg-white text-ink-900 hover:bg-page hover:border-ink-400 focus:ring-brand',
    ghost: 'text-ink-600 hover:text-ink-900 hover:bg-page focus:ring-brand',
    danger: 'bg-danger-text text-white hover:bg-red-700 focus:ring-red-600 shadow-sm',
    issue: 'bg-issue-text text-white hover:bg-orange-700 focus:ring-orange-600 shadow-sm',
  };

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin text-current" />}
      {children}
    </button>
  );
};
