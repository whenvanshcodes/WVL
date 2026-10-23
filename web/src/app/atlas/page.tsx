'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Compass, 
  ListFilter, 
  Play, 
  Pause, 
  Clock, 
  Search, 
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { 
  getStoredHistory, 
  getExploredAlbums, 
  getExploredArtists, 
  buildAtlasGraphData,
  buildAtlasGraphFromSpotifyData,
  syncSpotifyRecentHistory
} from '@/lib/storage';
import { 
  getUserTopArtists, 
  getUserTopTracks, 
  getRecentlyPlayedTracks,
  getUserSavedTracks
} from '@/lib/spotifyApi';
import { 
  ListeningHistoryEntry, 
  HistoryAlbum, 
  HistoryArtist, 
  AtlasNode, 
  AtlasEdge,
  AtlasNodeType 
} from '@/types/music';

export default function SoundAtlasPage() {
  const { user, isAuthenticated, currentTrack, isPlaying, togglePlay, playTrack } = usePlayer();
  const [viewMode, setViewMode] = useState<'history' | 'map'>('history');
  const [history, setHistory] = useState<ListeningHistoryEntry[]>([]);
  const [albums, setAlbums] = useState<HistoryAlbum[]>([]);
  const [artists, setArtists] = useState<HistoryArtist[]>([]);
  const [nodes, setNodes] = useState<AtlasNode[]>([]);
  const [edges, setEdges] = useState<AtlasEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);
  const [filterType, setFilterType] = useState<AtlasNodeType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    const userId = user?.id || null;
    let hist = getStoredHistory(userId);

    if (isAuthenticated) {
      try {
        const [recent, topArtists, topTracks, saved] = await Promise.all([
          getRecentlyPlayedTracks(25).catch(() => []),
          getUserTopArtists(12).catch(() => []),
          getUserTopTracks(20).catch(() => []),
          getUserSavedTracks(20).catch(() => []),
        ]);

        const allTracks = [...recent, ...topTracks, ...saved];
        if (allTracks.length > 0) {
          hist = syncSpotifyRecentHistory(allTracks, userId);
        }

        setHistory(hist);
        setAlbums(getExploredAlbums(hist));
        setArtists(getExploredArtists(hist));

        const graph = (topArtists.length > 0 || topTracks.length > 0)
          ? buildAtlasGraphFromSpotifyData(topArtists, topTracks, recent)
          : buildAtlasGraphData(hist);

        setNodes(graph.nodes);
        setEdges(graph.edges);
        if (graph.nodes.length > 0) {
          setSelectedNode(graph.nodes[0]);
        }
      } catch (err) {
        console.warn('Atlas Spotify sync warning:', err);
        setHistory(hist);
        setAlbums(getExploredAlbums(hist));
        setArtists(getExploredArtists(hist));
        const graph = buildAtlasGraphData(hist);
        setNodes(graph.nodes);
        setEdges(graph.edges);
      }
    } else {
      setHistory(hist);
      setAlbums(getExploredAlbums(hist));
      setArtists(getExploredArtists(hist));
      const graph = buildAtlasGraphData(hist);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      if (graph.nodes.length > 0 && !selectedNode) {
        setSelectedNode(graph.nodes[0]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [user, isAuthenticated, currentTrack]);

  const filteredHistory = history.filter(
    (h) =>
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.album.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNodes = nodes.filter(
    (node) => filterType === 'ALL' || node.type === filterType
  );

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Dual Mode Switch */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary-light" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sound Atlas</h1>
          </div>
          <p className="text-xs text-text-muted mt-0.5">Your music, your journey</p>
        </div>

        {/* View Mode Pill Switch */}
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 rounded-full bg-surface-card border border-surface-border">
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                viewMode === 'history'
                  ? 'bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              History
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-primary text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Constellation Map
            </button>
          </div>

          <button
            onClick={refreshData}
            title="Refresh Sound Atlas"
            className="p-2 rounded-xl bg-surface-card border border-surface-border text-text-muted hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. CHRONOLOGICAL HISTORY VIEW */}
      {viewMode === 'history' ? (
        <div className="space-y-8">
          {/* Current Listening Card */}
          {currentTrack && (
            <div className="flex items-center justify-between p-4 rounded-3xl bg-surface-card border border-primary/40 shadow-[0_0_25px_rgba(59,130,246,0.15)]">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-primary/30">
                  <Image src={currentTrack.artworkUrl} alt={currentTrack.title} fill className="object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary-light">
                    NOW PLAYING
                  </span>
                  <span className="text-base font-bold text-white truncate mt-0.5">{currentTrack.title}</span>
                  <span className="text-xs text-text-muted truncate">{currentTrack.artist} • {currentTrack.album}</span>
                </div>
              </div>

              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 shrink-0"
              >
                {isPlaying ? <span className="font-bold">||</span> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
            </div>
          )}

          {/* Albums Explored */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
                Albums Explored
              </h2>
              <span className="text-xs text-text-muted font-mono">{albums.length} in your journey</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="p-3 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all group"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2.5">
                    <Image src={album.artworkUrl} alt={album.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">
                    {album.name}
                  </h3>
                  <p className="text-xs text-text-muted truncate">{album.artistName}</p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-primary-light px-2 py-0.5 rounded-md bg-primary/10">
                    {album.trackCount} tracks played
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Artists In Your Journey */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold tracking-wider text-text-muted uppercase">
                Artists In Your Journey
              </h2>
              <span className="text-xs text-text-muted font-mono">{artists.length} artists</span>
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

          {/* Search Bar for History */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search your recorded listening history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Chronological List */}
          <section className="space-y-2">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface-card border border-surface-border hover:bg-surface-hover transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                    <Image src={entry.artworkUrl} alt={entry.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white truncate group-hover:text-primary-light transition-colors">
                      {entry.title}
                    </span>
                    <span className="text-xs text-text-secondary truncate">{entry.artist} • {entry.album}</span>
                    <span className="text-[10px] text-primary-light/80 font-mono mt-0.5">
                      {entry.source === 'OBSERVED' ? 'Recorded live playback' : 'Imported history'}
                    </span>
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
                  className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 text-primary-light flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-[0_0_12px_rgba(59,130,246,0.15)] active:scale-95 shrink-0"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </section>
        </div>
      ) : (
        /* 3. 2D CONSTELLATION MAP VIEW */
        <div className="space-y-4">
          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['ALL', 'ARTIST', 'ALBUM', 'TRACK'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all ${
                  filterType === type
                    ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                    : 'bg-surface-card border border-surface-border text-text-muted hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Interactive Galaxy Canvas */}
          <div className="relative w-full h-[520px] rounded-3xl bg-black border border-surface-border overflow-hidden flex items-center justify-center select-none shadow-[inset_0_0_80px_rgba(59,130,246,0.06)]">
            <svg className="w-full h-full cursor-grab active:cursor-grabbing" viewBox="0 0 700 700">
              {/* Radial orbits */}
              <circle cx="350" cy="350" r="100" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              <circle cx="350" cy="350" r="190" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              <circle cx="350" cy="350" r="290" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" fill="none" />

              {/* Relationship Edges */}
              {edges.map((edge, i) => {
                const source = nodes.find((n) => n.id === edge.sourceId);
                const target = nodes.find((n) => n.id === edge.targetId);
                if (!source || !target) return null;
                const isSelected = selectedNode?.id === source.id || selectedNode?.id === target.id;
                return (
                  <line
                    key={i}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isSelected ? '#3B82F6' : '#1E293B'}
                    strokeWidth={isSelected ? '2' : '1'}
                    strokeOpacity={isSelected ? '0.9' : '0.4'}
                  />
                );
              })}

              {/* Galaxy Center Monogram */}
              <circle cx="350" cy="350" r="24" fill="#0A0D14" stroke="#3B82F6" strokeWidth="2" />
              <text x="350" y="354" textAnchor="middle" fill="#60A5FA" fontSize="11" fontWeight="bold" fontFamily="monospace">
                WVL
              </text>

              {/* Interactive Nodes */}
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isTrack = node.type === 'TRACK';
                const isArtist = node.type === 'ARTIST';
                const radius = isArtist ? 18 : isTrack ? 12 : 15;

                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    {/* Node halo */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius + 8}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius}
                      fill="#101522"
                      stroke={isSelected ? '#60A5FA' : isArtist ? '#3B82F6' : '#64748B'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                    />
                    <text
                      x={node.x}
                      y={node.y + radius + 14}
                      textAnchor="middle"
                      fill={isSelected ? '#60A5FA' : '#94A3B8'}
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {node.title.length > 14 ? node.title.slice(0, 13) + '…' : node.title}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Selected Node Inspector Overlay */}
            {selectedNode && (
              <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-2xl bg-surface-card/95 backdrop-blur-xl border border-primary/40 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-primary/30">
                    <Image src={selectedNode.artworkUrl} alt={selectedNode.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-mono uppercase text-primary-light font-bold">
                      {selectedNode.type}
                    </span>
                    <span className="text-sm font-bold text-white truncate">{selectedNode.title}</span>
                    <span className="text-xs text-text-muted truncate">{selectedNode.subtitle}</span>
                  </div>
                </div>

                {selectedNode.type === 'TRACK' ? (
                  <button
                    onClick={() =>
                      playTrack({
                        id: selectedNode.id.replace('track:', ''),
                        uri: selectedNode.uri,
                        title: selectedNode.title,
                        artist: selectedNode.subtitle,
                        album: '',
                        artworkUrl: selectedNode.artworkUrl,
                        durationMs: 240000,
                      })
                    }
                    className="p-3 rounded-full bg-primary text-white hover:bg-primary-light transition-colors shadow-[0_0_12px_rgba(59,130,246,0.5)] shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-primary-light px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                    Explored
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
