'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { handleSpotifyCallback } from '@/lib/spotifyAuth';
import { BrandMark } from '@/components/BrandMark';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const err = searchParams.get('error');

    if (err) {
      setIsProcessing(false);
      if (err === 'access_denied') {
        setError('Spotify authorization was cancelled. You must grant permissions to connect your account.');
      } else {
        setError(`Spotify authorization failed: ${err}`);
      }
      return;
    }

    if (!code) {
      setIsProcessing(false);
      setError('No authorization code was received from Spotify.');
      return;
    }

    handleSpotifyCallback(code, returnedState).then((result) => {
      setIsProcessing(false);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 800);
      } else {
        setError(result.error || 'Failed to exchange authorization token. Please try again.');
      }
    });
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center px-4 max-w-md mx-auto animate-in fade-in duration-300">
      <BrandMark className="w-16 h-16" />

      {isProcessing && (
        <div className="space-y-3">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Connecting Your Spotify Account...
          </h1>
          <p className="text-xs text-text-muted">
            Verifying PKCE security challenge and establishing your personal session.
          </p>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </div>
      )}

      {success && (
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Account Connected!
          </h1>
          <p className="text-xs text-text-muted">
            Welcome to WhenVanshListens. Loading your personalized listening space...
          </p>
        </div>
      )}

      {error && (
        <div className="space-y-4 w-full">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-left space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Connection Failed</span>
            </div>
            <p className="text-xs text-rose-300 font-mono break-words leading-relaxed">
              {error}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface-card border border-surface-border text-xs font-semibold text-white hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-xs font-semibold text-white hover:bg-primary-light transition-colors shadow-[0_0_15px_rgba(59,130,246,0.25)]"
            >
              Try Again
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-text-muted">
        <BrandMark className="w-12 h-12 animate-pulse" />
        <span className="text-xs font-mono">Loading authentication callback...</span>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
