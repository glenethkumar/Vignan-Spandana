import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  caption?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  caption,
  className = '',
}) => {
  // Format numeric values to 2-digit '00' string if single digit
  const formattedValue =
    typeof value === 'number'
      ? value < 10
        ? `0${value}`
        : `${value}`
      : value;

  return (
    <div
      className={`p-6 bg-white rounded-card border border-hairline shadow-soft flex flex-col justify-between min-h-[140px] ${className}`}
    >
      <div className="flex items-start justify-between w-full">
        <span className="text-sm font-medium text-muted">{title}</span>
        {icon && (
          <div className="w-9 h-9 rounded-icon-box bg-icon-box flex items-center justify-center text-muted">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="font-display text-4xl sm:text-5xl font-bold text-ink tracking-tight">
          {formattedValue}
        </div>
        {caption && (
          <p className="mt-1.5 text-xs font-medium text-muted">{caption}</p>
        )}
      </div>
    </div>
  );
};

