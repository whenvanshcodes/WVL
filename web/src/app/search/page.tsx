'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Play, Disc3, Mic2, Music2 } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { getStoredHistory } from '@/lib/storage';
import { getStoredAccessToken } from '@/lib/spotifyAuth';
import { Track } from '@/types/music';

export default function SearchPage() {
  const { playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TRACKS' | 'ARTISTS' | 'ALBUMS'>('ALL');
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Default discovery items from authentic history
  useEffect(() => {
    const history = getStoredHistory();
    const tracks: Track[] = history.map((h) => ({
      id: h.trackId,
      uri: h.trackUri,
      title: h.title,
      artist: h.artist,
      album: h.album,
      artworkUrl: h.artworkUrl,
      durationMs: 240000,
    }));
    setResults(tracks);
  }, []);

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    if (!searchTerm.trim()) {
      const history = getStoredHistory();
      setResults(history.map(h => ({
        id: h.trackId,
        uri: h.trackUri,
        title: h.title,
        artist: h.artist,
        album: h.album,
        artworkUrl: h.artworkUrl,
        durationMs: 240000,
      })));
      return;
    }

    const token = getStoredAccessToken();
    if (token) {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=track&limit=12`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const items: Track[] = (data.tracks?.items || []).map((t: any) => ({
            id: t.id,
            uri: t.uri,
            title: t.name,
            artist: t.artists.map((a: any) => a.name).join(', '),
            album: t.album.name,
            artworkUrl: t.album.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
            durationMs: t.duration_ms,
            previewUrl: t.preview_url,
          }));
          setResults(items);
        }
      } catch (e) {
        console.warn('Live search error, using local match:', e);
      } finally {
        setIsSearching(false);
      }
    } else {
      // Local fallback filter
      const history = getStoredHistory();
      const filtered = history
        .filter(
          (h) =>
            h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.album.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map((h) => ({
          id: h.trackId,
          uri: h.trackUri,
          title: h.title,
          artist: h.artist,
          album: h.album,
          artworkUrl: h.artworkUrl,
          durationMs: 240000,
        }));
      setResults(filtered);
    }
  };

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Search & Library</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Browse and search through your verified music library and discovery catalog
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          placeholder="What do you want to listen to? (Songs, artists, albums...)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-surface-card border border-surface-border rounded-2xl pl-12 pr-4 py-3.5 text-base text-white placeholder-text-muted focus:outline-none focus:border-primary shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-colors"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        {(['ALL', 'TRACKS', 'ARTISTS', 'ALBUMS'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
              activeFilter === filter
                ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                : 'bg-surface-card border border-surface-border text-text-muted hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Results Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
          {query ? `Results for "${query}"` : 'Your Music Catalog'}
        </h2>

        {results.length === 0 ? (
          <div className="text-center py-12 p-6 rounded-2xl bg-surface-card border border-surface-border text-text-muted text-sm">
            No matching tracks found. Try searching for another song, artist, or album.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-surface-border">
                    <Image src={track.artworkUrl} alt={track.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate group-hover:text-primary-light transition-colors">
                      {track.title}
                    </span>
                    <span className="text-xs text-text-secondary truncate mt-0.5">{track.artist}</span>
                    {track.album && (
                      <span className="text-[11px] text-text-muted truncate mt-0.5">{track.album}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => playTrack(track)}
                  className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 text-primary-light flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-[0_0_12px_rgba(59,130,246,0.2)] active:scale-95 shrink-0"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
