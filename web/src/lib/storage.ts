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

const BASE_HISTORY_KEY = 'wvl_listening_history';
const BASE_INBOX_KEY = 'wvl_music_inbox';
const BASE_PLANS_KEY = 'wvl_listening_plans';

function getScopedKey(baseKey: string, userId?: string | null): string {
  if (userId && userId.trim()) {
    return `${baseKey}_${userId.trim()}`;
  }
  return `${baseKey}_guest`;
}

// ----------------- HISTORY STORAGE -----------------

export function getStoredHistory(userId?: string | null): ListeningHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_HISTORY_KEY, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordHistoryEntry(track: Track, userId?: string | null): ListeningHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_HISTORY_KEY, userId);
  const history = getStoredHistory(userId);

  const now = Date.now();
  if (history.length > 0 && history[0].trackUri === track.uri && now - history[0].playedAt < 45000) {
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
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save listening history', e);
  }
  return updated;
}

export function syncSpotifyRecentHistory(tracks: Track[], userId?: string | null): ListeningHistoryEntry[] {
  if (typeof window === 'undefined' || !tracks.length) return getStoredHistory(userId);
  const key = getScopedKey(BASE_HISTORY_KEY, userId);
  const existing = getStoredHistory(userId);

  const newEntries: ListeningHistoryEntry[] = tracks.map((t, idx) => ({
    id: `spotify-recent-${t.id}-${idx}`,
    trackId: t.id,
    trackUri: t.uri,
    title: t.title,
    artist: t.artist,
    album: t.album,
    artworkUrl: t.artworkUrl,
    playedAt: (t as any).playedAt ? new Date((t as any).playedAt).getTime() : (Date.now() - idx * 180000),
    source: 'IMPORTED',
  }));

  // Merge and deduplicate by trackUri
  const mergedMap = new Map<string, ListeningHistoryEntry>();
  for (const item of [...existing, ...newEntries]) {
    if (!mergedMap.has(item.trackUri) || (item.playedAt > (mergedMap.get(item.trackUri)?.playedAt || 0))) {
      mergedMap.set(item.trackUri, item);
    }
  }

  const sorted = Array.from(mergedMap.values()).sort((a, b) => b.playedAt - a.playedAt).slice(0, 50);
  try {
    localStorage.setItem(key, JSON.stringify(sorted));
  } catch {}
  return sorted;
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

  // 1. Center / Artists ring (Radius 190)
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

  // 2. Albums ring (Radius 290)
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

    const matchedAlbum = albumMap.get(track.album);
    if (matchedAlbum) {
      edges.push({
        sourceId: matchedAlbum.id,
        targetId: node.id,
        relationship: 'contains',
      });
    }

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

export function buildAtlasGraphFromSpotifyData(
  topArtists: any[],
  topTracks: Track[],
  recentTracks: Track[]
): { nodes: AtlasNode[]; edges: AtlasEdge[] } {
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const artistMap = new Map<string, AtlasNode>();

  // Center / Artists ring (Radius 190)
  const artistsSlice = topArtists.slice(0, 6);
  const artistAngleStep = (2 * Math.PI) / Math.max(artistsSlice.length, 1);

  artistsSlice.forEach((artist, i) => {
    const angle = i * artistAngleStep;
    const node: AtlasNode = {
      id: `artist:${artist.id || artist.name}`,
      uri: artist.uri,
      title: artist.name,
      subtitle: artist.genres?.slice(0, 2).join(', ') || 'Top Artist',
      type: 'ARTIST',
      artworkUrl: artist.imageUrl || artist.images?.[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
      x: 350 + Math.cos(angle) * 190,
      y: 350 + Math.sin(angle) * 190,
    };
    nodes.push(node);
    artistMap.set(artist.name.toLowerCase(), node);
  });

  // Top Tracks outer ring (Radius 280)
  const tracksSlice = topTracks.slice(0, 10);
  const trackAngleStep = (2 * Math.PI) / Math.max(tracksSlice.length, 1);

  tracksSlice.forEach((track, i) => {
    const angle = i * trackAngleStep + 0.25;
    const node: AtlasNode = {
      id: `track:${track.id}`,
      uri: track.uri,
      title: track.title,
      subtitle: track.artist,
      type: 'TRACK',
      artworkUrl: track.artworkUrl,
      x: 350 + Math.cos(angle) * 280,
      y: 350 + Math.sin(angle) * 280,
    };
    nodes.push(node);

    // Connect to matched artist if any
    for (const [artistName, artistNode] of Array.from(artistMap.entries())) {
      if (track.artist.toLowerCase().includes(artistName)) {
        edges.push({
          sourceId: artistNode.id,
          targetId: node.id,
          relationship: 'affinity',
        });
        break;
      }
    }
  });

  // Recent tracks inner orbit (Radius 110)
  const recentSlice = recentTracks.slice(0, 6);
  const recentAngleStep = (2 * Math.PI) / Math.max(recentSlice.length, 1);

  recentSlice.forEach((track, i) => {
    const angle = i * recentAngleStep;
    const node: AtlasNode = {
      id: `recent:${track.id}`,
      uri: track.uri,
      title: track.title,
      subtitle: track.artist,
      type: 'TRACK',
      artworkUrl: track.artworkUrl,
      x: 350 + Math.cos(angle) * 110,
      y: 350 + Math.sin(angle) * 110,
    };
    nodes.push(node);
  });

  return { nodes, edges };
}

// ----------------- MUSIC INBOX STORAGE -----------------

export function getStoredInbox(userId?: string | null): InboxItem[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_INBOX_KEY, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveInboxItem(item: Omit<InboxItem, 'id' | 'addedAt'>, userId?: string | null): InboxItem[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_INBOX_KEY, userId);
  const current = getStoredInbox(userId);
  const newItem: InboxItem = {
    ...item,
    id: 'inbox-' + Date.now(),
    addedAt: Date.now(),
  };

  const updated = [newItem, ...current.filter(i => i.originalUrl !== item.originalUrl)];
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export function updateInboxStatus(id: string, status: InboxItem['status'], userId?: string | null): InboxItem[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_INBOX_KEY, userId);
  const current = getStoredInbox(userId);
  const updated = current.map(item => item.id === id ? { ...item, status } : item);
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export function removeInboxItem(id: string, userId?: string | null): InboxItem[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_INBOX_KEY, userId);
  const current = getStoredInbox(userId);
  const updated = current.filter(item => item.id !== id);
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

// ----------------- LISTENING PLANS STORAGE -----------------

export function getStoredPlans(userId?: string | null): ListeningPlan[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_PLANS_KEY, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveListeningPlan(plan: Omit<ListeningPlan, 'id' | 'createdAt'>, userId?: string | null): ListeningPlan[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_PLANS_KEY, userId);
  const current = getStoredPlans(userId);
  const newPlan: ListeningPlan = {
    ...plan,
    id: 'plan-' + Date.now(),
    createdAt: Date.now(),
  };
  const updated = [newPlan, ...current];
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export function togglePlanItemCompletion(planId: string, itemId: string, userId?: string | null): ListeningPlan[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_PLANS_KEY, userId);
  const current = getStoredPlans(userId);
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
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export function addTrackToPlan(planId: string, track: Track, userId?: string | null): ListeningPlan[] {
  if (typeof window === 'undefined') return [];
  const key = getScopedKey(BASE_PLANS_KEY, userId);
  const current = getStoredPlans(userId);
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
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}
