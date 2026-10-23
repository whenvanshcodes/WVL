export type HistorySource = 'OBSERVED' | 'IMPORTED';

export interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  durationMs: number;
  previewUrl?: string | null;
}

export interface ListeningHistoryEntry {
  id: string;
  trackId: string;
  trackUri: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  playedAt: number;
  source: HistorySource;
}

export interface HistoryAlbum {
  id: string;
  name: string;
  artistName: string;
  artworkUrl: string;
  trackCount: number;
  lastPlayedAt: number;
}

export interface HistoryArtist {
  id: string;
  name: string;
  artworkUrl: string;
  trackCount: number;
  lastPlayedAt: number;
}

export type AtlasNodeType = 'TRACK' | 'ALBUM' | 'ARTIST';

export interface AtlasNode {
  id: string;
  uri: string;
  title: string;
  subtitle: string;
  type: AtlasNodeType;
  artworkUrl: string;
  x: number;
  y: number;
}

export interface AtlasEdge {
  sourceId: string;
  targetId: string;
  relationship: string;
}

export type InboxStatus = 'TO_LISTEN' | 'LISTENING' | 'COMPLETED' | 'ARCHIVED';

export interface InboxItem {
  id: string;
  originalUrl: string;
  title: string;
  subtitle: string;
  artworkUrl: string;
  note: string;
  status: InboxStatus;
  addedAt: number;
  resolvedTrack?: Track | null;
}

export type PlanItemType = 'TRACK' | 'ALBUM' | 'PLAYLIST';

export interface PlanItem {
  id: string;
  uri: string;
  title: string;
  subtitle: string;
  artworkUrl: string;
  type: PlanItemType;
  completed: boolean;
}

export interface ListeningPlan {
  id: string;
  title: string;
  description: string;
  items: PlanItem[];
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: number;
}

export type RepeatMode = 'off' | 'context' | 'track';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Track[];
}
