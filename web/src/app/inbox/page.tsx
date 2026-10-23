'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Inbox, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Play, 
  CheckCircle2, 
  Clock, 
  Archive,
  Search,
  Link as LinkIcon
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { 
  getStoredInbox, 
  saveInboxItem, 
  updateInboxStatus, 
  removeInboxItem 
} from '@/lib/storage';
import { InboxItem, InboxStatus } from '@/types/music';

const STATUS_TABS: { label: string; status: InboxStatus | 'ALL' }[] = [
  { label: 'All', status: 'ALL' },
  { label: 'To Listen', status: 'TO_LISTEN' },
  { label: 'Listening', status: 'LISTENING' },
  { label: 'Completed', status: 'COMPLETED' },
  { label: 'Archived', status: 'ARCHIVED' },
];

export default function MusicInboxPage() {
  const { user, playTrack } = usePlayer();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<InboxStatus | 'ALL'>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const reload = () => setItems(getStoredInbox(user?.id));

  useEffect(() => {
    reload();
  }, [user]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let derivedSubtitle = artist.trim();
    try {
      if (!derivedSubtitle) derivedSubtitle = new URL(url).hostname;
    } catch {
      if (!derivedSubtitle) derivedSubtitle = 'External Link';
    }
    const derivedTitle = title.trim() || 'Saved Music Link';

    saveInboxItem({
      originalUrl: url.trim(),
      title: derivedTitle,
      subtitle: derivedSubtitle,
      artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      note: note.trim(),
      status: 'TO_LISTEN',
    }, user?.id);

    setUrl('');
    setTitle('');
    setArtist('');
    setNote('');
    setIsAdding(false);
    reload();
  };

  const handleStatusChange = (id: string, newStatus: InboxStatus) => {
    updateInboxStatus(id, newStatus, user?.id);
    reload();
  };

  const handleDelete = (id: string) => {
    removeInboxItem(id, user?.id);
    reload();
  };

  const filteredItems = items
    .filter((item) => selectedTab === 'ALL' || item.status === selectedTab)
    .filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.note.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary-light" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Music Inbox</h1>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Your personal staging ground for songs, links, and recommendations
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? 'Close Form' : 'Save New Link'}
        </button>
      </header>

      {/* Add Item Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="p-5 rounded-2xl bg-surface-card border border-primary/30 space-y-4 animate-in slide-in-from-top duration-200"
        >
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Save Music to Inbox</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1 font-mono">Music Link / URL *</label>
              <input
                type="url"
                required
                placeholder="https://open.spotify.com/track/... or YouTube link"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-black border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1 font-mono">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Song or album title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs text-text-muted block mb-1 font-mono">Artist (Optional)</label>
                <input
                  type="text"
                  placeholder="Artist name"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full bg-black border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1 font-mono">Personal Note</label>
              <textarea
                rows={2}
                placeholder="Why you saved it, who recommended it..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-black border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)]"
            >
              Save Link
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => {
            const count = items.filter((i) => tab.status === 'ALL' || i.status === tab.status).length;
            const isActive = selectedTab === tab.status;
            return (
              <button
                key={tab.status}
                onClick={() => setSelectedTab(tab.status)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                    : 'bg-surface-card border border-surface-border text-text-muted hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-black/30' : 'bg-surface-border'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search saved items and notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 p-6 rounded-2xl bg-surface-card border border-surface-border text-text-muted text-sm">
            <LinkIcon className="w-8 h-8 text-primary-light/40 mx-auto mb-2" />
            No saved music items in this category.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-surface-border mt-0.5">
                  <Image src={item.artworkUrl} alt={item.title} fill className="object-cover" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white truncate">{item.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-border text-primary-light">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary truncate mt-0.5">{item.subtitle}</span>
                  {item.note && (
                    <p className="text-xs text-text-muted mt-1.5 line-clamp-2 italic bg-black/40 p-2 rounded-lg border border-surface-border/50">
                      &quot;{item.note}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {/* Play if resolved */}
                {item.resolvedTrack && (
                  <button
                    onClick={() => playTrack(item.resolvedTrack!)}
                    className="p-2.5 rounded-xl bg-primary/20 text-primary-light hover:bg-primary hover:text-white transition-colors"
                    title="Play track"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                )}

                {/* Status Toggle Menu */}
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(item.id, e.target.value as InboxStatus)}
                  className="bg-black border border-surface-border text-xs text-text-secondary rounded-xl px-2.5 py-2 focus:outline-none focus:border-primary"
                >
                  <option value="TO_LISTEN">To Listen</option>
                  <option value="LISTENING">Listening</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>

                {/* Open External Link */}
                <a
                  href={item.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-surface-hover text-text-muted hover:text-white transition-colors"
                  title="Open original link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2.5 rounded-xl bg-surface-hover text-text-muted hover:text-rose-400 transition-colors"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
