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
  AlertCircle
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
import { getRecentlyPlayedTracks } from '@/lib/spotifyApi';
import { ListeningHistoryEntry, HistoryAlbum, HistoryArtist, Track } from '@/types/music';
import { ClientIdModal } from '@/components/ClientIdModal';

export default function HomePage() {
  const { 
    user, 
    isAuthenticated, 
    isAuthLoading, 
    login, 
    configureClientId,
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
  const [plansCount, setPlansCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Load history, plans, inbox scoped to current user
  useEffect(() => {
    const userId = user?.id || null;
    const hist = getStoredHistory(userId);
    setHistory(hist);
    setAlbums(getExploredAlbums(hist));
    setArtists(getExploredArtists(hist));
    setPlansCount(getStoredPlans(userId).length);
    setInboxCount(getStoredInbox(userId).length);

    // If authenticated, fetch user's live recently played tracks from Spotify Web API
    if (isAuthenticated) {
      setIsLoadingRecent(true);
      getRecentlyPlayedTracks(20)
        .then((tracks) => {
          if (tracks.length > 0) {
            const synced = syncSpotifyRecentHistory(tracks, userId);
            setHistory(synced);
            setAlbums(getExploredAlbums(synced));
            setArtists(getExploredArtists(synced));
          }
        })
        .catch((e) => console.warn('Failed to load recent tracks:', e))
        .finally(() => setIsLoadingRecent(false));
    }
  }, [user, isAuthenticated]);

  const handleLoginClick = async () => {
    const res = await login();
    if (!res.ok && res.error === 'CLIENT_ID_MISSING') {
      setShowConfigModal(true);
    }
  };

  const handleSaveClientId = (id: string) => {
    configureClientId(id);
    setShowConfigModal(false);
    login(id);
  };

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      <ClientIdModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveClientId}
      />

      {/* Header & Identity */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-primary-light font-bold">
              WHENVANSHLISTENS
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
              {isAuthenticated && user ? `Welcome back, ${user.displayName}` : 'Listening Space'}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {isAuthenticated
                ? 'Your personal listening headquarters. Exploring your verified music relationships.'
                : 'An intentional, personal listening space. Connect your Spotify account to begin.'}
            </p>
          </div>

          {!isAuthenticated && !isAuthLoading && (
            <button
              onClick={handleLoginClick}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-light text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(59,130,246,0.35)] shrink-0 self-start sm:self-auto hover:scale-105"
            >
              <Radio className="w-4 h-4" />
              <span>Continue with Spotify</span>
            </button>
          )}
        </div>

        {/* Playback Error Alert if active device needed */}
        {playbackError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">
                  {playbackError === 'NO_ACTIVE_DEVICE'
                    ? 'No Active Spotify Device Found'
                    : playbackError === 'PREMIUM_REQUIRED'
                    ? 'Spotify Premium Required for Direct Web Control'
                    : 'Playback Status'}
                </span>
                <span className="text-amber-200/90 leading-relaxed">
                  {playbackError === 'NO_ACTIVE_DEVICE'
                    ? 'Spotify Web API requires an active device. Open Spotify on your phone, desktop, or tablet and start any song to connect.'
                    : playbackError === 'PREMIUM_REQUIRED'
                    ? 'Interactive Web API playback commands require a Spotify Premium subscription. Free accounts can mirror playback by starting tracks directly in their Spotify app.'
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

        {/* Signed-Out Hero Banner (Prominent "Continue with Spotify") */}
        {!isAuthenticated && !isAuthLoading && (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-card via-primary/10 to-surface-card border border-primary/30 p-6 md:p-8 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-light text-xs font-mono font-bold uppercase tracking-wider border border-primary/30">
                <Sparkles className="w-3.5 h-3.5" />
                Individual Account Access
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Listen with your own Spotify account.
              </h2>

              <p className="text-sm text-text-secondary leading-relaxed">
                WhenVanshListens connects directly to your personal Spotify library using secure PKCE OAuth. 
                Sync your recently played tracks, explore your unique Sound Atlas constellation map, 
                and save recommendations to your private Music Inbox.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleLoginClick}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-sm font-bold transition-all shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:scale-105"
                >
                  <Radio className="w-4 h-4" />
                  <span>Connect with Spotify</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-[11px] text-text-muted flex items-center gap-1.5 px-3">
                  <span>No passwords stored. Official Spotify PKCE OAuth.</span>
                </div>
              </div>
            </div>

            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
              <Disc3 className="w-96 h-96 text-primary" />
            </div>
          </section>
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
                <span className="text-xs text-text-muted">
                  {isAuthenticated ? 'Personalized Constellation Map' : 'Interactive Map'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white group-hover:text-primary-light transition-colors">
                Explore Your Musical Journey
              </h2>
              <p className="text-xs md:text-sm text-text-secondary max-w-xl">
                Visual constellation map connecting every artist, album, and track from your real listening sessions.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-semibold text-primary-light group-hover:translate-x-1 transition-transform shrink-0">
              <span>Open Sound Atlas</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </header>

      {/* Feature Quick Cards (Inbox, Plans, Device Status) */}
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
          <span className="text-sm font-bold text-white block">Playback Device</span>
          <span className="text-xs text-text-muted truncate block">
            {activeDevice ? activeDevice.name : (isAuthenticated ? 'No device active' : 'Connect Spotify')}
          </span>
        </div>
      </section>

      {/* Currently Playing Hero (When playback is active) */}
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
                {isPlaying ? 'Currently Playing' : 'Paused'}
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

      {/* Real Recently Listened Tracks */}
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
                ? 'Play any track on Spotify or explore music here to populate your real listening history.'
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
