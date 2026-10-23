/**
 * WhenVanshListens | Web Player Engine
 * Core audio controller, Sound Atlas 2D graph engine, and local state persistence.
 */

// --- 1. Sound Journey Catalog & Default Dataset ---
const DEFAULT_CATALOG = [
  {
    id: "1",
    title: "Tu Rehti Hai",
    artist: "Aditya Rikhari",
    album: "Tu Rehti Hai",
    artwork: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    duration: 166, // 2:46
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg" // Audio stream
  },
  {
    id: "2",
    title: "Hale Dil",
    artist: "Harshit Saxena, Sayeed Quadri",
    album: "Murder 2",
    artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
    duration: 346, // 5:46
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/warm_breeze.ogg"
  },
  {
    id: "3",
    title: "Sanam Teri Kasam",
    artist: "Himesh Reshammiya, Ankit Tiwari",
    album: "Sanam Teri Kasam",
    artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
    duration: 314, // 5:14
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/summer_night.ogg"
  },
  {
    id: "4",
    title: "Heer",
    artist: "Ali & Shjr, Haider Ali",
    album: "Heer",
    artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
    duration: 215, // 3:35
    streamUrl: "https://actions.google.com/sounds/v1/weather/thunder_crack.ogg"
  },
  {
    id: "5",
    title: "Finding Her",
    artist: "Kushagra, Bharath",
    album: "Finding Her",
    artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80",
    duration: 184, // 3:04
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/forest_day.ogg"
  },
  {
    id: "6",
    title: "Stargazing",
    artist: "Myles Smith",
    album: "A Minute...",
    artwork: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80",
    duration: 232, // 3:52
    streamUrl: "https://actions.google.com/sounds/v1/ambiences/water_lapping.ogg"
  }
];

// --- 2. Application State ---
const state = {
  currentTrack: DEFAULT_CATALOG[0],
  isPlaying: false,
  currentTime: 0,
  duration: DEFAULT_CATALOG[0].duration,
  shuffle: false,
  repeat: false,
  likedTracks: new Set(JSON.parse(localStorage.getItem('wvl_liked_tracks') || '["1", "2"]')),
  inbox: JSON.parse(localStorage.getItem('wvl_music_inbox') || '[]'),
  history: JSON.parse(localStorage.getItem('wvl_listening_history') || '[]'),
  atlasMode: 'history', // 'history' | 'map'
  currentView: 'home',
  mapFilter: 'all',
  selectedMapNode: null
};

// Ensure default history has rich initial data if empty
if (state.history.length === 0) {
  state.history = [
    { id: "h1", trackId: "1", title: "Tu Rehti Hai", artist: "Aditya Rikhari", album: "Tu Rehti Hai", artwork: DEFAULT_CATALOG[0].artwork, timestamp: Date.now() - 30000, source: "Observed" },
    { id: "h2", trackId: "3", title: "Sanam Teri Kasam", artist: "Himesh Reshammiya", album: "Sanam Teri Kasam", artwork: DEFAULT_CATALOG[2].artwork, timestamp: Date.now() - 3600000, source: "Observed" },
    { id: "h3", trackId: "4", title: "Heer", artist: "Ali & Shjr", album: "Heer", artwork: DEFAULT_CATALOG[3].artwork, timestamp: Date.now() - 7200000, source: "Observed" },
    { id: "h4", trackId: "2", title: "Hale Dil", artist: "Harshit Saxena", album: "Murder 2", artwork: DEFAULT_CATALOG[1].artwork, timestamp: Date.now() - 86400000, source: "Imported" }
  ];
  saveHistory();
}

// Ensure default inbox item
if (state.inbox.length === 0) {
  state.inbox = [
    { id: "in1", title: "Wish You Were Here", artist: "Frappe Ash, Rae, Encore ABJ", date: "Oct 23, 2026", status: "To Listen" }
  ];
  saveInbox();
}

// --- 3. Audio Controller ---
const audio = new Audio();
let audioCtx = null;
let synthOsc = null;
let gainNode = null;

function initAudioContext() {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.15;
    gainNode.connect(audioCtx.destination);
  } catch (e) {
    console.warn("Web Audio API not supported", e);
  }
}

