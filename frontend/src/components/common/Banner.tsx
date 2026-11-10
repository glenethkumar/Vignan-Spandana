import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface BannerProps {
  variant?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  variant = 'error',
  title,
  children,
  action,
  onDismiss,
  className = '',
}) => {
  const styles = {
    error: {
      container: 'bg-[#FDF1EE] border-[#F5C9C0] text-[#7F1D1D]',
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-issue-tint border-issue-border text-issue',
      icon: <AlertTriangle className="w-5 h-5 text-issue-icon shrink-0 mt-0.5" />,
    },
    info: {
      container: 'bg-brand-50 border-brand-100 text-brand-dark',
      icon: <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
    },
  }[variant];

  return (
    <div
      className={`p-4 rounded-input border flex items-start gap-3 transition-all duration-200 text-left ${styles.container} ${className}`}
    >
      {styles.icon}
      <div className="flex-1 text-sm">
        {title && <div className="font-bold mb-0.5">{title}</div>}
        <div className="font-medium leading-relaxed">{children}</div>
        {action && <div className="mt-2.5 flex items-center gap-3">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-muted hover:text-ink transition-colors p-1"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
