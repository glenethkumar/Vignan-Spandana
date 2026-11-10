import React from 'react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';
  const subSize = size === 'sm' ? 'text-[8px]' : 'text-[9px]';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Black rounded icon box with 5 white audio waveform bars */}
      <div className={`${iconSize} bg-ink flex items-center justify-center shrink-0 shadow-sm`}>
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-white"
          fill="currentColor"
        >
          {/* 5 vertical rounded bars */}
          <rect x="2" y="8" width="2.5" height="8" rx="1.25" />
          <rect x="6.5" y="4" width="2.5" height="16" rx="1.25" />
          <rect x="11" y="6" width="2.5" height="12" rx="1.25" />
          <rect x="15.5" y="2" width="2.5" height="20" rx="1.25" />
          <rect x="20" y="7" width="2.5" height="10" rx="1.25" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className={`font-display ${titleSize} tracking-tight leading-tight flex items-center gap-1.5 text-ink`}>
          <span className="font-bold">VIIT</span>
          <span className="font-normal text-muted">AI Feedback</span>
        </div>
        {showSubtitle && (
          <span className={`font-sans ${subSize} font-bold tracking-sub text-muted uppercase mt-0.5`}>
            Department of CSE
          </span>
        )}
      </div>
    </div>
  );
};