// Synthesizer ambient tone generator for instant playback on iOS / Desktop
function playHarmonicTone() {
  if (!audioCtx) initAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  if (!audioCtx) return;

  if (synthOsc) {
    try { synthOsc.stop(); } catch(e) {}
  }
  synthOsc = audioCtx.createOscillator();
  synthOsc.type = 'sine';
  synthOsc.frequency.setValueAtTime(220 + (state.currentTrack.id.charCodeAt(0) * 15), audioCtx.currentTime);
  synthOsc.connect(gainNode);
  synthOsc.start();
}

function stopHarmonicTone() {
  if (synthOsc) {
    try { synthOsc.stop(); } catch(e) {}
    synthOsc = null;
  }
}

let playbackInterval = null;

function playTrack(track, recordHistory = true) {
  initAudioContext();
  state.currentTrack = track;
  state.duration = track.duration || 200;
  state.currentTime = 0;
  state.isPlaying = true;

  if (recordHistory) {
    recordListeningEvent(track);
  }

  playHarmonicTone();
  startPlaybackTimer();
  updateUI();
  updateWaveformSeek();
}

function togglePlayPause() {
  if (state.isPlaying) {
    state.isPlaying = false;
    stopHarmonicTone();
    stopPlaybackTimer();
  } else {
    state.isPlaying = true;
    playHarmonicTone();
    startPlaybackTimer();
  }
  updateUI();
}

function startPlaybackTimer() {
  stopPlaybackTimer();
  playbackInterval = setInterval(() => {
    if (!state.isPlaying) return;
    state.currentTime += 1;
    if (state.currentTime >= state.duration) {
      nextTrack();
    }
    updateTimeDisplay();
    updateWaveformProgress();
  }, 1000);
}

function stopPlaybackTimer() {
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
}

function nextTrack() {
  const currentIndex = DEFAULT_CATALOG.findIndex(t => t.id === state.currentTrack.id);
  const nextIndex = state.shuffle 
    ? Math.floor(Math.random() * DEFAULT_CATALOG.length)
    : (currentIndex + 1) % DEFAULT_CATALOG.length;
  playTrack(DEFAULT_CATALOG[nextIndex]);
}

function prevTrack() {
  if (state.currentTime > 3) {
    state.currentTime = 0;
    updateTimeDisplay();
    updateWaveformProgress();
    return;
  }
  const currentIndex = DEFAULT_CATALOG.findIndex(t => t.id === state.currentTrack.id);
  const prevIndex = (currentIndex - 1 + DEFAULT_CATALOG.length) % DEFAULT_CATALOG.length;
  playTrack(DEFAULT_CATALOG[prevIndex]);
}

function seekTo(seconds) {
  state.currentTime = Math.max(0, Math.min(seconds, state.duration));
  updateTimeDisplay();
  updateWaveformProgress();
}

function recordListeningEvent(track) {
  // Deduplicate rapid consecutive triggers within 45s
  const last = state.history[0];
  if (last && last.trackId === track.id && (Date.now() - last.timestamp) < 45000) {
    last.timestamp = Date.now();
    saveHistory();
    return;
  }

  const newEntry = {
    id: "h_" + Date.now(),
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: track.artwork,
    timestamp: Date.now(),
    source: "Observed"
  };

  state.history.unshift(newEntry);
  if (state.history.length > 50) state.history.pop();
  saveHistory();
  renderAtlasHistory();
  renderHomeRecents();
  renderSidebarRecents();
  updateExplorationMetrics();
}

function saveHistory() {
  localStorage.setItem('wvl_listening_history', JSON.stringify(state.history));
}

function saveInbox() {
  localStorage.setItem('wvl_music_inbox', JSON.stringify(state.inbox));
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// --- 4. 42-Bar Dynamic Acoustic Waveform Bar Generator ---
const NUM_WAVEFORM_BARS = 42;
// Natural musical curve bar heights (percent 18% to 100%)
const BASE_BAR_HEIGHTS = [
  24, 38, 52, 70, 88, 65, 45, 80, 95, 60,
  35, 65, 90, 100, 75, 50, 85, 95, 60, 40,
  70, 85, 90, 75, 55, 80, 95, 65, 40, 60,
  85, 100, 70, 48, 80, 90, 60, 42, 68, 50, 32, 20
];

function initWaveformBars() {
  const container = document.getElementById('waveform-interactive-bars');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < NUM_WAVEFORM_BARS; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar';
    bar.style.height = `${BASE_BAR_HEIGHTS[i]}%`;
    bar.dataset.index = i;

    // Click / touch scrubbing
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      const progress = (i + 1) / NUM_WAVEFORM_BARS;
      seekTo(progress * state.duration);
    });

    container.appendChild(bar);
  }
}

