'use client';

import React from 'react';
import Image from 'next/image';
import { Play, Pause, SkipForward, Maximize2 } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { InteractiveWaveform } from './InteractiveWaveform';

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    positionMs,
    durationMs,
    togglePlay,
    nextTrack,
    seekTo,
    setIsExpanded,
    isExpanded,
  } = usePlayer();

  if (!currentTrack || isExpanded) return null;

  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 md:left-64 z-30 bg-surface/95 backdrop-blur-xl border-t border-surface-border px-4 py-2.5 transition-all shadow-[0_-8px_25px_rgba(0,0,0,0.8)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Track identity (tappable to expand) */}
        <div
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-3.5 min-w-0 cursor-pointer group flex-1 md:flex-initial md:w-72"
        >
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-primary/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
            <Image
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">
              {currentTrack.title}
            </span>
            <span className="text-xs text-text-muted truncate">
              {currentTrack.artist}
            </span>
          </div>
        </div>

        {/* Dynamic Acoustic Waveform Bar (desktop centered) */}
        <div className="hidden lg:flex flex-1 max-w-md items-center px-4">
          <InteractiveWaveform
            positionMs={positionMs}
            durationMs={durationMs}
            onSeek={seekTo}
            barHeight={28}
          />
        </div>

        {/* Playback Transport Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            aria-label="Next track"
            className="p-2 text-text-secondary hover:text-white transition-colors active:scale-95"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsExpanded(true)}
            aria-label="Expand player"
            className="p-2 text-text-secondary hover:text-primary-light transition-colors hidden md:block"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
