'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleSpotifyCallback } from '@/lib/spotifyAuth';
import { BrandMark } from '@/components/BrandMark';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const err = searchParams.get('error');

    if (err) {
      setError(`Spotify authorization failed: ${err}`);
      return;
    }

    if (code) {
      handleSpotifyCallback(code).then((success) => {
        if (success) {
          router.push('/');
        } else {
          setError('Failed to exchange authorization token. Please try again.');
        }
      });
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
      <BrandMark className="w-14 h-14 animate-pulse" />
      <h1 className="text-xl font-bold text-white tracking-tight">
        Connecting to Spotify...
      </h1>
      <p className="text-sm text-text-muted max-w-sm">
        Establishing secure PKCE session with your Spotify account.
      </p>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-text-muted">Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
