'use client';

import React, { useRef } from 'react';

// 42 acoustic amplitude factors mimicking real audio envelope
const AMPLITUDES = [
  0.25, 0.45, 0.70, 0.55, 0.85, 1.0, 0.65, 0.90, 0.75, 0.50,
  0.80, 0.95, 0.60, 0.40, 0.70, 0.85, 0.50, 0.90, 1.0, 0.75,
  0.60, 0.85, 0.95, 0.70, 0.45, 0.65, 0.80, 0.55, 0.90, 0.75,
  0.60, 0.45, 0.70, 0.85, 0.60, 0.50, 0.75, 0.90, 0.65, 0.40,
  0.30, 0.20
];

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

interface WaveformProps {
  positionMs: number;
  durationMs: number;
  onSeek: (posMs: number) => void;
  className?: string;
  barHeight?: number;
}

export function InteractiveWaveform({
  positionMs,
  durationMs,
  onSeek,
  className = '',
  barHeight = 44,
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;
  const activeBarCount = Math.floor(progress * AMPLITUDES.length);

  const handleInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || durationMs <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = offsetX / rect.width;
    onSeek(ratio * durationMs);
  };

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Bars container */}
      <div
        ref={containerRef}
        onClick={handleInteraction}
        onTouchMove={handleInteraction}
        className="flex items-center justify-between w-full cursor-pointer py-2 group"
      >
        {AMPLITUDES.map((amp, index) => {
          const isPlayed = index <= activeBarCount;
          const heightPx = Math.max(6, amp * barHeight);

          return (
            <div
              key={index}
              style={{ height: `${heightPx}px` }}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlayed
                  ? 'bg-primary-light shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                  : 'bg-surface-border group-hover:bg-slate-700'
              }`}
            />
          );
        })}
      </div>

      {/* Timestamps */}
      <div className="flex justify-between text-xs font-mono text-text-muted mt-1 px-1">
        <span>{formatTime(positionMs)}</span>
        <span>{formatTime(durationMs)}</span>
      </div>
    </div>
  );
}