function updateWaveformProgress() {
  const ratio = state.duration > 0 ? (state.currentTime / state.duration) : 0;
  const activeCount = Math.floor(ratio * NUM_WAVEFORM_BARS);
  const bars = document.querySelectorAll('.waveform-bar');

  bars.forEach((bar, idx) => {
    if (idx <= activeCount) {
      bar.classList.add('played');
    } else {
      bar.classList.remove('played');
    }
  });

  // Update mini player progress line
  const miniFill = document.getElementById('mini-progress-fill');
  if (miniFill) {
    miniFill.style.width = `${ratio * 100}%`;
  }
}

function updateWaveformSeek() {
  updateWaveformProgress();
}

function updateTimeDisplay() {
  const elapsed = document.getElementById('player-time-elapsed');
  const total = document.getElementById('player-time-total');
  if (elapsed) elapsed.textContent = formatTime(state.currentTime);
  if (total) total.textContent = formatTime(state.duration);
}

// --- 5. UI Renderers & State Sync ---
function updateUI() {
  const track = state.currentTrack;

  // Mini player
  const miniArt = document.getElementById('mini-art');
  const miniTitle = document.getElementById('mini-title');
  const miniArtist = document.getElementById('mini-artist');
  const miniPlayIcon = document.getElementById('mini-play-icon');

  if (miniArt) miniArt.src = track.artwork;
  if (miniTitle) miniTitle.textContent = track.title;
  if (miniArtist) miniArtist.textContent = track.artist;
  if (miniPlayIcon) {
    miniPlayIcon.innerHTML = state.isPlaying 
      ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
      : '<polygon points="5 3 19 12 5 21 5 3"/>';
  }

  // Fullscreen player
  const playerArt = document.getElementById('player-artwork');
  const playerTitle = document.getElementById('player-track-title');
  const playerArtist = document.getElementById('player-track-artist');
  const playerAlbum = document.getElementById('player-track-album');
  const playerPlayIcon = document.getElementById('player-center-play-icon');
  const playerOverlay = document.getElementById('player-overlay');
  const likeBtn = document.getElementById('player-like-btn');

  if (playerArt) playerArt.src = track.artwork;
  if (playerTitle) playerTitle.textContent = track.title;
  if (playerArtist) playerArtist.textContent = track.artist;
  if (playerAlbum) playerAlbum.textContent = track.album;

  if (playerPlayIcon) {
    playerPlayIcon.innerHTML = state.isPlaying
      ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
      : '<polygon points="5 3 19 12 5 21 5 3"/>';
  }

  if (playerOverlay) {
    if (state.isPlaying) {
      playerOverlay.classList.add('playing');
    } else {
      playerOverlay.classList.remove('playing');
    }
  }

  if (likeBtn) {
    if (state.likedTracks.has(track.id)) {
      likeBtn.classList.add('liked');
    } else {
      likeBtn.classList.remove('liked');
    }
  }

  // Atlas Current Hero Card
  const atlasArt = document.getElementById('atlas-current-art');
  const atlasTitle = document.getElementById('atlas-current-title');
  const atlasArtist = document.getElementById('atlas-current-artist');
  const atlasPlayBtn = document.getElementById('atlas-current-play-btn');

  if (atlasArt) atlasArt.src = track.artwork;
  if (atlasTitle) atlasTitle.textContent = track.title;
  if (atlasArtist) atlasArtist.textContent = `${track.artist} • ${track.album}`;
  if (atlasPlayBtn) {
    atlasPlayBtn.innerHTML = state.isPlaying
      ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  updateTimeDisplay();
}

// Render Recent Observed Tracks on Home
function renderHomeRecents() {
  const container = document.getElementById('home-history-list');
  if (!container) return;
  container.innerHTML = '';

  const recents = state.history.slice(0, 5);
  recents.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
      <img src="${entry.artwork}" class="track-thumb" alt="${entry.title}">
      <div class="track-meta">
        <div class="track-name">${entry.title}</div>
        <div class="track-sub">${entry.artist} &bull; ${entry.album}</div>
      </div>
      <div class="track-time-tag">${getRelativeTime(entry.timestamp)} &bull; ${entry.source}</div>
      <button class="track-play-btn" title="Play Again">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    `;
    row.addEventListener('click', () => {
      const match = DEFAULT_CATALOG.find(t => t.id === entry.trackId) || {
        id: entry.trackId,
        title: entry.title,
        artist: entry.artist,
        album: entry.album,
        artwork: entry.artwork,
        duration: 210
      };
      playTrack(match);
    });
    container.appendChild(row);
  });
}

// Render Quick Mixes
function renderQuickMixes() {
  const container = document.getElementById('quick-mix-grid');
  if (!container) return;
  container.innerHTML = '';

  DEFAULT_CATALOG.slice(0, 6).forEach(track => {
    const card = document.createElement('div');
    card.className = 'quick-card';
    card.innerHTML = `
      <img src="${track.artwork}" alt="${track.title}" class="quick-card-art">
      <div class="quick-card-info">
        <div class="quick-card-title">${track.title}</div>
        <div class="quick-card-sub">${track.artist}</div>
      </div>
      <button class="quick-card-play" title="Play">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    `;
    card.addEventListener('click', () => playTrack(track));
    container.appendChild(card);
  });
}

// Render Sidebar Recents
function renderSidebarRecents() {
  const container = document.getElementById('sidebar-recents');
  if (!container) return;
  container.innerHTML = '';

  const uniqueRecentTracks = [];
  const seen = new Set();
  for (const h of state.history) {
    if (!seen.has(h.trackId)) {
      seen.add(h.trackId);
      uniqueRecentTracks.push(h);
      if (uniqueRecentTracks.length >= 7) break;
    }
  }

  uniqueRecentTracks.forEach(h => {
    const item = document.createElement('div');
    item.className = 'recent-sidebar-item';
    item.innerHTML = `
      <img src="${h.artwork}" class="recent-sidebar-thumb" alt="${h.title}">
      <span class="recent-sidebar-name">${h.title}</span>
    `;
    item.addEventListener('click', () => {
      const track = DEFAULT_CATALOG.find(t => t.id === h.trackId) || h;
      playTrack(track);
    });
    container.appendChild(item);
  });
}

// Render Sound Atlas Chronological History Stream
function renderAtlasHistory() {
  const container = document.getElementById('atlas-history-stream');
  if (!container) return;
  container.innerHTML = '';

  state.history.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
      <img src="${entry.artwork}" class="track-thumb" alt="${entry.title}">
      <div class="track-meta">
        <div class="track-name">${entry.title}</div>
        <div class="track-sub">${entry.artist} &bull; ${entry.album}</div>
      </div>
      <div class="track-time-tag">${getRelativeTime(entry.timestamp)} &bull; ${entry.source}</div>
      <button class="track-play-btn" title="Replay song">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
    `;
    row.addEventListener('click', () => {
      const match = DEFAULT_CATALOG.find(t => t.id === entry.trackId) || entry;
      playTrack(match);
    });
    container.appendChild(row);
  });
}

