'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Play, 
  Compass, 
  ArrowRight, 
  ListMusic, 
  Inbox,
  Disc3,
  Clock
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { 
  getStoredHistory, 
  getExploredAlbums, 
  getExploredArtists, 
  getStoredPlans, 
  getStoredInbox 
} from '@/lib/storage';
import { ListeningHistoryEntry, HistoryAlbum, HistoryArtist } from '@/types/music';

export default function HomePage() {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [history, setHistory] = useState<ListeningHistoryEntry[]>([]);
  const [albums, setAlbums] = useState<HistoryAlbum[]>([]);
  const [artists, setArtists] = useState<HistoryArtist[]>([]);
  const [plansCount, setPlansCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    const hist = getStoredHistory();
    setHistory(hist);
    setAlbums(getExploredAlbums(hist));
    setArtists(getExploredArtists(hist));
    setPlansCount(getStoredPlans().length);
    setInboxCount(getStoredInbox().length);
  }, [currentTrack]);

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Sound Atlas Callout Banner */}
      <header className="space-y-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-primary-light font-bold">
            WHENVANSHLISTENS
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mt-1">
            Listening Space
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Your music, your journey. An authentic personal listening dashboard.
          </p>
        </div>

        {/* Sound Atlas Hero Banner */}
        <Link
          href="/atlas"
          className="group relative block w-full rounded-3xl bg-gradient-to-r from-surface-card via-primary/10 to-surface-card border border-primary/30 p-6 overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:border-primary/60 transition-all"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary-light text-[10px] font-mono font-bold tracking-wider uppercase border border-primary/30">
                  <Compass className="w-3.5 h-3.5" />
                  Sound Atlas 3.0
                </span>
                <span className="text-xs text-text-muted">Interactive Listening Map</span>
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

      {/* 2. Quick Dashboard Cards (Inbox & Plans) */}
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
          <span className="text-xs text-text-muted">{inboxCount} saved items</span>
        </Link>

        <Link
          href="/plans"
          className="p-4 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
        >
          <ListMusic className="w-5 h-5 text-primary-light mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-white block">Listening Plans</span>
          <span className="text-xs text-text-muted">{plansCount} active plans</span>
        </Link>

        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border">
          <Disc3 className="w-5 h-5 text-primary-light mb-2 animate-spin-slow" />
          <span className="text-sm font-bold text-white block">Explored</span>
          <span className="text-xs text-text-muted">{albums.length} albums & {artists.length} artists</span>
        </div>
      </section>

      {/* 3. Continue Listening (Current Session Hero) */}
      {currentTrack && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
              Now Playing
            </h2>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-card border border-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.12)]">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-primary/30">
                <Image src={currentTrack.artworkUrl} alt={currentTrack.title} fill className="object-cover" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-white truncate">{currentTrack.title}</span>
                <span className="text-sm text-text-secondary truncate">{currentTrack.artist}</span>
                {currentTrack.album && (
                  <span className="text-xs text-text-muted truncate mt-0.5">{currentTrack.album}</span>
                )}
              </div>
            </div>

            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 shrink-0"
            >
              {isPlaying ? <span className="text-sm font-bold">||</span> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>
        </section>
      )}

      {/* 4. Albums Explored */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
            Albums Explored
          </h2>
          <span className="text-xs text-text-muted font-mono">{albums.length} in your journey</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {albums.map((album) => (
            <div
              key={album.id}
              className="p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all group"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 border border-surface-border">
                <Image src={album.artworkUrl} alt={album.name} fill className="object-cover group-hover:scale-105 transition-transform" />
              </div>
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">
                {album.name}
              </h3>
              <p className="text-xs text-text-muted truncate mt-0.5">{album.artistName}</p>
              <span className="inline-block mt-2 text-[10px] font-mono text-primary-light px-2 py-0.5 rounded-md bg-primary/10">
                {album.trackCount} tracks played
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Artists in Your Journey */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
            Artists In Your Journey
          </h2>
          <span className="text-xs text-text-muted font-mono">{artists.length} artists listened</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {artists.map((artist) => (
            <div
              key={artist.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-primary/30">
                <Image src={artist.artworkUrl} alt={artist.name} fill className="object-cover" />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{artist.name}</h3>
                <span className="text-xs text-text-muted font-mono">{artist.trackCount} tracks</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Recent Listening Activity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
            Recent Listening Activity
          </h2>
          <span className="text-xs text-text-muted font-mono">Newest first</span>
        </div>

        <div className="space-y-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-card border border-surface-border hover:bg-surface-hover transition-colors group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0">
                  <Image src={entry.artworkUrl} alt={entry.title} fill className="object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">
                    {entry.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-text-muted truncate mt-0.5">
                    <span>{entry.artist}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-primary-light/80">
                      <Clock className="w-3 h-3" />
                      {entry.source === 'OBSERVED' ? 'Observed' : 'Imported'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  playTrack({
                    id: entry.trackId,
                    uri: entry.trackUri,
                    title: entry.title,
                    artist: entry.artist,
                    album: entry.album,
                    artworkUrl: entry.artworkUrl,
                    durationMs: 240000,
                  })
                }
                className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 text-primary-light flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] active:scale-95 shrink-0"
                aria-label={`Play ${entry.title}`}
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
