import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  inputSize?: 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightAction, inputSize = 'lg', className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const heightClass = inputSize === 'lg' ? 'h-14 text-base' : 'h-11 text-sm';

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-text-main flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-4 text-muted pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-input border ${
              error ? 'border-red-400 bg-red-50/20' : 'border-input-border bg-white'
            } ${heightClass} ${
              icon ? 'pl-11' : 'pl-4'
            } ${rightAction ? 'pr-12' : 'pr-4'} text-text-main placeholder:text-muted/60 transition-all duration-200 outline-none focus:border-brand focus:ring-4 focus:ring-brand-50 disabled:bg-[#F5F6F8] disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {rightAction && (
            <div className="absolute right-3.5 flex items-center justify-center">
              {rightAction}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-red-600 font-medium pl-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