// Derive Explored Albums & Artists
function updateExplorationMetrics() {
  // Albums
  const albumMap = new Map();
  state.history.forEach(h => {
    if (!h.album) return;
    if (!albumMap.has(h.album)) {
      albumMap.set(h.album, { name: h.album, artist: h.artist, artwork: h.artwork, count: 0 });
    }
    albumMap.get(h.album).count += 1;
  });

  const albumContainer = document.getElementById('carousel-explored-albums');
  const albumCountLabel = document.getElementById('explored-albums-count');
  if (albumCountLabel) albumCountLabel.textContent = `${albumMap.size} in your journey`;

  if (albumContainer) {
    albumContainer.innerHTML = '';
    albumMap.forEach(alb => {
      const card = document.createElement('div');
      card.className = 'carousel-card';
      card.innerHTML = `
        <img src="${alb.artwork}" class="carousel-card-img" alt="${alb.name}">
        <div class="carousel-card-title">${alb.name}</div>
        <div class="carousel-card-sub">${alb.count} tracks played</div>
      `;
      card.addEventListener('click', () => {
        const found = DEFAULT_CATALOG.find(t => t.album === alb.name);
        if (found) playTrack(found);
      });
      albumContainer.appendChild(card);
    });
  }

  // Artists
  const artistMap = new Map();
  state.history.forEach(h => {
    if (!h.artist) return;
    if (!artistMap.has(h.artist)) {
      artistMap.set(h.artist, { name: h.artist, artwork: h.artwork, count: 0 });
    }
    artistMap.get(h.artist).count += 1;
  });

  const artistContainer = document.getElementById('carousel-explored-artists');
  const artistCountLabel = document.getElementById('explored-artists-count');
  if (artistCountLabel) artistCountLabel.textContent = `${artistMap.size} artists listened to`;

  if (artistContainer) {
    artistContainer.innerHTML = '';
    artistMap.forEach(art => {
      const card = document.createElement('div');
      card.className = 'carousel-card';
      card.innerHTML = `
        <img src="${art.artwork}" class="carousel-card-img carousel-artist-img" alt="${art.name}">
        <div class="carousel-card-title">${art.name}</div>
        <div class="carousel-card-sub">${art.count} tracks</div>
      `;
      card.addEventListener('click', () => {
        const found = DEFAULT_CATALOG.find(t => t.artist === art.name);
        if (found) playTrack(found);
      });
      artistContainer.appendChild(card);
    });
  }
}

