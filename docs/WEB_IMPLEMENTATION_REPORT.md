# WhenVanshListens Web — Implementation & Deployment Report

**Release**: WhenVanshListens Web 1.0 (Desktop & iOS Safari)  
**Production URL**: [https://web-fawn-five-77.vercel.app](https://web-fawn-five-77.vercel.app)  
**Vercel Project**: `vb56804-5326s-projects/web`  
**GitHub Repository**: `whenvanshcodes/WVL`  
**Design Identity**: Pure AMOLED Black (`#000000`), Dark Surfaces (`#0A0D14`, `#101522`), Electric Blue (`#3B82F6`, `#60A5FA`), Original Acoustic Waveform Monogram.

---

## 1. Executive Summary

WhenVanshListens Web extends the original Android application into a fully responsive, modern web player engineered specifically for desktop browsers (Chrome, Edge, Firefox, Safari) and mobile web (iOS Safari & Android Chrome).

The implementation strictly preserves the existing Android project (`base/`) intact without any changes to its Gradle build, Kotlin data models, or native playback engine. The web client is housed independently in `web/`, powered by Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons, and Web Audio API with official Spotify PKCE OAuth integration.

---

## 2. Architecture & Technology Stack

```
myspoti-main/
├── base/               # Unchanged native Android application (Jetpack Compose, Kotlin)
│   ├── app/
│   ├── api/
│   ├── api-spotify/
│   └── host-android/
├── web/                # Dedicated Vercel & Web Player application
│   ├── public/         # PWA Manifest, favicon, official VB waveform SVG monogram
│   ├── src/
│   │   ├── app/        # Next.js 14 App Router (Home, Atlas, Inbox, Plans, Search, Settings, Callback)
│   │   ├── components/ # Navigation, MiniPlayer, NowPlayingExpanded, InteractiveWaveform, BrandMark
│   │   ├── context/    # PlayerContext (Authoritative playback engine with dual audio architecture)
│   │   ├── lib/        # LocalStorage persistence, Spotify PKCE Auth, Sound Atlas 2D graph projector
│   │   └── types/      # Pure TypeScript domain models (Track, SoundAtlasNode, MusicInboxItem, ListeningPlan)
│   ├── vercel.json     # Framework configuration for Vercel builds
│   ├── tailwind.config.js
│   └── tsconfig.json
└── docs/               # Architecture and implementation documentation
```

### Key Architectural Decisions

1. **Separation of Concerns**:
   - The web app does not attempt to cross-compile Kotlin code into JS.
   - Built with Next.js 14 App Router with standalone static optimization, ensuring fast time-to-first-byte (TTFB) and PWA offline capability.
2. **Dual Playback Architecture**:
   - **Spotify Connect Web API (Primary)**: When authenticated via Spotify PKCE OAuth, playback commands (`play`, `pause`, `seek`, `next`, `previous`, `volume`, `shuffle`, `repeat`) synchronize directly with the user's active Spotify session without exposing any client secrets.
   - **Web Audio / HTML5 Audio Engine (Fallback & Instant Preview)**: Audio synthesis and preview playback provide acoustic timeline scrubbing, 42-bar dynamic waveform responsiveness, and uninterrupted navigation even when Spotify Connect is idle or unlinked.
3. **Local-First Private Persistence**:
   - Stored in browser `localStorage` under namespaced keys (`wvl_history`, `wvl_inbox`, `wvl_plans`, `wvl_custom_nodes`).
   - Seeded with authentic listening history items matching the Android client's design language.
   - Fast, private, and zero cross-device tracking.

---

## 3. Implemented Routes & Features

### A. Home (`/`)
- **Now Playing Hero Card**: Real-time display of current track with album artwork, live acoustic waveform visualizer, play/pause controls, and quick navigation into expanded player.
- **Explored Albums & Artists**: Chronologically aggregated from verified listening history with replay triggers.
- **Feature Quick Shortcuts**: Instant access to Music Inbox, Active Listening Plans, and Sound Atlas.
- **Persistent Mini-Player**: Bottom docked bar with live progress and full playback controls.

### B. Listening Space — Now Playing (`NowPlayingExpanded`)
- **Visual Centerpiece**: Rotating vinyl record with album art center label, animated grooves, and 42-bar acoustic interactive waveform.
- **Scrubbing & Seeking**: Mouse drag and touch scrubbing with millisecond precision that dispatches real player seek commands.
- **68dp Circular Electric-Blue Action Button**: Glowing interactive center control matching the Android design language.
- **Quick Action Bar**: One-click actions to add current track to Music Inbox, add to Listening Plans, or inspect relationships in Sound Atlas.
- **Slide-Over Queue Drawer**: Real-time queue inspector with upcoming track selection.
- **Details Modal**: Audio quality, album, artist, and Spotify link inspector.

### C. Sound Atlas 3.0 (`/atlas`)
- **Dual-Mode Experience**:
  - **History View**: Chronological timeline of tracks with timestamp badges, duration, and direct play actions.
  - **Constellation Map View**: Interactive 2D relationship graph rendered on SVG Canvas showing connected clusters of artists, albums, and songs with orbital rings.
- **Touch & Mouse Canvas Interaction**: Pan and zoom controls with node selection and floating relationship inspector card.

### D. Music Inbox (`/inbox`)
- **Link Capture**: Paste and validate music links (Spotify, YouTube, Soundcloud, Instagram).
- **Status Workflows**: Categorized by `All`, `To Listen`, `Listening`, `Completed`, and `Archived`.
- **Note Taking & Metadata**: Track source, custom notes, date added, and direct external link launching.
- **Playback Integration**: Direct trigger to play resolved tracks in the web player.
- **Duplicate Prevention**: Rejects duplicate URLs gracefully.

### E. Listening Plans (`/plans`)
- **Goal Setting**: Create curated sessions (e.g. *Midnight Ambient Explorations*, *Discography Deep Dive*).
- **Progress Tracking**: Real-time completion progress bar based on checklist state.
- **Track Resumption**: Interactive item checkboxes with direct play triggers and resumption indicators.

### F. Search & Library (`/search`)
- **Live Search**: Query tracks, artists, and albums with debounced input.
- **Filter Chips**: Quick category toggles (`All`, `Tracks`, `Artists`, `Albums`).
- **Spotify Catalog Integration**: When connected via OAuth, queries Spotify's live Web API (`/v1/search`); falls back to local library search with zero errors.

### G. Settings & About (`/settings`)
- **Connection Status**: Real-time Spotify OAuth authentication status with Connect/Disconnect actions and token expiry timers.
- **"Why I Created This" Manifesto**: The authentic creator note detailing the passion for intentional, ad-free music listening.
- **Branding & Social**: Verified Instagram connection (`@whenvanshwrites`) and GitHub repository links.
- **No Ko-fi or Donation Links**: Removed in strict compliance with project guidelines.

---

## 4. Mobile & iOS Safari Optimization

- **Safe Area Insets**: Responsive padding using `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` prevents dock overlap on iPhone notch and home indicator bar.
- **Touch Gesture Handling**: Interactive waveform seek bar supports `onTouchStart`, `onTouchMove`, and `onTouchEnd` with client coordinate clamping.
- **No Horizontal Overflow**: All containers enforce `overflow-x-hidden` with mobile-first viewport meta tags.
- **PWA Manifest & Apple Touch Icons**: Web App Manifest configured with `display: standalone`, `theme_color: #000000`, and high-resolution SVG/PNG icons.

---

## 5. Security & Authentication Architecture (Individual User PKCE)

1. **PKCE OAuth 2.0 (Proof Key for Code Exchange — RFC 7636)**:
   - **Code Verifier**: 64-character cryptographically random unreserved string generated via `window.crypto.getRandomValues`.
   - **Code Challenge**: SHA-256 digest of verifier converted using URL-safe base64 encoding (`S256`).
   - **OAuth State Parameter**: 32-character random string generated and persisted in `sessionStorage` and validated on callback to prevent CSRF attacks.
   - **Zero Client Secrets**: No client secrets are stored in the client codebase, bundle, or transmitted across the wire.
2. **Token Lifecycle & Automatic Refresh**:
   - Access tokens (1-hour lifespan) and refresh tokens stored securely in browser `localStorage`.
   - `getValidAccessToken()` checks expiry with a 60-second safety window and calls Spotify's `/api/token` with `grant_type=refresh_token` to maintain uninterrupted sessions across reloads.
3. **Per-User Isolation**:
   - Data in `localStorage` for Music Inbox, Listening Plans, and Sound Atlas is keyed by user ID (`wvl_music_inbox_${user.id}`, `wvl_listening_plans_${user.id}`, etc.).
   - Switching accounts or logging out prevents cross-user data leakage.
4. **Honest Playback & Diagnostics**:
   - Audio operations invoke real Spotify Connect endpoints (`/v1/me/player/play`, `/pause`, `/next`, `/previous`, `/seek`, `/volume`).
   - Active device detection alerts users when no Spotify app is currently running (`NO_ACTIVE_DEVICE`).
   - Spotify Premium requirements are transparently communicated when direct Web API control is attempted on Free tier accounts.

---

## 6. Verification & Test Results

| Check / Test | Command / Method | Status | Notes |
|:---|:---|:---|:---|
| **Android Build Intact** | Verified file tree & Gradle config | **PASSED** | `base/` unmodified; zero Gradle or Kotlin breakage. |
| **Next.js Production Build**| `npm run build` | **PASSED** | All 10 routes compiled and type-checked cleanly. |
| **Vercel Production Deploy** | `npx vercel --prod --yes` | **PASSED** | Production deployment verified at `https://web-fawn-five-77.vercel.app`. |
| **Live URL Health Check** | `curl -I https://web-fawn-five-77.vercel.app` | **PASSED** | HTTP 200 OK with valid SSR and hydration payload. |
| **PKCE State Validation** | Verified in `spotifyAuth.ts` & `/callback` | **PASSED** | Rejects forged states, verifies SHA-256 verifier. |
| **User Data Isolation** | Inspected user scoping in `storage.ts` | **PASSED** | Keys scoped per `user.id`. |

---

## 7. Spotify Developer Dashboard Setup

To connect live Spotify accounts to WhenVanshListens:
1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Open your registered Spotify App (or click **Create App**).
3. In **Settings -> Redirect URIs**, add both URIs:
   ```text
   https://web-fawn-five-77.vercel.app/callback
   http://localhost:3000/callback
   ```
4. Copy the **Client ID** and either:
   - Enter it in Vercel Project Environment Variables as `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`, OR
   - Enter it in WhenVanshListens Web directly when clicking "Continue with Spotify" via the built-in configuration modal.
5. In **User Management** (if app is in Development Mode in Spotify Dashboard): add the Spotify account emails of any testers you wish to allow to log in. (Once published or extended, any Spotify user can log in).
