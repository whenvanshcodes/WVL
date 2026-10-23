'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Play, 
  Pause,
  Compass, 
  ArrowRight, 
  ListMusic, 
  Inbox,
  Disc3,
  Clock,
  Radio,
  Sparkles,
  Smartphone,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Music2,
  Heart
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { 
  getStoredHistory, 
  getExploredAlbums, 
  getExploredArtists, 
  getStoredPlans, 
  getStoredInbox,
  syncSpotifyRecentHistory 
} from '@/lib/storage';
import { 
  getRecentlyPlayedTracks, 
  getUserTopTracks, 
  getUserSavedTracks, 
  getUserPlaylists 
} from '@/lib/spotifyApi';
import { ListeningHistoryEntry, HistoryAlbum, HistoryArtist, Track } from '@/types/music';
import { BrandMark } from '@/components/BrandMark';

export default function HomePage() {
  const { 
    user, 
    isAuthenticated, 
    isAuthLoading, 
    isLoginInProgress,
    authError,
    clearAuthError,
    login, 
    currentTrack, 
    isPlaying, 
    playTrack, 
    togglePlay, 
    activeDevice,
    playbackError,
    clearPlaybackError
  } = usePlayer();

  const [history, setHistory] = useState<ListeningHistoryEntry[]>([]);
  const [albums, setAlbums] = useState<HistoryAlbum[]>([]);
  const [artists, setArtists] = useState<HistoryArtist[]>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [savedTracks, setSavedTracks] = useState<Track[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [plansCount, setPlansCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [isLoadingMusic, setIsLoadingMusic] = useState(false);

  // Load history, plans, inbox scoped to current user
  useEffect(() => {
    const userId = user?.id || null;
    const hist = getStoredHistory(userId);
    setHistory(hist);
    setAlbums(getExploredAlbums(hist));
    setArtists(getExploredArtists(hist));
    setPlansCount(getStoredPlans(userId).length);
    setInboxCount(getStoredInbox(userId).length);

    // If authenticated, fetch user's live Spotify tracks, top tracks, saved songs, and playlists
    if (isAuthenticated) {
      setIsLoadingMusic(true);
      Promise.all([
        getRecentlyPlayedTracks(20).catch(() => []),
        getUserTopTracks(20).catch(() => []),
        getUserSavedTracks(20).catch(() => []),
        getUserPlaylists(8).catch(() => []),
      ])
        .then(([recent, top, saved, playlists]) => {
          setTopTracks(top);
          setSavedTracks(saved);
          setUserPlaylists(playlists);

          const combined = [...recent, ...top, ...saved];
          if (combined.length > 0) {
            const synced = syncSpotifyRecentHistory(combined, userId);
            setHistory(synced);
            setAlbums(getExploredAlbums(synced));
            setArtists(getExploredArtists(synced));
          }
        })
        .catch((e) => console.warn('Failed to load Spotify tracks:', e))
        .finally(() => setIsLoadingMusic(false));
    }
  }, [user, isAuthenticated]);

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* 1. SIGNED-OUT WELCOME EXPERIENCE */}
      {!isAuthenticated && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-surface-card via-black to-surface-card border border-primary/20 p-8 md:p-12 text-center shadow-[0_0_50px_rgba(59,130,246,0.1)] space-y-6">
          {/* Waveform Logo */}
          <div className="flex justify-center">
            <BrandMark className="w-20 h-20 md:w-24 md:h-24" />
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            <span className="text-xs uppercase font-mono tracking-widest text-primary-light font-bold">
              WhenVanshListens
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Your music. Your universe.
            </h1>
            <p className="text-sm md:text-base text-text-secondary leading-relaxed">
              A more personal way to explore everything you listen to.
            </p>
          </div>

          {/* Configuration / Auth Error Notice */}
          {authError && (
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-left flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-white block">Notice</span>
                  <p className="text-amber-200/90 leading-relaxed">{authError}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  clearAuthError();
                  login();
                }}
                className="text-primary-light hover:underline text-xs font-mono shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Prominent "Continue with Spotify" Action */}
          <div className="pt-2 flex flex-col items-center justify-center space-y-3">
            <button
              onClick={() => login()}
              disabled={isLoginInProgress}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-primary hover:bg-primary-light text-white text-base font-bold transition-all shadow-[0_0_30px_rgba(59,130,246,0.45)] hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {isLoginInProgress ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Connecting to Spotify...</span>
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  <span>Continue with Spotify</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Subtle Privacy Note */}
            <p className="text-[11px] text-text-muted max-w-sm mx-auto leading-relaxed flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary-light shrink-0" />
              <span>Connects securely via Spotify. Your account credentials are never shared with or stored by WhenVanshListens.</span>
            </p>
          </div>
        </section>
      )}

      {/* 2. AUTHENTICATED PERSONAL DASHBOARD */}
      {isAuthenticated && user && (
        <header className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-primary-light font-bold">
                WHENVANSHLISTENS
              </span>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
                Welcome back, {user.displayName}
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Your personal listening space. Exploring your verified music relationships.
              </p>
            </div>

            {activeDevice && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-card border border-surface-border text-xs shrink-0 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-text-muted">Playing on</span>
                <span className="text-white font-semibold">{activeDevice.name}</span>
              </div>
            )}
          </div>

          {/* Playback Alert if active device needed */}
          {playbackError && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">
                    {playbackError === 'NO_ACTIVE_DEVICE'
                      ? 'No Active Spotify Device Found'
                      : playbackError === 'PREMIUM_REQUIRED'
                      ? 'Spotify Premium Required for Remote Playback Control'
                      : 'Playback Notice'}
                  </span>
                  <span className="text-amber-200/90 leading-relaxed">
                    {playbackError === 'NO_ACTIVE_DEVICE'
                      ? 'Open Spotify on your phone, desktop, or tablet and start any track to enable remote control.'
                      : playbackError === 'PREMIUM_REQUIRED'
                      ? 'Direct remote playback control requires Spotify Premium. Free accounts can stream directly in the Spotify app while tracking history in WhenVanshListens.'
                      : playbackError}
                  </span>
                </div>
              </div>
              <button
                onClick={clearPlaybackError}
                className="text-text-muted hover:text-white text-xs font-mono shrink-0 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Sound Atlas Hero Banner */}
          <Link
            href="/atlas"
            className="group relative block w-full rounded-3xl bg-surface-card border border-surface-border hover:border-primary/50 p-6 overflow-hidden transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          >
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary-light text-[10px] font-mono font-bold tracking-wider uppercase border border-primary/30">
                    <Compass className="w-3.5 h-3.5" />
                    Sound Atlas 3.0
                  </span>
                  <span className="text-xs text-text-muted">Personalized Constellation Map</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-primary-light transition-colors">
                  Explore Your Musical Universe
                </h2>
                <p className="text-xs md:text-sm text-text-secondary max-w-xl">
                  Visual relationship graph connecting your favorite artists, albums, and songs from real listening data.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold text-primary-light group-hover:translate-x-1 transition-transform shrink-0">
                <span>Open Sound Atlas</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </header>
      )}

      {/* Feature Navigation Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Link
          href="/atlas"
          className="p-4 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
        >
          <Compass className="w-5 h-5 text-primary-light mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-white block">Sound Atlas</span>
          <span className="text-xs text-text-muted">{history.length} tracks mapped</span>
        </Link>

        <Link
          href="/inbox"
          className="p-4 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
        >
          <Inbox className="w-5 h-5 text-primary-light mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-white block">Music Inbox</span>
          <span className="text-xs text-text-muted">{inboxCount} saved recommendations</span>
        </Link>

        <Link
          href="/plans"
          className="p-4 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
        >
          <ListMusic className="w-5 h-5 text-primary-light mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-white block">Listening Plans</span>
          <span className="text-xs text-text-muted">{plansCount} active sessions</span>
        </Link>

        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border">
          <Smartphone className={`w-5 h-5 mb-2 ${activeDevice ? 'text-emerald-400' : 'text-text-muted'}`} />
          <span className="text-sm font-bold text-white block">Device Status</span>
          <span className="text-xs text-text-muted truncate block">
            {activeDevice ? activeDevice.name : (isAuthenticated ? 'Ready to connect' : 'Sign in to sync')}
          </span>
        </div>
      </section>

      {/* Currently Playing Card (When Spotify playback is verified) */}
      {currentTrack && (
        <section className="p-5 md:p-6 rounded-3xl bg-surface-card border border-primary/30 relative overflow-hidden shadow-[0_0_25px_rgba(59,130,246,0.1)]">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden shrink-0 shadow-lg border border-primary/20">
              <Image
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary-light text-[10px] font-mono font-bold tracking-wider uppercase">
                <Disc3 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
                {isPlaying ? 'Now Playing' : 'Paused'}
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white truncate">
                {currentTrack.title}
              </h2>
              <p className="text-sm text-text-secondary truncate">
                {currentTrack.artist} • <span className="text-text-muted">{currentTrack.album}</span>
              </p>
            </div>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light hover:scale-105 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] shrink-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
            </button>
          </div>
        </section>
      )}

      {/* Loading state when fetching Spotify music */}
      {isAuthenticated && isLoadingMusic && history.length === 0 && (
        <div className="p-8 rounded-3xl bg-surface-card border border-primary/20 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-primary-light animate-spin mx-auto" />
          <span className="text-sm font-bold text-white block">Loading your Spotify songs...</span>
          <p className="text-xs text-text-muted">Fetching your top tracks, liked songs, and playlists.</p>
        </div>
      )}

      {/* Your Spotify Songs (Top & Liked Tracks) */}
      {isAuthenticated && (topTracks.length > 0 || savedTracks.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-light" />
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Your Spotify Songs
              </h2>
            </div>
            <Link href="/search" className="text-xs text-primary-light hover:underline font-mono">
              Search All ({topTracks.length + savedTracks.length})
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[...topTracks, ...savedTracks]
              .filter((track, index, self) => index === self.findIndex((t) => t.id === track.id))
              .slice(0, 9)
              .map((track) => (
                <div
                  key={track.id + track.uri}
                  onClick={() => playTrack(track)}
                  className="group flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/50 hover:bg-surface-hover transition-all cursor-pointer shadow-sm"
                >
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                    <Image
                      src={track.artworkUrl}
                      alt={track.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="48px"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-white truncate block group-hover:text-primary-light transition-colors">
                      {track.title}
                    </span>
                    <span className="text-xs text-text-muted truncate block">
                      {track.artist}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track);
                    }}
                    className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary-light flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0"
                    aria-label={`Play ${track.title}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Your Spotify Playlists */}
      {isAuthenticated && userPlaylists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-primary-light" />
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                Your Playlists
              </h2>
            </div>
            <Link href="/search" className="text-xs text-primary-light hover:underline font-mono">
              View All ({userPlaylists.length})
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {userPlaylists.slice(0, 4).map((pl) => (
              <Link
                key={pl.id}
                href="/search"
                className="group p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all flex flex-col space-y-2"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-base">
                  {pl.images?.[0]?.url ? (
                    <Image
                      src={pl.images[0].url}
                      alt={pl.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <Music2 className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white truncate block group-hover:text-primary-light transition-colors">
                    {pl.name}
                  </span>
                  <span className="text-xs text-text-muted truncate block">
                    {pl.tracks?.total || 0} tracks
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Real Recently Played Tracks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-light" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isAuthenticated ? 'Recently Played' : 'Listening History'}
            </h2>
          </div>
          <Link href="/atlas" className="text-xs text-primary-light hover:underline font-mono">
            View All ({history.length})
          </Link>
        </div>

        {history.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {history.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => playTrack({
                  id: item.trackId,
                  uri: item.trackUri,
                  title: item.title,
                  artist: item.artist,
                  album: item.album,
                  artworkUrl: item.artworkUrl,
                  durationMs: 240000,
                })}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/50 hover:bg-surface-hover transition-all cursor-pointer"
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={item.artworkUrl}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="48px"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white truncate block group-hover:text-primary-light transition-colors">
                    {item.title}
                  </span>
                  <span className="text-xs text-text-muted truncate block">
                    {item.artist}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-surface-card border border-surface-border text-center space-y-2">
            <Clock className="w-8 h-8 text-text-muted mx-auto" />
            <span className="text-sm font-bold text-white block">No recent tracks yet</span>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {isAuthenticated
                ? 'Play any track on Spotify or explore music here to populate your personal history.'
                : 'Connect your Spotify account to sync your recently played tracks.'}
            </p>
          </div>
        )}
      </section>

      {/* Explored Albums */}
      {albums.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-primary-light" />
            <h2 className="text-lg font-bold text-white tracking-tight">Explored Albums</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {albums.slice(0, 4).map((album) => (
              <div
                key={album.id}
                className="group p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all flex flex-col space-y-2"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden">
                  <Image
                    src={album.artworkUrl}
                    alt={album.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white truncate block group-hover:text-primary-light transition-colors">
                    {album.name}
                  </span>
                  <span className="text-xs text-text-muted truncate block">
                    {album.artistName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