// Relative timestamp helper
function getRelativeTime(timestamp) {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// --- 6. Sound Atlas 2D Constellation Canvas Engine ---
let canvas, ctx;
let camera = { x: 0, y: 0, zoom: 1 };
let isDraggingMap = false;
let dragStart = { x: 0, y: 0 };
let mapNodes = [];
let mapEdges = [];

function initAtlasMap() {
  canvas = document.getElementById('atlas-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    camera.x = canvas.width / 2;
    camera.y = canvas.height / 2;
    renderAtlasCanvas();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Mouse / Touch Interaction for Map Pan & Zoom
  canvas.addEventListener('mousedown', (e) => {
    isDraggingMap = true;
    dragStart = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingMap) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    camera.x += dx * window.devicePixelRatio;
    camera.y += dy * window.devicePixelRatio;
    dragStart = { x: e.clientX, y: e.clientY };
    renderAtlasCanvas();
  });

  window.addEventListener('mouseup', () => { isDraggingMap = false; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    camera.zoom = Math.max(0.4, Math.min(camera.zoom * zoomFactor, 2.5));
    renderAtlasCanvas();
  }, { passive: false });

  // Click on Node to open inspector
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * window.devicePixelRatio;
    const clickY = (e.clientY - rect.top) * window.devicePixelRatio;

    const clicked = mapNodes.find(n => {
      const screenX = camera.x + n.x * camera.zoom;
      const screenY = camera.y + n.y * camera.zoom;
      const dist = Math.hypot(clickX - screenX, clickY - screenY);
      return dist <= (n.radius * camera.zoom + 8);
    });

    if (clicked) {
      showNodeInspector(clicked);
    } else {
      hideNodeInspector();
    }
  });

  buildMapFromHistory();
}

