import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-surface rounded-card border border-border p-5 shadow-card transition-all',
        hoverable && 'hover:shadow-float hover:border-ink-400 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

