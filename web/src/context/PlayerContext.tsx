'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track, PlaybackState, RepeatMode } from '@/types/music';
import { SpotifyUser, SpotifyDevice, SpotifyPlaybackState } from '@/types/auth';
import { 
  getStoredUser, 
  setStoredUser, 
  getValidAccessToken, 
  logoutSpotify, 
  initiateSpotifyLogin, 
  setCustomSpotifyClientId,
  getSpotifyClientId
} from '@/lib/spotifyAuth';
import { 
  getCurrentUserProfile, 
  getCurrentPlayback, 
  getAvailableDevices, 
  spotifyPlayTrack, 
  spotifyResumePlayback, 
  spotifyPausePlayback, 
  spotifyNextTrack, 
  spotifyPreviousTrack, 
  spotifySeekPosition, 
  spotifySetPlayerVolume,
  spotifyTransferPlayback
} from '@/lib/spotifyApi';
import { recordHistoryEntry } from '@/lib/storage';

interface PlayerContextType extends PlaybackState {
  // Auth State
  user: SpotifyUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  clientIdConfigured: boolean;
  login: (overrideClientId?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  configureClientId: (clientId: string) => void;

  // Device & Live Status
  activeDevice: SpotifyDevice | null;
  availableDevices: SpotifyDevice[];
  playbackError: string | null;
  clearPlaybackError: () => void;
  switchDevice: (deviceId: string) => Promise<boolean>;

  // Player UI & Controls
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  playTrack: (track: Track) => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  refreshPlayback: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [clientIdConfigured, setClientIdConfigured] = useState<boolean>(false);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionMs, setPositionMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Track[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Device state & diagnostics
  const [activeDevice, setActiveDevice] = useState<SpotifyDevice | null>(null);
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const localTickerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check Client ID configuration on mount
  useEffect(() => {
    const id = getSpotifyClientId();
    setClientIdConfigured(!!id);
  }, []);

  // Restore authenticated session on mount
  useEffect(() => {
    async function restoreSession() {
      setIsAuthLoading(true);
      const cached = getStoredUser();
      const token = await getValidAccessToken();

      if (token) {
        if (cached) {
          setUser(cached);
          setIsAuthenticated(true);
        }
        // Verify with fresh profile
        try {
          const fresh = await getCurrentUserProfile();
          if (fresh) {
            setUser(fresh);
            setStoredUser(fresh);
            setIsAuthenticated(true);
          } else if (!cached) {
            setIsAuthenticated(false);
          }
        } catch {
          if (!cached) setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsAuthLoading(false);
    }

    restoreSession();
  }, []);

  // Poll Spotify playback state when authenticated
  const refreshPlayback = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const [playback, devices] = await Promise.all([
        getCurrentPlayback(),
        getAvailableDevices(),
      ]);

      setAvailableDevices(devices);
      const active = devices.find((d) => d.is_active) || (devices.length > 0 ? devices[0] : null);
      setActiveDevice(active);

      if (playback && playback.item) {
        const item = playback.item;
        const track: Track = {
          id: item.id,
          uri: item.uri,
          title: item.name,
          artist: item.artists.map((a) => a.name).join(', '),
          album: item.album.name,
          artworkUrl: item.album.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
          durationMs: item.duration_ms,
        };

        setCurrentTrack(track);
        setIsPlaying(playback.is_playing);
        setPositionMs(playback.progress_ms || 0);
        setDurationMs(item.duration_ms);
        if (playback.device) {
          setVolumeState(playback.device.volume_percent / 100);
        }
        if (playback.shuffle_state !== undefined) {
          setShuffle(playback.shuffle_state);
        }
        if (playback.repeat_state) {
          setRepeat(playback.repeat_state);
        }
      }
    } catch (e) {
      console.warn('Playback refresh warning:', e);
    }
  }, [isAuthenticated]);

  // Periodic polling for real-time sync with user's Spotify app
  useEffect(() => {
    if (isAuthenticated) {
      refreshPlayback();
      pollIntervalRef.current = setInterval(refreshPlayback, 3000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isAuthenticated, refreshPlayback]);

  // Smooth local ticker when playing between poll ticks
  useEffect(() => {
    if (isPlaying) {
      localTickerRef.current = setInterval(() => {
        setPositionMs((prev) => {
          if (durationMs > 0 && prev >= durationMs) return durationMs;
          return prev + 1000;
        });
      }, 1000);
    } else {
      if (localTickerRef.current) clearInterval(localTickerRef.current);
    }

    return () => {
      if (localTickerRef.current) clearInterval(localTickerRef.current);
    };
  }, [isPlaying, durationMs]);

  const login = async (overrideClientId?: string) => {
    return await initiateSpotifyLogin(overrideClientId);
  };

  const logout = () => {
    logoutSpotify();
    setUser(null);
    setIsAuthenticated(false);
    setCurrentTrack(null);
    setIsPlaying(false);
    setActiveDevice(null);
    setAvailableDevices([]);
  };

  const configureClientId = (clientId: string) => {
    setCustomSpotifyClientId(clientId);
    setClientIdConfigured(!!clientId.trim());
  };

  const clearPlaybackError = () => {
    setPlaybackError(null);
  };

  const switchDevice = async (deviceId: string): Promise<boolean> => {
    const ok = await spotifyTransferPlayback(deviceId, true);
    if (ok) {
      await refreshPlayback();
    }
    return ok;
  };

  // Real Playback Controls
  const playTrack = async (track: Track) => {
    if (!isAuthenticated) {
      setPlaybackError('PLEASE_LOGIN');
      return;
    }

    setCurrentTrack(track);
    setDurationMs(track.durationMs);
    setPositionMs(0);
    setIsPlaying(true);
    setPlaybackError(null);

    // Record in user's isolated history
    recordHistoryEntry(track, user?.id);

    // Call Spotify Web API
    const res = await spotifyPlayTrack(track.uri, activeDevice?.id);
    if (!res.success) {
      if (res.error === 'NO_ACTIVE_DEVICE') {
        setPlaybackError('NO_ACTIVE_DEVICE');
        setIsPlaying(false);
      } else if (res.error === 'PREMIUM_REQUIRED') {
        setPlaybackError('PREMIUM_REQUIRED');
        setIsPlaying(false);
      } else {
        setPlaybackError(res.error || 'Playback could not be started');
      }
    } else {
      setTimeout(refreshPlayback, 500);
    }
  };

  const togglePlay = async () => {
    if (!isAuthenticated) {
      setPlaybackError('PLEASE_LOGIN');
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      await spotifyPausePlayback();
    } else {
      setIsPlaying(true);
      const res = await spotifyResumePlayback(activeDevice?.id);
      if (!res.success) {
        if (res.error === 'NO_ACTIVE_DEVICE') {
          setPlaybackError('NO_ACTIVE_DEVICE');
          setIsPlaying(false);
        } else if (res.error === 'PREMIUM_REQUIRED') {
          setPlaybackError('PREMIUM_REQUIRED');
          setIsPlaying(false);
        }
      }
    }
    setTimeout(refreshPlayback, 500);
  };

  const nextTrack = async () => {
    if (!isAuthenticated) return;
    await spotifyNextTrack();
    setTimeout(refreshPlayback, 500);
  };

  const previousTrack = async () => {
    if (!isAuthenticated) return;
    if (positionMs > 3000) {
      await seekTo(0);
      return;
    }
    await spotifyPreviousTrack();
    setTimeout(refreshPlayback, 500);
  };

  const seekTo = async (newPositionMs: number) => {
    const clamped = Math.max(0, Math.min(newPositionMs, durationMs));
    setPositionMs(clamped);
    if (isAuthenticated) {
      await spotifySeekPosition(clamped);
    }
  };

  const setVolume = async (val: number) => {
    setVolumeState(val);
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
    if (isAuthenticated) {
      await spotifySetPlayerVolume(val * 100);
    }
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
        // Auth State
        user,
        isAuthenticated,
        isAuthLoading,
        clientIdConfigured,
        login,
        logout,
        configureClientId,

        // Device Diagnostics
        activeDevice,
        availableDevices,
        playbackError,
        clearPlaybackError,
        switchDevice,

        // Playback State
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
        refreshPlayback,
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