function buildMapFromHistory() {
  mapNodes = [];
  mapEdges = [];

  // Artists in inner orbit
  const uniqueArtists = [...new Set(state.history.map(h => h.artist))].slice(0, 5);
  const artistRadius = 140;
  const artistAngleStep = (2 * Math.PI) / (uniqueArtists.length || 1);

  uniqueArtists.forEach((art, i) => {
    const angle = i * artistAngleStep;
    const sample = state.history.find(h => h.artist === art);
    const node = {
      id: "art_" + art,
      type: "artist",
      title: art,
      subtitle: "Artist in your journey",
      x: artistRadius * Math.cos(angle),
      y: artistRadius * Math.sin(angle),
      radius: 22,
      color: "#3B82F6",
      artwork: sample ? sample.artwork : ""
    };
    mapNodes.push(node);
  });

  // Albums in middle orbit
  const uniqueAlbums = [...new Set(state.history.map(h => h.album))].slice(0, 6);
  const albumRadius = 250;
  const albumAngleStep = (2 * Math.PI) / (uniqueAlbums.length || 1);

  uniqueAlbums.forEach((alb, i) => {
    const angle = i * albumAngleStep + 0.3;
    const sample = state.history.find(h => h.album === alb);
    const node = {
      id: "alb_" + alb,
      type: "album",
      title: alb,
      subtitle: sample ? sample.artist : "",
      x: albumRadius * Math.cos(angle),
      y: albumRadius * Math.sin(angle),
      radius: 18,
      color: "#60A5FA",
      artwork: sample ? sample.artwork : ""
    };
    mapNodes.push(node);

    // Edge Artist -> Album
    const artistNode = mapNodes.find(n => n.type === "artist" && n.title === sample.artist);
    if (artistNode) {
      mapEdges.push({ source: artistNode, target: node });
    }
  });

  // Tracks in outer constellation
  const recentTracks = state.history.slice(0, 10);
  const trackRadius = 360;
  const trackAngleStep = (2 * Math.PI) / (recentTracks.length || 1);

  recentTracks.forEach((t, i) => {
    const angle = i * trackAngleStep;
    const node = {
      id: "trk_" + t.trackId + "_" + i,
      trackId: t.trackId,
      type: "track",
      title: t.title,
      subtitle: `${t.artist} • ${t.album}`,
      x: trackRadius * Math.cos(angle),
      y: trackRadius * Math.sin(angle),
      radius: 14,
      color: "#00F0FF",
      artwork: t.artwork
    };
    mapNodes.push(node);

    // Edge Album -> Track
    const albNode = mapNodes.find(n => n.type === "album" && n.title === t.album);
    if (albNode) {
      mapEdges.push({ source: albNode, target: node });
    }
  });

  renderAtlasCanvas();
}

