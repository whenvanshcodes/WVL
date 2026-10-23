import { 
  ListeningHistoryEntry, 
  HistoryAlbum, 
  HistoryArtist, 
  AtlasNode, 
  AtlasEdge,
  InboxItem,
  ListeningPlan,
  Track
} from '@/types/music';

const HISTORY_KEY = 'wvl_listening_history';
const INBOX_KEY = 'wvl_music_inbox';
const PLANS_KEY = 'wvl_listening_plans';

// Seed with authentic recent listening data observed on WhenVanshListens
const DEFAULT_HISTORY: ListeningHistoryEntry[] = [
  {
    id: 'hist-1',
    trackId: 'track_stk',
    trackUri: 'spotify:track:1234stk',
    title: 'Sanam Teri Kasam',
    artist: 'Himesh Reshammiya, Ankit Tiwari, Palak Muchhal',
    album: 'Sanam Teri Kasam (Original Motion Picture Soundtrack)',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    playedAt: Date.now() - 1000 * 60 * 5,
    source: 'OBSERVED',
  },
  {
    id: 'hist-2',
    trackId: 'track_heer',
    trackUri: 'spotify:track:5678heer',
    title: 'Heer',
    artist: 'Ali & Shjr, Haider Ali, Ali Raza',
    album: 'Heer',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    playedAt: Date.now() - 1000 * 60 * 35,
    source: 'OBSERVED',
  },
  {
    id: 'hist-3',
    trackId: 'track_trh',
    trackUri: 'spotify:track:9012trh',
    title: 'Tu Rehti Hai',
    artist: 'Aditya Rikhari',
    album: 'Tu Rehti Hai',
    artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    playedAt: Date.now() - 1000 * 60 * 90,
    source: 'OBSERVED',
  },
  {
    id: 'hist-4',
    trackId: 'track_fh',
    trackUri: 'spotify:track:3456fh',
    title: 'Finding Her',
    artist: 'Kushagra, Bharath',
    album: 'Finding Her',
    artworkUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=600&auto=format&fit=crop&q=80',
    playedAt: Date.now() - 1000 * 60 * 180,
    source: 'IMPORTED',
  },
];

const DEFAULT_INBOX: InboxItem[] = [
  {
    id: 'inbox-1',
    originalUrl: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    title: 'Wish You Were Here',
    subtitle: 'Frappe Ash, Rae, Encore ABJ',
    artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    note: 'Recommended from midnight session. Listen for the acoustic guitar intro.',
    status: 'TO_LISTEN',
    addedAt: Date.now() - 1000 * 60 * 60 * 12,
  },
  {
    id: 'inbox-2',
    originalUrl: 'https://open.spotify.com/track/6UelLqGlWMcVH1E5c4H7lY',
    title: 'Stargazing',
    subtitle: 'Myles Smith',
    artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    note: 'Incredible vocal dynamics and chorus melody.',
    status: 'LISTENING',
    addedAt: Date.now() - 1000 * 60 * 60 * 36,
  },
];

const DEFAULT_PLANS: ListeningPlan[] = [
  {
    id: 'plan-1',
    title: '2 AM Playlist',
    description: 'Deep late-night introspective melodies and acoustic soundscapes.',
    status: 'ACTIVE',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    items: [
      {
        id: 'pi-1',
        uri: 'spotify:track:1234stk',
        title: 'Sanam Teri Kasam',
        subtitle: 'Himesh Reshammiya, Ankit Tiwari',
        artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
        type: 'TRACK',
        completed: true,
      },
      {
        id: 'pi-2',
        uri: 'spotify:track:5678heer',
        title: 'Heer',
        subtitle: 'Ali & Shjr, Haider Ali',
        artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        type: 'TRACK',
        completed: false,
      },
      {
        id: 'pi-3',
        uri: 'spotify:track:9012trh',
        title: 'Tu Rehti Hai',
        subtitle: 'Aditya Rikhari',
        artworkUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
        type: 'TRACK',
        completed: false,
      },
    ],
  },
];

// ----------------- HISTORY STORAGE -----------------

export function getStoredHistory(): ListeningHistoryEntry[] {
  if (typeof window === 'undefined') return DEFAULT_HISTORY;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(DEFAULT_HISTORY));
      return DEFAULT_HISTORY;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_HISTORY;
  }
}

