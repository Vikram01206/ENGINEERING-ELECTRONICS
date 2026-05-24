import React from 'react';

interface StreetLampIconProps {
  className?: string;
  size?: number | string;
}

export default function StreetLampIcon({ 
  className = "w-6 h-6", 
  size 
}: StreetLampIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg 
      className={`${className} shrink-0`} 
      style={style}
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Modern Street Lamp"
    >
      <defs>
        {/* Soft, warm, rich yellow glowing radial gradient for the light beam */}
        <radialGradient 
          id="street-lamp-glow-effect" 
          cx="45" 
          cy="19" 
          r="16" 
          fx="45" 
          fy="19" 
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFF4D0" stopOpacity="1" />
          <stop offset="25%" stopColor="#FFC72C" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
        </radialGradient>
        
        {/* Dark metal linear gradient for 3D metallic pipe highlights */}
        <linearGradient id="metal-pole-gradient" x1="18" y1="0" x2="30" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#111215" />
          <stop offset="40%" stopColor="#2A2D34" />
          <stop offset="70%" stopColor="#1E2024" />
          <stop offset="100%" stopColor="#0B0C0E" />
        </linearGradient>

        {/* 3D metallic gradient for the lamp head luminaire */}
        <linearGradient id="metal-head-gradient" x1="38" y1="12" x2="52" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3E424B" />
          <stop offset="50%" stopColor="#22252B" />
          <stop offset="100%" stopColor="#0E1012" />
        </linearGradient>
      </defs>

      {/* 1. Warm Golden Light Beam / Glow Flare */}
      <circle 
        cx="45" 
        cy="19" 
        r="14" 
        fill="url(#street-lamp-glow-effect)" 
        opacity="0.9"
      />
      <ellipse 
        cx="45" 
        cy="19" 
        rx="9" 
        ry="5" 
        fill="#FFE082" 
        opacity="0.95"
        filter="blur(0.5px)"
      />

      {/* 2. Professional Welded Flanged Base Collar & Anchor Assembly */}
      {/* Anchor base foundation block */}
      <rect x="18" y="56" width="10" height="3.5" rx="0.5" fill="#181A1F" />
      <rect x="19" y="52" width="8" height="4" rx="1" fill="url(#metal-pole-gradient)" />
      {/* Heavy-duty steel structural joint ring */}
      <ellipse cx="23" cy="52" rx="3.5" ry="1" fill="#3E424B" />

      {/* 3. Main Rigorous Vertical Standing Steel Pole */}
      <path 
        d="M23 52 V26" 
        stroke="url(#metal-pole-gradient)" 
        strokeWidth="3.2" 
        strokeLinecap="butt"
      />

      {/* Joint Collar connector middle-section ring */}
      <rect x="21" y="24" width="4" height="2" rx="0.5" fill="#3D4048" />

      {/* 4. Elegant Arching Curved Pole Extension/Overhead Arm */}
      <path 
        d="M23 25 C23 15 34 11 43 13.5" 
        stroke="url(#metal-pole-gradient)" 
        strokeWidth="2.8" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 5. Custom Sleek Teardrop Modern Luminaire Head (Dark Matte Finish) */}
      {/* Main outer shell enclosure */}
      <path 
        d="M39 15 C39 12 50 11 51 15 C51 18.5 40 18.5 39 15 Z" 
        fill="url(#metal-head-gradient)" 
      />
      
      {/* Bottom lip/rim boundary */}
      <path 
        d="M39.2 16.5 C41 16 49 15.5 50.8 16.5" 
        stroke="#15171C" 
        strokeWidth="1" 
      />

      {/* 6. Glowing Amber LED Lens Glass Cover */}
      <path 
        d="M41 16.8 C42 18.5 48 18 49 16.8 Z" 
        fill="#FFD54F" 
      />
    </svg>
  );
}
