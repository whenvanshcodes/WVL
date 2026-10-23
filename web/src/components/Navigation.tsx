'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Compass, 
  Inbox, 
  ListMusic, 
  Search, 
  Settings,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { isSpotifyConnected, initiateSpotifyLogin } from '@/lib/spotifyAuth';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/atlas', label: 'Sound Atlas', icon: Compass },
  { href: '/inbox', label: 'Music Inbox', icon: Inbox },
  { href: '/plans', label: 'Listening Plans', icon: ListMusic },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected(isSpotifyConnected());
  }, []);

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-black border-r border-surface-border p-5 select-none shrink-0">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <BrandMark className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white text-base">
              WhenVanshListens
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-primary-light">
              Listening Space
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary-light border border-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'text-text-secondary hover:text-white hover:bg-surface-card'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-light' : 'text-text-muted'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Spotify Account Connect status card */}
        <div className="mt-auto p-3.5 rounded-2xl bg-surface-card border border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary">Spotify Connect</span>
            {connected ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            ) : (
              <span className="text-[10px] text-amber-400/90 font-mono">Web Audio Mode</span>
            )}
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed mb-3">
            {connected
              ? 'Synced with your active Spotify playback.'
              : 'Connect Spotify to mirror playback on any Spotify device.'}
          </p>
          {!connected && (
            <button
              onClick={() => initiateSpotifyLogin()}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary-light transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)]"
            >
              <Radio className="w-3.5 h-3.5" />
              Connect Spotify
            </button>
          )}
        </div>
      </aside>

      {/* Mobile iOS Safari Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-surface-border px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-center">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-primary-light' : 'text-text-muted hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
