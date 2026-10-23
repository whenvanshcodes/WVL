'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Play, Disc3, Mic2, Music2, ListMusic, ExternalLink } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { getStoredHistory } from '@/lib/storage';
import { 
  searchSpotifyCatalog, 
  getUserPlaylists, 
  getUserTopTracks, 
  getUserSavedTracks, 
  getPlaylistTracks 
} from '@/lib/spotifyApi';
import { Track } from '@/types/music';

export default function SearchPage() {
  const { user, isAuthenticated, playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TRACKS' | 'PLAYLISTS'>('ALL');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistName, setSelectedPlaylistName] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load user's real playlists and library tracks
  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([
        getUserPlaylists(15).catch(() => []),
        getUserTopTracks(25).catch(() => []),
        getUserSavedTracks(25).catch(() => []),
      ]).then(([list, top, saved]) => {
        setPlaylists(list);
        const combined = [...top, ...saved].filter(
          (track, index, self) => index === self.findIndex((t) => t.id === track.id)
        );
        if (combined.length > 0) {
          setTracks(combined);
        }
      });
    }

    const history = getStoredHistory(user?.id);
    if (history.length > 0) {
      setTracks((prev) => {
        if (prev.length > 0) return prev;
        return history.map((h) => ({
          id: h.trackId,
          uri: h.trackUri,
          title: h.title,
          artist: h.artist,
          album: h.album,
          artworkUrl: h.artworkUrl,
          durationMs: 240000,
        }));
      });
    }
  }, [user, isAuthenticated]);

  const handleSelectPlaylist = async (playlist: any) => {
    setIsSearching(true);
    setSelectedPlaylistName(playlist.name);
    try {
      const plTracks = await getPlaylistTracks(playlist.id, 40);
      if (plTracks.length > 0) {
        setTracks(plTracks);
        setActiveFilter('TRACKS');
      }
    } catch (e) {
      console.warn('Failed to fetch playlist tracks:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    if (!searchTerm.trim()) {
      const history = getStoredHistory(user?.id);
      setTracks(history.map(h => ({
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

    setIsSearching(true);
    try {
      const { tracks: searchResults } = await searchSpotifyCatalog(searchTerm, 'track', 15);
      if (searchResults.length > 0) {
        setTracks(searchResults);
      } else {
        // Fallback filter
        const history = getStoredHistory(user?.id);
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
        setTracks(filtered);
      }
    } catch {
      // Local fallback
      const history = getStoredHistory(user?.id);
      setTracks(history.filter(h => h.title.toLowerCase().includes(searchTerm.toLowerCase())).map(h => ({
        id: h.trackId,
        uri: h.trackUri,
        title: h.title,
        artist: h.artist,
        album: h.album,
        artworkUrl: h.artworkUrl,
        durationMs: 240000,
      })));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header & Search Bar */}
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Search & Library</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Search Spotify&apos;s global catalog or browse your saved playlists
          </p>
        </div>

        {/* Search input with Electric-Blue focus */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search tracks, artists, or albums..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface-card border border-surface-border focus:border-primary focus:outline-none text-white text-sm placeholder:text-text-muted shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'ALL'
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-surface-card border border-surface-border text-text-secondary hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('TRACKS')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'TRACKS'
                ? 'bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-surface-card border border-surface-border text-text-secondary hover:text-white'
            }`}
          >
            Tracks
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setActiveFilter('PLAYLISTS')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'PLAYLISTS'
                  ? 'bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                  : 'bg-surface-card border border-surface-border text-text-secondary hover:text-white'
              }`}
            >
              Your Playlists ({playlists.length})
            </button>
          )}
        </div>
      </header>

      {/* User Playlists (When authenticated and filter matches) */}
      {isAuthenticated && playlists.length > 0 && (activeFilter === 'ALL' || activeFilter === 'PLAYLISTS') && !query && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <ListMusic className="w-4 h-4 text-primary-light" />
            <span>Your Spotify Playlists</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => handleSelectPlaylist(pl)}
                className="group p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/50 hover:bg-surface-hover transition-all flex flex-col space-y-2 cursor-pointer shadow-sm"
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white truncate block group-hover:text-primary-light transition-colors">
                    {pl.name}
                  </span>
                  <span className="text-xs text-text-muted truncate block">
                    {pl.tracks?.total || 0} tracks • Click to view
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Selected Playlist Active Filter Banner */}
      {selectedPlaylistName && !query && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/30 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold">
            <ListMusic className="w-4 h-4 text-primary-light" />
            <span>Playlist: <strong className="text-primary-light">{selectedPlaylistName}</strong></span>
          </div>
          <button
            onClick={() => {
              setSelectedPlaylistName(null);
              const history = getStoredHistory(user?.id);
              if (history.length > 0) {
                setTracks(history.map(h => ({
                  id: h.trackId,
                  uri: h.trackUri,
                  title: h.title,
                  artist: h.artist,
                  album: h.album,
                  artworkUrl: h.artworkUrl,
                  durationMs: 240000,
                })));
              }
            }}
            className="text-text-muted hover:text-white underline text-xs font-mono"
          >
            Show All Songs
          </button>
        </div>
      )}

      {/* Track Results */}
      {(activeFilter === 'ALL' || activeFilter === 'TRACKS') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted font-mono">
            <span>
              {query 
                ? `RESULTS FOR "${query.toUpperCase()}"` 
                : selectedPlaylistName 
                ? `TRACKS IN "${selectedPlaylistName.toUpperCase()}"` 
                : 'YOUR SPOTIFY TRACKS & LIBRARY'}
            </span>
            <span>{tracks.length} tracks</span>
          </div>

          {isSearching ? (
            <div className="p-12 text-center text-text-muted text-xs font-mono">
              Loading tracks from Spotify...
            </div>
          ) : tracks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tracks.map((track) => (
                <div
                  key={track.id + track.uri}
                  onClick={() => playTrack(track)}
                  className="group flex items-center gap-3 p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/50 hover:bg-surface-hover transition-all cursor-pointer"
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
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-surface-card border border-surface-border text-center space-y-2">
              <Search className="w-8 h-8 text-text-muted mx-auto" />
              <span className="text-sm font-bold text-white block">No tracks found</span>
              <p className="text-xs text-text-muted">
                Try searching for another song title, artist, or album.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