export function recordHistoryEntry(track: Track): ListeningHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const history = getStoredHistory();

  // Deduplicate rapid updates if same track was played within 60s
  const now = Date.now();
  if (history.length > 0 && history[0].trackUri === track.uri && now - history[0].playedAt < 60000) {
    return history;
  }

  const newEntry: ListeningHistoryEntry = {
    id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    trackId: track.id,
    trackUri: track.uri,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artworkUrl: track.artworkUrl,
    playedAt: now,
    source: 'OBSERVED',
  };

  const updated = [newEntry, ...history.filter(h => h.id !== newEntry.id)].slice(0, 50);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save listening history', e);
  }
  return updated;
}

export function getExploredAlbums(entries: ListeningHistoryEntry[]): HistoryAlbum[] {
  const map = new Map<string, ListeningHistoryEntry[]>();
  for (const entry of entries) {
    if (!entry.album) continue;
    const list = map.get(entry.album) || [];
    list.push(entry);
    map.set(entry.album, list);
  }

  return Array.from(map.entries()).map(([name, list]) => {
    const sample = list[0];
    const uniqueTracks = new Set(list.map(e => e.trackId)).size;
    const maxPlayed = Math.max(...list.map(e => e.playedAt));
    return {
      id: 'album-' + name.toLowerCase().replace(/\s+/g, '-'),
      name,
      artistName: sample.artist,
      artworkUrl: sample.artworkUrl,
      trackCount: uniqueTracks,
      lastPlayedAt: maxPlayed,
    };
  }).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

export function getExploredArtists(entries: ListeningHistoryEntry[]): HistoryArtist[] {
  const map = new Map<string, ListeningHistoryEntry[]>();
  for (const entry of entries) {
    if (!entry.artist) continue;
    const list = map.get(entry.artist) || [];
    list.push(entry);
    map.set(entry.artist, list);
  }

  return Array.from(map.entries()).map(([name, list]) => {
    const sample = list[0];
    const uniqueTracks = new Set(list.map(e => e.trackId)).size;
    const maxPlayed = Math.max(...list.map(e => e.playedAt));
    return {
      id: 'artist-' + name.toLowerCase().replace(/\s+/g, '-'),
      name,
      artworkUrl: sample.artworkUrl,
      trackCount: uniqueTracks,
      lastPlayedAt: maxPlayed,
    };
  }).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

export function buildAtlasGraphData(entries: ListeningHistoryEntry[]): { nodes: AtlasNode[]; edges: AtlasEdge[] } {
  if (entries.length === 0) return { nodes: [], edges: [] };

  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const artists = getExploredArtists(entries).slice(0, 6);
  const albums = getExploredAlbums(entries).slice(0, 8);
  const recentTracks = entries.slice(0, 14);

  // 1. Center / Artists ring (Radius 220)
  const artistAngleStep = (2 * Math.PI) / Math.max(artists.length, 1);
  const artistMap = new Map<string, AtlasNode>();

  artists.forEach((artist, i) => {
    const angle = i * artistAngleStep;
    const node: AtlasNode = {
      id: `artist:${artist.name}`,
      uri: `spotify:artist:${artist.id}`,
      title: artist.name,
      subtitle: `${artist.trackCount} tracks played`,
      type: 'ARTIST',
      artworkUrl: artist.artworkUrl,
      x: 350 + Math.cos(angle) * 190,
      y: 350 + Math.sin(angle) * 190,
    };
    nodes.push(node);
    artistMap.set(artist.name, node);
  });

  // 2. Albums ring (Radius 300)
  const albumAngleStep = (2 * Math.PI) / Math.max(albums.length, 1);
  const albumMap = new Map<string, AtlasNode>();

  albums.forEach((album, i) => {
    const angle = i * albumAngleStep + 0.35;
    const node: AtlasNode = {
      id: `album:${album.name}`,
      uri: `spotify:album:${album.id}`,
      title: album.name,
      subtitle: album.artistName,
      type: 'ALBUM',
      artworkUrl: album.artworkUrl,
      x: 350 + Math.cos(angle) * 290,
      y: 350 + Math.sin(angle) * 290,
    };
    nodes.push(node);
    albumMap.set(album.name, node);

    // Connect to Artist if matching
    const matchedArtist = artistMap.get(album.artistName);
    if (matchedArtist) {
      edges.push({
        sourceId: matchedArtist.id,
        targetId: node.id,
        relationship: 'released',
      });
    }
  });

  // 3. Tracks inner orbit (Radius 100)
  const trackAngleStep = (2 * Math.PI) / Math.max(recentTracks.length, 1);
  recentTracks.forEach((track, i) => {
    const angle = i * trackAngleStep;
    const node: AtlasNode = {
      id: `track:${track.trackId}`,
      uri: track.trackUri,
      title: track.title,
      subtitle: track.artist,
      type: 'TRACK',
      artworkUrl: track.artworkUrl,
      x: 350 + Math.cos(angle) * 100,
      y: 350 + Math.sin(angle) * 100,
    };
    nodes.push(node);

    // Connect Track to Album
    const matchedAlbum = albumMap.get(track.album);
    if (matchedAlbum) {
      edges.push({
        sourceId: matchedAlbum.id,
        targetId: node.id,
        relationship: 'contains',
      });
    }

    // Connect Track to Artist
    const matchedArtist = artistMap.get(track.artist);
    if (matchedArtist) {
      edges.push({
        sourceId: matchedArtist.id,
        targetId: node.id,
        relationship: 'performed',
      });
    }
  });

  return { nodes, edges };
}

// ----------------- MUSIC INBOX STORAGE -----------------

export function getStoredInbox(): InboxItem[] {
  if (typeof window === 'undefined') return DEFAULT_INBOX;
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw) {
      localStorage.setItem(INBOX_KEY, JSON.stringify(DEFAULT_INBOX));
      return DEFAULT_INBOX;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_INBOX;
  }
}

export function saveInboxItem(item: Omit<InboxItem, 'id' | 'addedAt'>): InboxItem[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredInbox();
  const newItem: InboxItem = {
    ...item,
    id: 'inbox-' + Date.now(),
    addedAt: Date.now(),
  };

  const updated = [newItem, ...current.filter(i => i.originalUrl !== item.originalUrl)];
  localStorage.setItem(INBOX_KEY, JSON.stringify(updated));
  return updated;
}

export function updateInboxStatus(id: string, status: InboxItem['status']): InboxItem[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredInbox();
  const updated = current.map(item => item.id === id ? { ...item, status } : item);
  localStorage.setItem(INBOX_KEY, JSON.stringify(updated));
  return updated;
}

export function removeInboxItem(id: string): InboxItem[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredInbox();
  const updated = current.filter(item => item.id !== id);
  localStorage.setItem(INBOX_KEY, JSON.stringify(updated));
  return updated;
}

// ----------------- LISTENING PLANS STORAGE -----------------

export function getStoredPlans(): ListeningPlan[] {
  if (typeof window === 'undefined') return DEFAULT_PLANS;
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) {
      localStorage.setItem(PLANS_KEY, JSON.stringify(DEFAULT_PLANS));
      return DEFAULT_PLANS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PLANS;
  }
}

