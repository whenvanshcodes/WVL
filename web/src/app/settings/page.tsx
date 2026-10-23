'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Settings, 
  ShieldCheck, 
  Radio, 
  Info, 
  CheckCircle2, 
  LogOut, 
  ExternalLink,
  Heart,
  KeyRound,
  Copy,
  Check,
  Smartphone,
  User,
  Database
} from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { usePlayer } from '@/context/PlayerContext';
import { getSpotifyClientId, getRedirectUri } from '@/lib/spotifyAuth';
import { ClientIdModal } from '@/components/ClientIdModal';

export default function SettingsPage() {
  const { 
    user, 
    isAuthenticated, 
    login, 
    logout, 
    activeDevice, 
    availableDevices, 
    clientIdConfigured, 
    configureClientId 
  } = usePlayer();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const redirectUri = typeof window !== 'undefined' ? getRedirectUri() : 'https://web-fawn-five-77.vercel.app/callback';
  const currentClientId = typeof window !== 'undefined' ? getSpotifyClientId() : null;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoginClick = async () => {
    const res = await login();
    if (!res.ok && res.error === 'CLIENT_ID_MISSING') {
      setShowConfigModal(true);
    }
  };

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-5 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      <ClientIdModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={(id) => {
          configureClientId(id);
          setShowConfigModal(false);
          login(id);
        }}
      />

      {/* Header */}
      <header className="pb-4 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-light" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Settings & About</h1>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          Connection status, Spotify PKCE authentication, and project attribution
        </p>
      </header>

      {/* Brand Identity Card */}
      <div className="p-6 rounded-3xl bg-surface-card border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(59,130,246,0.1)]">
        <div className="flex items-center gap-4">
          <BrandMark className="w-12 h-12" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-tight">WhenVanshListens Web</span>
            <span className="text-xs text-primary-light font-mono font-medium">Version 1.1.0 (PKCE Edition)</span>
            <span className="text-xs text-text-muted mt-0.5">Desktop & iOS Safari Compatible</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary-light">
            Vercel Production
          </span>
        </div>
      </div>

      {/* Connection & Auth Status */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          Spotify Connection & Profile
        </h2>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {isAuthenticated && user && user.images && user.images.length > 0 ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/40 shrink-0">
                  <Image
                    src={user.images[0].url}
                    alt={user.displayName}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isAuthenticated ? 'bg-primary/20 text-primary-light border border-primary/40' : 'bg-surface-base text-text-muted border border-surface-border'}`}>
                  <Radio className="w-6 h-6" />
                </div>
              )}

              <div>
                <span className="text-base font-bold text-white block">
                  {isAuthenticated && user ? user.displayName : 'Not Connected'}
                </span>
                <span className="text-xs text-text-muted">
                  {isAuthenticated && user
                    ? `${user.product === 'premium' ? 'Spotify Premium' : 'Spotify Free'} • ${user.email || 'Authorized'}`
                    : 'Sign in to authorize WhenVanshListens with your personal Spotify account.'}
                </span>
              </div>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-hover border border-surface-border text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105"
              >
                <Radio className="w-4 h-4" />
                Connect Spotify
              </button>
            )}
          </div>

          {/* Active Devices if connected */}
          {isAuthenticated && (
            <div className="pt-4 border-t border-surface-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-primary-light" />
                  Active Spotify Devices
                </span>
                <span className="text-text-muted font-mono text-[11px]">
                  {availableDevices.length} available
                </span>
              </div>

              {availableDevices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {availableDevices.map((d) => (
                    <div
                      key={d.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${d.is_active ? 'bg-primary/10 border-primary/40 text-primary-light' : 'bg-surface-base border-surface-border text-text-muted'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span className="font-semibold truncate">{d.name}</span>
                      </div>
                      <span className="text-[10px] font-mono uppercase shrink-0">
                        {d.is_active ? 'Active' : d.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-surface-base border border-surface-border text-xs text-text-muted">
                  No active devices found. Open the Spotify app on your phone or computer to enable remote control.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Spotify Developer App Configuration (Client ID) */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          OAuth & Developer App Configuration
        </h2>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-white block">Spotify Client ID</span>
              <span className="text-xs text-text-muted font-mono">
                {currentClientId ? `${currentClientId.substring(0, 8)}••••••••••••••••` : 'Not configured'}
              </span>
            </div>

            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-base hover:bg-surface-hover border border-surface-border text-xs font-semibold text-white transition-colors self-start sm:self-auto"
            >
              <KeyRound className="w-3.5 h-3.5 text-primary-light" />
              <span>{currentClientId ? 'Change Client ID' : 'Configure Client ID'}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-surface-border space-y-2">
            <span className="text-xs text-text-secondary block">
              Registered Callback URI for Spotify Developer Dashboard:
            </span>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-base border border-surface-border font-mono text-xs text-primary-light">
              <span className="truncate">{redirectUri}</span>
              <button
                onClick={handleCopyUri}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-white shrink-0 transition-colors text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Local Storage & Device Isolation Notice */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          Privacy & Storage Architecture
        </h2>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border space-y-3 text-xs text-text-secondary leading-relaxed">
          <div className="flex items-center gap-2 text-white font-bold">
            <Database className="w-4 h-4 text-primary-light" />
            <span>Browser-Isolated Local Storage</span>
          </div>
          <p>
            Your Music Inbox recommendations, Listening Plans, and Sound Atlas configurations are stored securely 
            in this browser's local storage and isolated per user profile.
          </p>
          <p className="text-text-muted">
            Note: In accordance with web platform sandboxing, browser local storage does not automatically synchronize 
            with the native Android app or cross-device cloud backends. Each browser maintains its private session.
          </p>
        </div>
      </section>

      {/* Why I Created This */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          Why I Created This
        </h2>

        <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            I made <strong className="text-white">WhenVanshListens</strong> because music deserves intentionality. 
            Commercial music streaming platforms have turned listening into an endless stream of algorithmic churn, 
            intrusive sponsored promotions, and noisy banners.
          </p>
          <p>
            This application is designed as a sanctuary: pure AMOLED black, electric-blue visual hierarchy, 
            and an authentic Sound Atlas to visualize the interconnected universe of songs and artists that matter to you.
          </p>
          <p className="pt-2 text-xs font-mono text-primary-light">
            Crafted by Vansh • Follow on Instagram{' '}
            <a
              href="https://www.instagram.com/whenvanshwrites/"
              target="_blank"
              rel="noreferrer"
              className="underline text-white hover:text-primary-light"
            >
              @whenvanshwrites
            </a>
          </p>
        </div>
      </section>

      {/* Open Source Notice */}
      <footer className="pt-4 border-t border-surface-border text-center text-xs text-text-muted">
        <p>WhenVanshListens Web • Built with Next.js 14, Tailwind CSS & Spotify Web API</p>
        <p className="mt-1">Original Myspoti Android base licensed under GPL-3.0</p>
      </footer>
    </main>
  );
}
