import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-9 px-4 text-xs font-semibold gap-1.5',
    md: 'h-11 px-5 text-sm font-semibold gap-2',
    lg: 'h-[52px] px-6 text-base font-semibold gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-ink text-white hover:bg-neutral-800 active:scale-[0.99] shadow-soft disabled:bg-[#E8EAEE] disabled:text-[#9CA3AF] disabled:shadow-none',
    secondary:
      'bg-[#F5F6F8] text-text-main hover:bg-[#EAECEF] active:scale-[0.99] disabled:bg-[#E8EAEE] disabled:text-[#9CA3AF]',
    outline:
      'bg-white text-text-main border border-hairline hover:bg-page active:scale-[0.99] disabled:border-[#E8EAEE] disabled:text-[#9CA3AF]',
    ghost:
      'bg-transparent text-muted hover:text-ink hover:bg-neutral-100 disabled:text-[#9CA3AF]',
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:scale-[0.99] disabled:bg-[#E8EAEE] disabled:text-[#9CA3AF]',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center rounded-btn font-sans transition-all duration-200 select-none cursor-pointer disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
