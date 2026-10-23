'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  Heart, 
  Shuffle, 
  SkipBack, 
  Play, 
  Pause, 
  SkipForward, 
  Repeat, 
  Plus, 
  ListPlus, 
  Compass, 
  MoreHorizontal,
  X,
  Radio,
  Check
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { InteractiveWaveform } from './InteractiveWaveform';
import { BrandMark } from './BrandMark';
import { saveInboxItem, addTrackToPlan, getStoredPlans } from '@/lib/storage';

export function NowPlayingExpanded() {
  const router = useRouter();
  const {
    user,
    activeDevice,
    playbackError,
    clearPlaybackError,
    currentTrack,
    isPlaying,
    positionMs,
    durationMs,
    togglePlay,
    nextTrack,
    previousTrack,
    seekTo,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    queue,
    playTrack,
    isExpanded,
    setIsExpanded,
  } = usePlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isExpanded || !currentTrack) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSaveToInbox = () => {
    saveInboxItem({
      originalUrl: `https://open.spotify.com/track/${currentTrack.id}`,
      title: currentTrack.title,
      subtitle: currentTrack.artist,
      artworkUrl: currentTrack.artworkUrl,
      note: 'Saved from Listening Space player.',
      status: 'TO_LISTEN',
      resolvedTrack: currentTrack,
    }, user?.id);
    showToast('Saved to Music Inbox');
  };

  const handleAddToPlan = () => {
    const plans = getStoredPlans(user?.id);
    if (plans.length > 0) {
      addTrackToPlan(plans[0].id, currentTrack, user?.id);
      showToast(`Added to "${plans[0].title}"`);
    } else {
      showToast('No active listening plans found');
    }
  };

  const handleNavigateToAtlas = () => {
    setIsExpanded(false);
    router.push('/atlas');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-y-auto px-6 py-6 md:py-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-surface-card border border-primary/40 text-primary-light px-4 py-2 rounded-full text-xs font-medium shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-2">
          <Check className="w-4 h-4" />
          {toastMsg}
        </div>
      )}

      {/* 1. Header Area */}
      <header className="flex items-center justify-between w-full max-w-xl mx-auto shrink-0 mb-4">
        <button
          onClick={() => setIsExpanded(false)}
          className="p-2 text-text-secondary hover:text-white transition-colors"
          aria-label="Minimize player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] tracking-widest text-text-muted uppercase font-mono font-bold">
            WHENVANSHLISTENS
          </span>
          <span className="text-xs font-semibold text-primary-light tracking-wide">
            NOW PLAYING
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Acoustic Waveform Queue Toggle */}
          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-lg transition-colors ${
              showQueue ? 'text-primary-light bg-primary/20' : 'text-text-secondary hover:text-white'
            }`}
            aria-label="Toggle queue"
          >
            <BrandMark className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowOptions(true)}
            className="p-2 text-text-secondary hover:text-white transition-colors"
            aria-label="Options"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Active Device and Diagnostics Bar */}
      <div className="w-full max-w-xl mx-auto">
        {activeDevice && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted font-mono mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Playing on {activeDevice.name}</span>
          </div>
        )}
        {playbackError && (
          <div className="p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-center">
            {playbackError === 'NO_ACTIVE_DEVICE'
              ? 'No active Spotify device found. Open Spotify on any device to stream.'
              : playbackError === 'PREMIUM_REQUIRED'
              ? 'Spotify Premium is required for direct Web API playback control.'
              : playbackError}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center w-full max-w-xl mx-auto my-auto py-2">
        {showQueue ? (
          /* Queue Drawer */
          <div className="w-full flex-1 max-h-[460px] bg-surface-card border border-surface-border rounded-2xl p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Up Next in Queue</h3>
              <span className="text-xs text-text-muted font-mono">{queue.length} tracks</span>
            </div>
            <div className="space-y-2">
              {queue.map((track, i) => {
                const isCurrent = track.id === currentTrack.id;
                return (
                  <div
                    key={track.id + '-' + i}
                    onClick={() => playTrack(track)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-primary/20 border border-primary/30 text-primary-light'
                        : 'hover:bg-surface-hover text-text-secondary'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      <Image src={track.artworkUrl} alt={track.title} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-primary-light' : 'text-white'}`}>
                        {track.title}
                      </span>
                      <span className="text-xs text-text-muted truncate">{track.artist}</span>
                    </div>
                    {isCurrent && <BrandMark className="w-4 h-4 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Album Artwork with Rotating Vinyl Disc */
          <div className="relative flex items-center justify-center my-4">
            {/* Rotating Vinyl Record peeking out from the right */}
            <div
              className={`absolute right-[-24px] md:right-[-36px] w-[220px] md:w-[320px] h-[220px] md:h-[320px] rounded-full bg-[#0D0D0D] border-4 border-[#1A1A1A] shadow-2xl flex items-center justify-center transition-all ${
                isPlaying ? 'animate-spin-slow' : ''
              }`}
              style={{
                backgroundImage:
                  'radial-gradient(circle, #1c1c1c 15%, #050505 16%, #1c1c1c 28%, #050505 29%, #1c1c1c 42%, #050505 43%, #1c1c1c 65%, #000 70%)',
              }}
            >
              <div className="w-16 h-16 rounded-full border-2 border-primary/40 bg-surface-card flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-black border border-primary/80" />
              </div>
            </div>

            {/* Front Album Artwork */}
            <div className="relative z-10 w-[240px] h-[240px] md:w-[340px] md:h-[340px] rounded-2xl overflow-hidden border border-primary/40 shadow-[0_0_35px_rgba(59,130,246,0.25)]">
              <Image
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* 2. Track Identity */}
        <div className="w-full mt-6 mb-4 flex items-center justify-between">
          <div className="flex flex-col min-w-0 flex-1 mr-4">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
              {currentTrack.title}
            </h1>
            <p className="text-sm md:text-base text-text-secondary truncate mt-0.5">
              {currentTrack.artist}
            </p>
            {currentTrack.album && (
              <p className="text-xs text-text-muted truncate mt-0.5">
                {currentTrack.album}
              </p>
            )}
          </div>

          <button
            onClick={() => setIsLiked(!isLiked)}
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
            className="p-3 text-text-secondary hover:text-primary transition-all active:scale-125"
          >
            <Heart
              className={`w-6 h-6 transition-colors ${
                isLiked ? 'fill-primary text-primary' : 'text-text-muted hover:text-white'
              }`}
            />
          </button>
        </div>

        {/* 3. Dynamic Waveform Progress */}
        <div className="w-full my-3">
          <InteractiveWaveform
            positionMs={positionMs}
            durationMs={durationMs}
            onSeek={seekTo}
            barHeight={40}
          />
        </div>

        {/* 4. Distinctive Controls Layout */}
        <div className="flex items-center justify-between w-full px-2 my-4">
          <button
            onClick={toggleShuffle}
            className={`p-3 transition-colors ${
              shuffle ? 'text-primary-light' : 'text-text-muted hover:text-white'
            }`}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={previousTrack}
            className="p-3 text-text-secondary hover:text-white transition-transform active:scale-90"
            aria-label="Previous track"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>

          {/* 68dp glowing circular electric blue ring play/pause */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-16 h-16 rounded-full bg-transparent border-2 border-primary text-primary-light flex items-center justify-center transition-all hover:bg-primary/20 shadow-[0_0_25px_rgba(59,130,246,0.5)] active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-3 text-text-secondary hover:text-white transition-transform active:scale-90"
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>

          <button
            onClick={cycleRepeat}
            className={`p-3 transition-colors relative ${
              repeat !== 'off' ? 'text-primary-light' : 'text-text-muted hover:text-white'
            }`}
            aria-label="Cycle repeat"
          >
            <Repeat className="w-5 h-5" />
            {repeat === 'track' && (
              <span className="absolute top-2 right-2 text-[8px] font-mono font-bold bg-primary text-white rounded-full w-3 h-3 flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>

        {/* 5. Quick Actions Bar (4 Tactile Rounded Cards) */}
        <div className="grid grid-cols-4 gap-2.5 w-full mt-2">
          <button
            onClick={handleSaveToInbox}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
          >
            <Plus className="w-5 h-5 text-primary-light mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium text-text-secondary">Save to Inbox</span>
          </button>

          <button
            onClick={handleAddToPlan}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
          >
            <ListPlus className="w-5 h-5 text-primary-light mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium text-text-secondary">Add to Plan</span>
          </button>

          <button
            onClick={handleNavigateToAtlas}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
          >
            <Compass className="w-5 h-5 text-primary-light mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium text-text-secondary">Sound Atlas</span>
          </button>

          <button
            onClick={() => setShowOptions(true)}
            className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
          >
            <MoreHorizontal className="w-5 h-5 text-primary-light mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium text-text-secondary">More</span>
          </button>
        </div>
      </main>

      {/* 6. Modal Player Options Bottom Sheet */}
      {showOptions && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                  <Image src={currentTrack.artworkUrl} alt={currentTrack.title} fill className="object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">{currentTrack.title}</span>
                  <span className="text-xs text-text-muted truncate">{currentTrack.artist}</span>
                </div>
              </div>
              <button onClick={() => setShowOptions(false)} className="p-2 text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-sm font-medium">
              <button
                onClick={() => {
                  handleSaveToInbox();
                  setShowOptions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-left text-white"
              >
                <Plus className="w-4 h-4 text-primary-light" />
                Add to Music Inbox
              </button>

              <button
                onClick={() => {
                  handleAddToPlan();
                  setShowOptions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-left text-white"
              >
                <ListPlus className="w-4 h-4 text-primary-light" />
                Add to Listening Plan
              </button>

              <button
                onClick={() => {
                  setShowOptions(false);
                  handleNavigateToAtlas();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-left text-white"
              >
                <Compass className="w-4 h-4 text-primary-light" />
                View in Sound Atlas
              </button>

              <a
                href={currentTrack.uri ? `https://open.spotify.com/track/${currentTrack.id}` : '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-left text-white"
              >
                <Radio className="w-4 h-4 text-primary-light" />
                Open on Spotify
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
