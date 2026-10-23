/**
 * WhenVanshListens Web - Spotify Player Engine
 *
 * Implements the player-bridge architecture from the original Myspoti Android app
 * (base/api-spotify/src/main/resources/bridge/player-bridge.js & base/api/Api.kt).
 *
 * Exposes the same bridge contract:
 * - Messages: { type: 'ready' } | { type: 'state', state } | { type: 'queue', queue }
 * - Commands: call(method, args) for player.play, player.pause, player.seek, etc.
 *
 * Platform Architecture:
 * - Desktop Browsers: Integrates official in-browser Spotify Web Playback SDK (Widevine EME)
 * - Mobile / iOS Safari: Connects via Spotify Web API device relay (Spotify Connect protocol)
 */

import { Track, PlaybackState, RepeatMode } from '@/types/music';
import { getValidAccessToken } from './spotifyAuth';
import { 
  spotifyPlayTrack, 
  spotifyPausePlayback, 
  spotifyResumePlayback, 
  spotifyNextTrack, 
  spotifyPreviousTrack, 
  spotifySeekPosition, 
  spotifySetPlayerVolume,
  spotifyTransferPlayback
} from './spotifyApi';

export interface BridgePlayerState {
  track: Track | null;
  isPaused: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackId?: string;
}

export type BridgeMessage = 
  | { type: 'ready'; version: number; deviceId?: string }
  | { type: 'state'; state: BridgePlayerState | null }
  | { type: 'queue'; queue: Track[] }
  | { type: 'error'; error: string };

type MessageCallback = (msg: BridgeMessage) => void;

class SpotifyPlayerEngine {
  private listeners: Set<MessageCallback> = new Set();
  private webPlayer: any = null;
  private webDeviceId: string | null = null;
  private isSdkInitialized = false;
  private currentState: BridgePlayerState | null = null;

  constructor() {
    // Engine initializes in browser context
  }

  public subscribe(callback: MessageCallback): () => void {
    this.listeners.add(callback);
    if (this.currentState) {
      callback({ type: 'state', state: this.currentState });
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  private post(msg: BridgeMessage) {
    if (msg.type === 'state') {
      this.currentState = msg.state;
    }
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (e) {
        console.warn('Engine listener error:', e);
      }
    });
  }

  /**
   * Initializes the in-browser Web Playback SDK when running on supported desktop browsers.
   */
  public async initWebSdk(): Promise<void> {
    if (typeof window === 'undefined' || this.isSdkInitialized) return;
    
    const token = await getValidAccessToken();
    if (!token) return;

    // Check if browser is desktop Chrome, Edge, Firefox, or Safari Desktop
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

    if (isMobile) {
      // Mobile Safari / Android Chrome: Web Playback SDK is not supported by Spotify DRM.
      // Use Spotify Connect device relay.
      this.post({ type: 'ready', version: 1 });
      return;
    }

    this.isSdkInitialized = true;

    // Load Spotify Web Playback SDK script dynamically if not present
    if (!document.getElementById('spotify-player-sdk')) {
      const script = document.createElement('script');
      script.id = 'spotify-player-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const setupPlayer = () => {
      if (!window.Spotify || !window.Spotify.Player) return;

      try {
        const player = new window.Spotify.Player({
          name: 'WhenVanshListens Web Player',
          getOAuthToken: async (cb: (token: string) => void) => {
            const currentToken = await getValidAccessToken();
            if (currentToken) cb(currentToken);
          },
          volume: 0.8,
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          this.webDeviceId = device_id;
          this.post({ type: 'ready', version: 1, deviceId: device_id });
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.warn('WVL Web Player device gone:', device_id);
        });

        player.addListener('player_state_changed', (state: any) => {
          if (!state) {
            this.post({ type: 'state', state: null });
            return;
          }

          const current = state.track_window?.current_track;
          const mappedTrack: Track | null = current ? {
            id: current.id,
            uri: current.uri,
            title: current.name,
            artist: current.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
            album: current.album?.name || 'Unknown Album',
            artworkUrl: current.album?.images?.[0]?.url || '',
            durationMs: state.duration || current.duration_ms || 0,
          } : null;

          const bridgeState: BridgePlayerState = {
            track: mappedTrack,
            isPaused: state.paused,
            positionMs: state.position || 0,
            durationMs: state.duration || 0,
            volume: 0.8,
            shuffle: state.shuffle || false,
            repeat: state.repeat_mode === 2 ? 'track' : state.repeat_mode === 1 ? 'context' : 'off',
            playbackId: state.playback_id,
          };

          this.post({ type: 'state', state: bridgeState });
        });

        player.connect();
        this.webPlayer = player;
      } catch (err) {
        console.warn('Failed to initialize Spotify Web Player SDK:', err);
      }
    };

    if (window.Spotify && window.Spotify.Player) {
      setupPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        setupPlayer();
      };
    }
  }

  /**
   * Dispatches commands matching the original player-bridge.js contract:
   * 'player.play', 'player.pause', 'player.resume', 'player.seek', 'player.next', 'player.previous'
   */
  public async call(method: string, args: any = {}): Promise<any> {
    switch (method) {
      case 'player.play': {
        const { trackUri, deviceId } = args;
        const targetDevice = deviceId || this.webDeviceId;
        if (targetDevice && this.webPlayer && targetDevice === this.webDeviceId) {
          // Play directly on local Web Player instance
          await spotifyPlayTrack(trackUri, targetDevice);
        } else {
          // Play via active Spotify Connect device
          await spotifyPlayTrack(trackUri, targetDevice);
        }
        return true;
      }

      case 'player.pause': {
        if (this.webPlayer && this.webDeviceId) {
          try { await this.webPlayer.pause(); } catch {}
        }
        return await spotifyPausePlayback();
      }

      case 'player.resume': {
        if (this.webPlayer && this.webDeviceId) {
          try { await this.webPlayer.resume(); } catch {}
        }
        return await spotifyResumePlayback();
      }

      case 'player.seek': {
        const { positionMs } = args;
        if (this.webPlayer && this.webDeviceId) {
          try { await this.webPlayer.seek(positionMs); } catch {}
        }
        return await spotifySeekPosition(positionMs);
      }

      case 'player.next': {
        if (this.webPlayer && this.webDeviceId) {
          try { await this.webPlayer.nextTrack(); } catch {}
        }
        return await spotifyNextTrack();
      }

      case 'player.previous': {
        if (this.webPlayer && this.webDeviceId) {
          try { await this.webPlayer.previousTrack(); } catch {}
        }
        return await spotifyPreviousTrack();
      }

      case 'volume.set': {
        const { level } = args;
        if (this.webPlayer) {
          try { await this.webPlayer.setVolume(level); } catch {}
        }
        return await spotifySetPlayerVolume(Math.round(level * 100));
      }

      default:
        console.warn(`Unrecognized bridge command: ${method}`);
        return null;
    }
  }

  public getWebDeviceId(): string | null {
    return this.webDeviceId;
  }

  public destroy() {
    if (this.webPlayer) {
      try {
        this.webPlayer.disconnect();
      } catch {}
      this.webPlayer = null;
    }
    this.listeners.clear();
    this.isSdkInitialized = false;
  }
}

// Global singleton instance matching MyspotiRuntime
export const spotifyPlayerEngine = new SpotifyPlayerEngine();
