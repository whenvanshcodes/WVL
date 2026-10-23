'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Radio, 
  Info, 
  CheckCircle2, 
  LogOut, 
  ExternalLink,
  Heart
} from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { 
  isSpotifyConnected, 
  initiateSpotifyLogin, 
  logoutSpotify 
} from '@/lib/spotifyAuth';

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(isSpotifyConnected());
  }, []);

  const handleDisconnect = () => {
    logoutSpotify();
    setConnected(false);
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-5 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <header className="pb-4 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-light" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Settings & About</h1>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          Connection status, audio engine configuration, and project information
        </p>
      </header>

      {/* Brand Identity Card */}
      <div className="p-6 rounded-3xl bg-surface-card border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(59,130,246,0.1)]">
        <div className="flex items-center gap-4">
          <BrandMark className="w-12 h-12" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-tight">WhenVanshListens Web</span>
            <span className="text-xs text-primary-light font-mono font-medium">Version 1.0.0 (Release)</span>
            <span className="text-xs text-text-muted mt-0.5">Desktop & iOS Safari Optimized</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary-light">
            Vercel Ready
          </span>
        </div>
      </div>

      {/* Connection & Auth Status */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          Spotify Connection & Playback
        </h2>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Radio className={`w-5 h-5 ${connected ? 'text-emerald-400' : 'text-text-muted'}`} />
              <div>
                <span className="text-sm font-bold text-white block">
                  {connected ? 'Connected to Spotify Account' : 'Web Audio Mode (Standalone)'}
                </span>
                <span className="text-xs text-text-muted">
                  {connected
                    ? 'Using Spotify Web Playback SDK / Web API PKCE'
                    : 'Connect Spotify to mirror listening state and control your devices.'}
                </span>
              </div>
            </div>

            {connected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-hover border border-surface-border text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => initiateSpotifyLogin()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)] shrink-0"
              >
                <Radio className="w-4 h-4" />
                Connect Account
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Why I Created This Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          Why I Created This
        </h2>

        <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 text-sm leading-relaxed text-text-secondary">
          <p>
            Music has always been more than background noise to me—it&apos;s a journal of chapters, emotions, late-night thoughts, and personal milestones.
          </p>
          <p>
            Standard streaming platforms are built to keep you scrolling through endless algorithmic recommendations, but they rarely give you an intentional space to reflect on what music has meant to you. That is why I created <strong className="text-white">WhenVanshListens</strong>: a deeply personal listening environment with a dedicated <strong className="text-primary-light">Sound Atlas</strong> to map your true journey, an acoustic waveform player to feel the music, a <strong className="text-primary-light">Music Inbox</strong> to capture recommendations without cluttering your library, and <strong className="text-primary-light">Listening Plans</strong> to schedule deliberate deep dives.
          </p>
          <div className="pt-2 flex items-center gap-2 text-xs text-text-muted font-mono">
            <span>Built with passion by Vansh</span>
            <span>•</span>
            <a
              href="https://www.instagram.com/whenvanshwrites/"
              target="_blank"
              rel="noreferrer"
              className="text-primary-light hover:underline inline-flex items-center gap-1"
            >
              @whenvanshwrites <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* Attribution & Legal Notice */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          Attribution & Privacy
        </h2>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-2 text-xs text-text-muted leading-relaxed">
          <p>
            WhenVanshListens is an evolved, branded experience and web client based on the open-source Myspoti architecture.
          </p>
          <p>
            All listening history, inbox items, and listening plans are stored locally on your device in browser LocalStorage. No listening analytics, passwords, or personal credentials are sent to third-party tracking services.
          </p>
        </div>
      </section>
    </main>
  );
}