function renderAtlasCanvas() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Orbital rings
  ctx.save();
  ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
  ctx.lineWidth = 1;

  [140, 250, 360].forEach(r => {
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, r * camera.zoom, 0, 2 * Math.PI);
    ctx.stroke();
  });
  ctx.restore();

  // Edges
  ctx.save();
  mapEdges.forEach(edge => {
    const sx = camera.x + edge.source.x * camera.zoom;
    const sy = camera.y + edge.source.y * camera.zoom;
    const tx = camera.x + edge.target.x * camera.zoom;
    const ty = camera.y + edge.target.y * camera.zoom;

    const grad = ctx.createLinearGradient(sx, sy, tx, ty);
    grad.addColorStop(0, "rgba(59, 130, 246, 0.4)");
    grad.addColorStop(1, "rgba(0, 240, 255, 0.2)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  });
  ctx.restore();

  // Nodes
  mapNodes.forEach(node => {
    if (state.mapFilter !== 'all' && node.type !== state.mapFilter) return;

    const nx = camera.x + node.x * camera.zoom;
    const ny = camera.y + node.y * camera.zoom;
    const r = node.radius * camera.zoom;

    // Glowing aura
    ctx.save();
    ctx.beginPath();
    ctx.arc(nx, ny, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = node.color + "33";
    ctx.fill();

    // Node Body
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Node Label
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${Math.max(10, 11 * camera.zoom)}px 'Outfit', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(node.title, nx, ny + r + 14 * camera.zoom);
    ctx.restore();
  });
}

function showNodeInspector(node) {
  state.selectedMapNode = node;
  const inspector = document.getElementById('node-inspector');
  const img = document.getElementById('inspector-image');
  const typeBadge = document.getElementById('inspector-type');
  const title = document.getElementById('inspector-title');
  const subtitle = document.getElementById('inspector-subtitle');
  const stat = document.getElementById('inspector-stat');

  if (img) img.src = node.artwork || DEFAULT_CATALOG[0].artwork;
  if (typeBadge) typeBadge.textContent = node.type.toUpperCase();
  if (title) title.textContent = node.title;
  if (subtitle) subtitle.textContent = node.subtitle;
  if (stat) stat.textContent = `Active in your recorded listening history`;

  if (inspector) inspector.classList.remove('hidden');
}

function hideNodeInspector() {
  state.selectedMapNode = null;
  const inspector = document.getElementById('node-inspector');
  if (inspector) inspector.classList.add('hidden');
}

// --- 7. Event Listeners & Navigation ---
function setupEventListeners() {
  // Navigation tabs (Desktop & Mobile)
  const navButtons = document.querySelectorAll('[data-view]');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewName = btn.getAttribute('data-view');
      switchView(viewName);
    });
  });

  // Atlas Mode Toggle: History vs Map
  const toggleHistory = document.getElementById('toggle-history-mode');
  const toggleMap = document.getElementById('toggle-map-mode');
  const subviewHistory = document.getElementById('atlas-subview-history');
  const subviewMap = document.getElementById('atlas-subview-map');

  if (toggleHistory && toggleMap) {
    toggleHistory.addEventListener('click', () => {
      toggleHistory.classList.add('active');
      toggleMap.classList.remove('active');
      subviewHistory.classList.add('active');
      subviewMap.classList.remove('active');
    });

    toggleMap.addEventListener('click', () => {
      toggleMap.classList.add('active');
      toggleHistory.classList.remove('active');
      subviewMap.classList.add('active');
      subviewHistory.classList.remove('active');
      buildMapFromHistory();
    });
  }

  // Mini player controls
  document.getElementById('mini-play')?.addEventListener('click', togglePlayPause);
  document.getElementById('mini-next')?.addEventListener('click', nextTrack);
  document.getElementById('mini-prev')?.addEventListener('click', prevTrack);
  document.getElementById('atlas-current-play-btn')?.addEventListener('click', togglePlayPause);

  // Expand Fullscreen Player on click
  document.getElementById('mini-click-expand')?.addEventListener('click', openPlayerOverlay);
  document.getElementById('mini-expand')?.addEventListener('click', openPlayerOverlay);
  document.getElementById('player-btn-minimize')?.addEventListener('click', closePlayerOverlay);

  // Fullscreen player controls
  document.getElementById('player-btn-play-pause')?.addEventListener('click', togglePlayPause);
  document.getElementById('player-btn-next')?.addEventListener('click', nextTrack);
  document.getElementById('player-btn-prev')?.addEventListener('click', prevTrack);

  // Like button
  document.getElementById('player-like-btn')?.addEventListener('click', () => {
    const id = state.currentTrack.id;
    if (state.likedTracks.has(id)) {
      state.likedTracks.delete(id);
    } else {
      state.likedTracks.add(id);
    }
    localStorage.setItem('wvl_liked_tracks', JSON.stringify([...state.likedTracks]));
    updateUI();
  });

  // Hero Play Button
  document.getElementById('btn-hero-play')?.addEventListener('click', () => {
    playTrack(DEFAULT_CATALOG[1]); // Play "Hale Dil" from Murder 2
  });

  document.getElementById('btn-open-atlas-hero')?.addEventListener('click', () => {
    switchView('sound-atlas');
  });

  document.getElementById('link-view-all-atlas')?.addEventListener('click', () => {
    switchView('sound-atlas');
  });

  // Quick Action Buttons on Full Player
  document.getElementById('action-save-inbox')?.addEventListener('click', () => {
    const item = {
      id: "in_" + Date.now(),
      title: state.currentTrack.title,
      artist: state.currentTrack.artist,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: "To Listen"
    };
    state.inbox.unshift(item);
    saveInbox();
    renderInbox();
    alert(`Saved "${state.currentTrack.title}" to Music Inbox!`);
  });

  document.getElementById('action-add-plan')?.addEventListener('click', () => {
    alert(`Added "${state.currentTrack.title}" to your active Listening Plan!`);
  });

  document.getElementById('action-view-atlas')?.addEventListener('click', () => {
    closePlayerOverlay();
    switchView('sound-atlas');
  });

  document.getElementById('action-more-options')?.addEventListener('click', () => {
    openOptionsSheet();
  });

  document.getElementById('player-btn-options')?.addEventListener('click', openOptionsSheet);
  document.getElementById('player-btn-queue')?.addEventListener('click', openQueueDrawer);
  document.getElementById('btn-close-queue')?.addEventListener('click', closeQueueDrawer);

  // Node Inspector Actions
  document.getElementById('btn-close-inspector')?.addEventListener('click', hideNodeInspector);
  document.getElementById('btn-inspector-play')?.addEventListener('click', () => {
    if (!state.selectedMapNode) return;
    const found = DEFAULT_CATALOG.find(t => t.id === state.selectedMapNode.trackId || t.title === state.selectedMapNode.title);
    if (found) playTrack(found);
    hideNodeInspector();
  });

  // Map Filters
  document.querySelectorAll('.map-filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.map-filter-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.mapFilter = chip.getAttribute('data-filter');
      renderAtlasCanvas();
    });
  });

  // Map Zoom Controls
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    camera.zoom = Math.min(camera.zoom * 1.25, 2.5);
    renderAtlasCanvas();
  });
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    camera.zoom = Math.max(camera.zoom * 0.8, 0.4);
    renderAtlasCanvas();
  });
  document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
    camera.zoom = 1;
    camera.x = canvas.width / 2;
    camera.y = canvas.height / 2;
    renderAtlasCanvas();
  });

  // Drawer outside click dismiss
  document.getElementById('queue-drawer')?.addEventListener('click', (e) => {
    if (e.target.id === 'queue-drawer') closeQueueDrawer();
  });
  document.getElementById('options-sheet')?.addEventListener('click', (e) => {
    if (e.target.id === 'options-sheet') closeOptionsSheet();
  });
}

