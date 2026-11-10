import React from 'react';

interface MountainRidgeProps {
  className?: string;
  fadeToWhite?: boolean;
}

export const MountainRidge: React.FC<MountainRidgeProps> = ({
  className = '',
  fadeToWhite = true,
}) => {
  return (
    <div className={`relative w-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1440 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover"
        preserveAspectRatio="none"
      >
        {/* Layer 1: Back dark ridge */}
        <path
          d="M0 240L90 190L210 220L360 140L500 190L640 120L780 180L920 110L1080 170L1220 130L1350 200L1440 170V320H0V240Z"
          fill="#2A2A2A"
          fillOpacity="0.85"
        />

        {/* Layer 2: Mid ridge */}
        <path
          d="M0 260L120 210L260 250L410 180L560 230L710 170L860 220L1000 160L1160 220L1300 180L1440 230V320H0V260Z"
          fill="#4A4A4A"
          fillOpacity="0.75"
        />

        {/* Layer 3: Foreground peaks */}
        <path
          d="M0 280L150 240L320 270L480 220L620 260L770 210L940 250L1100 200L1260 250L1440 220V320H0V280Z"
          fill="#737373"
          fillOpacity="0.65"
        />

        {fadeToWhite && (
          <rect
            y="180"
            width="1440"
            height="140"
            fill="url(#mountain-fade-gradient)"
          />
        )}

        <defs>
          <linearGradient
            id="mountain-fade-gradient"
            x1="720"
            y1="180"
            x2="720"
            y2="320"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FAFAFA" stopOpacity="0" />
            <stop offset="0.6" stopColor="#FAFAFA" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FAFAFA" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
