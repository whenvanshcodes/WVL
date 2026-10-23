'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Track, PlaybackState, RepeatMode } from '@/types/music';
import { recordHistoryEntry } from '@/lib/storage';
import { getStoredAccessToken } from '@/lib/spotifyAuth';

const INITIAL_TRACK: Track = {
  id: 'track_stk',
  uri: 'spotify:track:1234stk',
  title: 'Sanam Teri Kasam',
  artist: 'Himesh Reshammiya, Ankit Tiwari, Palak Muchhal',
  album: 'Sanam Teri Kasam (Original Soundtrack)',
  artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  durationMs: 314000, // 5:14
};

const DEFAULT_QUEUE: Track[] = [
  INITIAL_TRACK,
  {
    id: 'track_heer',
    uri: 'spotify:track:5678heer',
    title: 'Heer',
    artist: 'Ali & Shjr, Haider Ali, Ali Raza',
    album: 'Heer',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    durationMs: 226000, // 3:46
  },
  {
    id: 'track_trh',
    uri: 'spotify:track:9012trh',
    title: 'Tu Rehti Hai',
    artist: 'Aditya Rikhari',
    album: 'Tu Rehti Hai',
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    durationMs: 166000, // 2:46
  },
  {
    id: 'track_fh',
    uri: 'spotify:track:3456fh',
    title: 'Finding Her',
    artist: 'Kushagra, Bharath',
    album: 'Finding Her',
    artworkUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=600&auto=format&fit=crop&q=80',
    durationMs: 182000, // 3:02
  },
];

interface PlayerContextType extends PlaybackState {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (positionMs: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(INITIAL_TRACK);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionMs, setPositionMs] = useState<number>(15000);
  const [durationMs, setDurationMs] = useState<number>(314000);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Track[]>(DEFAULT_QUEUE);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback timer ticker for seamless position progression
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setPositionMs((prev) => {
          if (prev >= durationMs) {
            // Track finished, advance
            handleAutoAdvance();
            return 0;
          }
          return prev + 1000;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, durationMs, currentTrack]);

  const handleAutoAdvance = () => {
    if (repeat === 'track' && currentTrack) {
      setPositionMs(0);
      setIsPlaying(true);
      return;
    }
    nextTrack();
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setDurationMs(track.durationMs || 240000);
    setPositionMs(0);
    setIsPlaying(true);

    // Record observed listening history in local storage
    recordHistoryEntry(track);

    // If Spotify access token exists, trigger Spotify Connect playback via Web API
    const token = getStoredAccessToken();
    if (token) {
      fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [track.uri],
        }),
      }).catch((e) => console.warn('Spotify Connect play skipped:', e));
    }
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);

    const token = getStoredAccessToken();
    if (token) {
      const endpoint = isPlaying ? 'pause' : 'play';
      fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch((e) => console.warn('Spotify Connect toggle skipped:', e));
    }
  };

  const nextTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeat === 'context') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        setPositionMs(0);
        return;
      }
    }
    playTrack(queue[nextIndex]);
  };

  const previousTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    if (positionMs > 3000) {
      // If played more than 3s, restart current song
      setPositionMs(0);
      return;
    }
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    playTrack(queue[prevIndex]);
  };

  const seekTo = (newPositionMs: number) => {
    const clamped = Math.max(0, Math.min(newPositionMs, durationMs));
    setPositionMs(clamped);

    const token = getStoredAccessToken();
    if (token) {
      fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(clamped)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch((e) => console.warn('Spotify Connect seek skipped:', e));
    }
  };

  const setVolume = (val: number) => {
    setVolumeState(val);
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const toggleShuffle = () => {
    setShuffle((prev) => !prev);
  };

  const cycleRepeat = () => {
    setRepeat((prev) => {
      if (prev === 'off') return 'context';
      if (prev === 'context') return 'track';
      return 'off';
    });
  };

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        positionMs,
        durationMs,
        volume: isMuted ? 0 : volume,
        isMuted,
        shuffle,
        repeat,
        queue,
        isExpanded,
        setIsExpanded,
        playTrack,
        togglePlay,
        nextTrack,
        previousTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
