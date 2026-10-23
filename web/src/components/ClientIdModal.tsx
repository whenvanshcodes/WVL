'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, KeyRound } from 'lucide-react';
import { getRedirectUri } from '@/lib/spotifyAuth';

interface ClientIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientId: string) => void;
}

export function ClientIdModal({ isOpen, onClose, onSave }: ClientIdModalProps) {
  const [clientId, setClientId] = useState('');
  const [copied, setCopied] = useState(false);
  const redirectUri = typeof window !== 'undefined' ? getRedirectUri() : 'https://web-fawn-five-77.vercel.app/callback';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientId.trim()) {
      onSave(clientId.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-surface-card border border-primary/30 p-6 md:p-8 space-y-6 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-text-muted hover:text-white hover:bg-surface-hover transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 text-primary-light text-[10px] font-mono font-bold tracking-wider uppercase border border-primary/30">
            <KeyRound className="w-3.5 h-3.5" />
            Spotify Developer App Required
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Connect With Your Spotify Account
          </h2>
          <p className="text-xs md:text-sm text-text-muted">
            To authorize individual Spotify users via PKCE without exposing secrets, provide your Spotify Client ID.
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-3 p-4 rounded-2xl bg-surface-base border border-surface-border text-xs text-text-secondary">
          <div className="font-semibold text-white flex items-center justify-between">
            <span>Setup Guide (Takes 60 seconds):</span>
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary-light hover:underline font-mono"
            >
              <span>Spotify Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
            <li>Open the Spotify Developer Dashboard and click <strong>Create App</strong> (or select an existing one).</li>
            <li>In App Settings, set Redirect URIs to:</li>
          </ol>

          {/* Copyable Redirect URI */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-card border border-primary/20 font-mono text-[11px] text-primary-light">
            <span className="truncate">{redirectUri}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-white shrink-0 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <ol start={3} className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
            <li>Copy your <strong>Client ID</strong> and paste it below. (Never share your Client Secret).</li>
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Spotify Client ID
            </label>
            <input
              type="text"
              placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-base border border-surface-border text-white text-sm focus:outline-none focus:border-primary placeholder:text-text-muted font-mono"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!clientId.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              Save & Authorize
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
