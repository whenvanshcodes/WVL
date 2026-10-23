export interface SpotifyUser {
  id: string;
  displayName: string;
  email?: string;
  images?: { url: string; height?: number; width?: number }[];
  product?: string; // 'premium' | 'free' | 'open'
  country?: string;
  followers?: { total: number };
  uri?: string;
  externalUrls?: { spotify: string };
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string; // 'Computer', 'Smartphone', 'Speaker', etc.
  volume_percent: number;
}

export interface SpotifyPlaybackState {
  device?: SpotifyDevice;
  repeat_state?: 'off' | 'track' | 'context';
  shuffle_state?: boolean;
  is_playing: boolean;
  progress_ms: number;
  item?: {
    id: string;
    name: string;
    duration_ms: number;
    uri: string;
    artists: { id: string; name: string; uri: string }[];
    album: {
      id: string;
      name: string;
      uri: string;
      images: { url: string; height?: number; width?: number }[];
    };
  };
}
