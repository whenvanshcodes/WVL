'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track, PlaybackState, RepeatMode } from '@/types/music';
import { SpotifyUser, SpotifyDevice } from '@/types/auth';
import { 
  getStoredUser, 
  setStoredUser, 
  getValidAccessToken, 
  logoutSpotify, 
  initiateSpotifyLogin
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
import { spotifyPlayerEngine } from '@/lib/spotifyPlayerEngine';

interface PlayerContextType extends PlaybackState {
  // Auth State
  user: SpotifyUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isLoginInProgress: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: () => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;

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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Initialize and subscribe to spotifyPlayerEngine (matching player-bridge lifecycle)
  useEffect(() => {
    if (isAuthenticated) {
      spotifyPlayerEngine.initWebSdk();
      const unsubscribe = spotifyPlayerEngine.subscribe((msg) => {
        if (msg.type === 'ready' && msg.deviceId) {
          const webDevice: SpotifyDevice = {
            id: msg.deviceId,
            name: 'WhenVanshListens Web Player',
            type: 'Computer',
            is_active: true,
            is_private_session: false,
            is_restricted: false,
            volume_percent: 80,
          };
          setActiveDevice((prev) => prev || webDevice);
          setAvailableDevices((prev) => {
            const exists = prev.some((d) => d.id === msg.deviceId);
            return exists ? prev : [webDevice, ...prev];
          });
        } else if (msg.type === 'state' && msg.state) {
          if (msg.state.track) setCurrentTrack(msg.state.track);
          setIsPlaying(!msg.state.isPaused);
          setPositionMs(msg.state.positionMs);
          setDurationMs(msg.state.durationMs);
          setVolumeState(msg.state.volume);
          setShuffle(msg.state.shuffle);
          setRepeat(msg.state.repeat);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isAuthenticated]);

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

  const login = async () => {
    if (isLoginInProgress) return { ok: false };
    setIsLoginInProgress(true);
    setAuthError(null);

    const res = await initiateSpotifyLogin();
    if (!res.ok) {
      setIsLoginInProgress(false);
      if (res.error === 'CONFIG_UNAVAILABLE') {
        setAuthError('Spotify integration requires NEXT_PUBLIC_SPOTIFY_CLIENT_ID configured in Vercel project environment variables. Add your Spotify Client ID in Vercel to activate login.');
      } else {
        setAuthError(res.error || 'Failed to start Spotify authorization.');
      }
      return res;
    }
    return res;
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

  const clearAuthError = () => {
    setAuthError(null);
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

  // Real Playback Controls routed through spotifyPlayerEngine
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

    // Dispatch play command through engine
    await spotifyPlayerEngine.call('player.play', {
      trackUri: track.uri,
      deviceId: activeDevice?.id,
    });
    setTimeout(refreshPlayback, 500);
  };

  const togglePlay = async () => {
    if (!isAuthenticated) {
      setPlaybackError('PLEASE_LOGIN');
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      await spotifyPlayerEngine.call('player.pause');
    } else {
      setIsPlaying(true);
      await spotifyPlayerEngine.call('player.resume');
    }
    setTimeout(refreshPlayback, 500);
  };

  const nextTrack = async () => {
    if (!isAuthenticated) return;
    await spotifyPlayerEngine.call('player.next');
    setTimeout(refreshPlayback, 500);
  };

  const previousTrack = async () => {
    if (!isAuthenticated) return;
    if (positionMs > 3000) {
      await seekTo(0);
      return;
    }
    await spotifyPlayerEngine.call('player.previous');
    setTimeout(refreshPlayback, 500);
  };

  const seekTo = async (newPositionMs: number) => {
    const clamped = Math.max(0, Math.min(newPositionMs, durationMs));
    setPositionMs(clamped);
    if (isAuthenticated) {
      await spotifyPlayerEngine.call('player.seek', { positionMs: clamped });
    }
  };

  const setVolume = async (val: number) => {
    setVolumeState(val);
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
    if (isAuthenticated) {
      await spotifyPlayerEngine.call('volume.set', { level: val });
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
        isLoginInProgress,
        authError,
        clearAuthError,
        login,
        logout,

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
