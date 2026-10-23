import { getValidAccessToken } from './spotifyAuth';
import { SpotifyPlaybackState, SpotifyDevice, SpotifyUser } from '@/types/auth';
import { Track } from '@/types/music';

const BASE_URL = 'https://api.spotify.com/v1';

async function spotifyFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  const token = await getValidAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (res.status === 204) {
      return null;
    }

    if (!res.ok) {
      if (res.status === 401) {
        console.warn('Spotify API returned 401 Unauthorized for endpoint:', endpoint);
      }
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Spotify API fetch error:', endpoint, err);
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<SpotifyUser | null> {
  const profile: any = await spotifyFetch('/me');
  if (!profile) return null;

  return {
    id: profile.id,
    displayName: profile.display_name || profile.id,
    email: profile.email,
    images: profile.images || [],
    product: profile.product,
    country: profile.country,
    followers: profile.followers,
    uri: profile.uri,
    externalUrls: profile.external_urls,
  };
}

export async function getCurrentPlayback(): Promise<SpotifyPlaybackState | null> {
  return await spotifyFetch<SpotifyPlaybackState>('/me/player');
}

export async function getAvailableDevices(): Promise<SpotifyDevice[]> {
  const res: any = await spotifyFetch('/me/player/devices');
  return res?.devices || [];
}

export async function getRecentlyPlayedTracks(limit = 20): Promise<Track[]> {
  const res: any = await spotifyFetch(`/me/player/recently-played?limit=${limit}`);
  if (!res?.items) return [];

  return res.items.map((item: any) => {
    const track = item.track;
    const albumArt = track.album?.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
    return {
      id: track.id,
      uri: track.uri,
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      artworkUrl: albumArt,
      durationMs: track.duration_ms,
      playedAt: item.played_at,
    };
  });
}

export async function getUserTopArtists(limit = 15): Promise<any[]> {
  const res: any = await spotifyFetch(`/me/top/artists?limit=${limit}&time_range=medium_term`);
  return res?.items || [];
}

export async function getUserTopTracks(limit = 25): Promise<Track[]> {
  const res: any = await spotifyFetch(`/me/top/tracks?limit=${limit}&time_range=medium_term`);
  if (!res?.items) return [];

  return res.items.map((track: any) => ({
    id: track.id,
    uri: track.uri,
    title: track.name,
    artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
    album: track.album?.name || 'Unknown Album',
    artworkUrl: track.album?.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    durationMs: track.duration_ms,
  }));
}

export async function getUserPlaylists(limit = 20): Promise<any[]> {
  const res: any = await spotifyFetch(`/me/playlists?limit=${limit}`);
  return res?.items || [];
}

export async function getUserSavedTracks(limit = 25): Promise<Track[]> {
  const res: any = await spotifyFetch(`/me/tracks?limit=${limit}`);
  if (!res?.items) return [];

  return res.items
    .filter((item: any) => item?.track && item?.track?.id)
    .map((item: any) => {
      const track = item.track;
      return {
        id: track.id,
        uri: track.uri,
        title: track.name,
        artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        artworkUrl: track.album?.images?.[0]?.url ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        durationMs: track.duration_ms,
        playedAt: item.added_at,
      };
    });
}

export async function getPlaylistTracks(playlistId: string, limit = 25): Promise<Track[]> {
  const res: any = await spotifyFetch(`/playlists/${playlistId}/tracks?limit=${limit}`);
  if (!res?.items) return [];

  return res.items
    .filter((item: any) => item?.track && item?.track?.id)
    .map((item: any) => {
      const track = item.track;
      return {
        id: track.id,
        uri: track.uri,
        title: track.name,
        artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
        album: track.album?.name || 'Unknown Album',
        artworkUrl: track.album?.images?.[0]?.url ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        durationMs: track.duration_ms,
        playedAt: item.added_at,
      };
    });
}

export async function searchSpotifyCatalog(query: string, types = 'track,artist,album', limit = 15): Promise<{
  tracks: Track[];
  artists: any[];
  albums: any[];
}> {
  if (!query.trim()) {
    return { tracks: [], artists: [], albums: [] };
  }

  const encoded = encodeURIComponent(query);
  const res: any = await spotifyFetch(`/search?q=${encoded}&type=${types}&limit=${limit}`);

  const tracks: Track[] = (res?.tracks?.items || []).map((t: any) => ({
    id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
    album: t.album?.name || 'Unknown Album',
    artworkUrl: t.album?.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    durationMs: t.duration_ms,
  }));

  const artists = (res?.artists?.items || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    uri: a.uri,
    imageUrl: a.images?.[0]?.url || '',
    genres: a.genres || [],
    followers: a.followers?.total || 0,
  }));

  const albums = (res?.albums?.items || []).map((al: any) => ({
    id: al.id,
    name: al.name,
    uri: al.uri,
    artist: al.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
    imageUrl: al.images?.[0]?.url || '',
    releaseDate: al.release_date,
    totalTracks: al.total_tracks,
  }));

  return { tracks, artists, albums };
}

// Real Spotify Playback Commands
export async function spotifyPlayTrack(uri: string, deviceId?: string): Promise<{ success: boolean; error?: string }> {
  const token = await getValidAccessToken();
  if (!token) return { success: false, error: 'NOT_AUTHENTICATED' };

  try {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    const res = await fetch(`${BASE_URL}/me/player/play${query}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    });

    if (res.status === 204 || res.status === 200) {
      return { success: true };
    }

    if (res.status === 404) {
      return { success: false, error: 'NO_ACTIVE_DEVICE' };
    }

    if (res.status === 403) {
      return { success: false, error: 'PREMIUM_REQUIRED' };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: err?.error?.message || 'Playback failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function spotifyResumePlayback(deviceId?: string): Promise<{ success: boolean; error?: string }> {
  const token = await getValidAccessToken();
  if (!token) return { success: false, error: 'NOT_AUTHENTICATED' };

  try {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    const res = await fetch(`${BASE_URL}/me/player/play${query}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 204 || res.status === 200) return { success: true };
    if (res.status === 404) return { success: false, error: 'NO_ACTIVE_DEVICE' };
    if (res.status === 403) return { success: false, error: 'PREMIUM_REQUIRED' };

    return { success: false, error: 'Could not resume playback' };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function spotifyPausePlayback(): Promise<boolean> {
  const token = await getValidAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/me/player/pause`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}

export async function spotifyNextTrack(): Promise<boolean> {
  const token = await getValidAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/me/player/next`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}

export async function spotifyPreviousTrack(): Promise<boolean> {
  const token = await getValidAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/me/player/previous`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}

export async function spotifySeekPosition(positionMs: number): Promise<boolean> {
  const token = await getValidAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/me/player/seek?position_ms=${Math.round(positionMs)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}

export async function spotifySetPlayerVolume(volumePercent: number): Promise<boolean> {
  const token = await getValidAccessToken();
  if (!token) return false;

  try {
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
    const res = await fetch(`${BASE_URL}/me/player/volume?volume_percent=${clamped}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}

export async function spotifyTransferPlayback(deviceId: string, play = true): Promise<boolean> {
  const token = await getValidAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}/me/player`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play,
      }),
    });
    return res.status === 204 || res.status === 200;
  } catch {
    return false;
  }
}