function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mob-nav-item').forEach(b => b.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll(`[data-view="${viewName}"]`).forEach(btn => btn.classList.add('active'));

  if (viewName === 'sound-atlas') {
    updateExplorationMetrics();
    renderAtlasHistory();
    if (state.atlasMode === 'map') buildMapFromHistory();
  }
}

function openPlayerOverlay() {
  document.getElementById('player-overlay')?.classList.add('open');
}

function closePlayerOverlay() {
  document.getElementById('player-overlay')?.classList.remove('open');
}

function openQueueDrawer() {
  const container = document.getElementById('queue-items-container');
  if (container) {
    container.innerHTML = '';
    DEFAULT_CATALOG.forEach(track => {
      const isCurrent = track.id === state.currentTrack.id;
      const row = document.createElement('div');
      row.className = 'track-row';
      if (isCurrent) row.style.borderColor = 'var(--accent-blue)';
      row.innerHTML = `
        <img src="${track.artwork}" class="track-thumb" alt="${track.title}">
        <div class="track-meta">
          <div class="track-name">${track.title} ${isCurrent ? '• Now Playing' : ''}</div>
          <div class="track-sub">${track.artist}</div>
        </div>
      `;
      row.addEventListener('click', () => {
        playTrack(track);
        closeQueueDrawer();
      });
      container.appendChild(row);
    });
  }
  document.getElementById('queue-drawer')?.classList.add('open');
}

function closeQueueDrawer() {
  document.getElementById('queue-drawer')?.classList.remove('open');
}

function openOptionsSheet() {
  const art = document.getElementById('sheet-preview-art');
  const title = document.getElementById('sheet-preview-title');
  const artist = document.getElementById('sheet-preview-artist');

  if (art) art.src = state.currentTrack.artwork;
  if (title) title.textContent = state.currentTrack.title;
  if (artist) artist.textContent = state.currentTrack.artist;

  document.getElementById('options-sheet')?.classList.add('open');
}

function closeOptionsSheet() {
  document.getElementById('options-sheet')?.classList.remove('open');
}

function renderInbox() {
  const container = document.getElementById('inbox-items-container');
  if (!container) return;
  container.innerHTML = '';

  state.inbox.forEach(item => {
    const card = document.createElement('div');
    card.className = 'quick-card';
    card.style.padding = '14px 18px';
    card.innerHTML = `
      <div style="flex: 1;">
        <div class="quick-card-title">${item.title}</div>
        <div class="quick-card-sub">${item.artist} &bull; ${item.date}</div>
      </div>
      <span class="badge-pulse" style="margin-right: 12px;">${item.status}</span>
    `;
    container.appendChild(card);
  });
}

// --- 8. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initWaveformBars();
  renderQuickMixes();
  renderHomeRecents();
  renderSidebarRecents();
  renderAtlasHistory();
  updateExplorationMetrics();
  renderInbox();
  setupEventListeners();
  initAtlasMap();
  updateUI();
});
