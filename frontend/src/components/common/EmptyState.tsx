import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-10 sm:p-14 bg-white rounded-card border border-hairline shadow-soft flex flex-col items-center justify-center text-center ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-icon-box flex items-center justify-center text-muted mb-4 shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-bold text-ink tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted max-w-sm font-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