export function saveListeningPlan(plan: Omit<ListeningPlan, 'id' | 'createdAt'>): ListeningPlan[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredPlans();
  const newPlan: ListeningPlan = {
    ...plan,
    id: 'plan-' + Date.now(),
    createdAt: Date.now(),
  };
  const updated = [newPlan, ...current];
  localStorage.setItem(PLANS_KEY, JSON.stringify(updated));
  return updated;
}

export function togglePlanItemCompletion(planId: string, itemId: string): ListeningPlan[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredPlans();
  const updated = current.map(plan => {
    if (plan.id !== planId) return plan;
    const items = plan.items.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i);
    const allCompleted = items.length > 0 && items.every(i => i.completed);
    return {
      ...plan,
      items,
      status: (allCompleted ? 'COMPLETED' : 'ACTIVE') as 'COMPLETED' | 'ACTIVE',
    };
  });
  localStorage.setItem(PLANS_KEY, JSON.stringify(updated));
  return updated;
}

export function addTrackToPlan(planId: string, track: Track): ListeningPlan[] {
  if (typeof window === 'undefined') return [];
  const current = getStoredPlans();
  const updated = current.map(plan => {
    if (plan.id !== planId) return plan;
    const exists = plan.items.some(i => i.uri === track.uri);
    if (exists) return plan;
    const newItem = {
      id: 'pi-' + Date.now(),
      uri: track.uri,
      title: track.title,
      subtitle: track.artist,
      artworkUrl: track.artworkUrl,
      type: 'TRACK' as const,
      completed: false,
    };
    return {
      ...plan,
      items: [...plan.items, newItem],
      status: 'ACTIVE' as const,
    };
  });
  localStorage.setItem(PLANS_KEY, JSON.stringify(updated));
  return updated;
}
