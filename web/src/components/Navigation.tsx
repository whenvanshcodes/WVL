'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Compass, 
  Inbox, 
  ListMusic, 
  Search, 
  Settings,
  Radio,
  LogOut,
  Sparkles
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { usePlayer } from '@/context/PlayerContext';

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
  const { 
    user, 
    isAuthenticated, 
    isLoginInProgress,
    login, 
    logout, 
    activeDevice 
  } = usePlayer();

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

        {/* User Profile or Login CTA */}
        <div className="mt-auto p-3.5 rounded-2xl bg-surface-card border border-surface-border">
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {user.images && user.images.length > 0 ? (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-primary/40 shrink-0">
                    <Image
                      src={user.images[0].url}
                      alt={user.displayName}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary-light font-bold text-sm shrink-0">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-white truncate">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] text-primary-light font-mono capitalize truncate">
                    {user.product === 'premium' ? 'Spotify Premium' : 'Spotify Free'}
                  </span>
                </div>
              </div>

              {activeDevice && (
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-base border border-surface-border flex items-center justify-between text-[10px]">
                  <span className="text-text-muted">Device:</span>
                  <span className="text-emerald-400 font-mono font-medium truncate max-w-[120px]">
                    {activeDevice.name}
                  </span>
                </div>
              )}

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface-base hover:bg-rose-500/10 border border-surface-border hover:border-rose-500/30 text-rose-400 text-xs font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 text-center">
              <div className="flex items-center justify-center gap-2 text-primary-light">
                <Radio className="w-4 h-4" />
                <span className="text-xs font-bold text-white">Your Music Space</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Connect your personal Spotify account to sync your playlists and listening history.
              </p>
              <button
                onClick={() => login()}
                disabled={isLoginInProgress}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] disabled:opacity-60"
              >
                <span>{isLoginInProgress ? 'Connecting...' : 'Continue with Spotify'}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Header (compact brand & auth status) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-md border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <BrandMark className="w-6 h-6" />
          <span className="font-bold text-white text-sm tracking-tight">WhenVanshListens</span>
        </div>

        <div>
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {user.images && user.images.length > 0 ? (
                <div className="relative w-7 h-7 rounded-full overflow-hidden border border-primary/40">
                  <Image
                    src={user.images[0].url}
                    alt={user.displayName}
                    fill
                    className="object-cover"
                    sizes="28px"
                  />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary-light font-bold text-xs">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-text-secondary truncate max-w-[90px]">
                {user.displayName}
              </span>
            </div>
          ) : (
            <button
              onClick={() => login()}
              disabled={isLoginInProgress}
              className="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:bg-primary-light transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)] disabled:opacity-60"
            >
              {isLoginInProgress ? 'Connecting...' : 'Sign In'}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (iOS Safari & touch friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg border-t border-surface-border px-2 py-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom))] flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive ? 'text-primary-light' : 'text-text-muted hover:text-text-secondary'
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
