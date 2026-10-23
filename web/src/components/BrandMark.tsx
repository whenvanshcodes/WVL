import React from 'react';

export function BrandMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 108 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Letter V & B spine */}
      <path
        d="M28 36L46 76L54 32V76"
        stroke="#3B82F6"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Letter B dual harmonic loops */}
      <path
        d="M54 32C68 32 78 36 78 44C78 52 68 52 54 52C70 52 82 56 82 64C82 74 68 76 54 76"
        stroke="#3B82F6"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Acoustic waveform bars */}
      <line x1="33" y1="46" x2="33" y2="58" stroke="#60A5FA" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="39" y1="38" x2="39" y2="66" stroke="#60A5FA" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="45" y1="48" x2="45" y2="72" stroke="#60A5FA" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
