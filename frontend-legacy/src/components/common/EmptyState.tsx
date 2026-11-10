import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center bg-surface border border-dashed border-border rounded-card', className)}>
      {icon && <div className="mb-3 text-ink-400 p-3 bg-page rounded-full">{icon}</div>}
      <h4 className="text-base font-semibold text-ink-900">{title}</h4>
      <p className="text-sm text-ink-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

