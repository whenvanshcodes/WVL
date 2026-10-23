# WhenVanshListens — Implementation Report

**Project**: WhenVanshListens (Short Name: WhenVansh)  
**Platform**: Android (Min SDK 29, Target SDK 36, Compile SDK 37)  
**Language / Architecture**: Kotlin, Jetpack Compose, Material 3, Coroutines, Flow, Atomic JSON Local Persistence  
**Date**: October 2026  
**Status**: Implemented & Verified  

---

## 1. Initial Codebase Audit Summary

The starting point was the **Myspoti** codebase—an Android client that embeds Spotify's official Web Player in a background headless WebView host (`MyspotiRuntime` / `player-bridge.js`) while rendering a native Jetpack Compose Material 3 UI on top.

### Key Architectural Layers:
- `:api`: Pure Kotlin interfaces for music entity models and streaming operations.
- `:api-spotify`: Spotify Web Player API bridge, GraphQL catalog retrieval, and session interceptors.
- `:host-android`: Android WebView container, `PlaybackService` (MediaSession / MediaBrowserServiceCompat), lockscreen controls, and system notification manager.
- `:app`: Jetpack Compose UI, ViewModels, navigation graph, local caching, and Android home-screen widget.

### Pre-existing State:
- Real Spotify playback and OAuth authentication existed and worked via Spotify Web Player.
- Local storage pattern: Atomic file writes (`.tmp` -> rename) with `JSONObject` / `SnapshotStateList` in `context.filesDir` (e.g. `LocalPlaylists.kt`, `ListenHistory.kt`).
- Theming was styled around Spotify green (`#1DB954` / `#1ED760`) with mixed dark surfaces.

---

## 2. Branding and Design System Transformation

### A. Brand Identity
- **Full Name**: WhenVanshListens
- **Short Name**: WhenVansh
- **Launcher Mark**: Custom VB acoustic waveform vector identity (`ic_launcher_foreground.xml`, `ic_launcher_monochrome.xml`, `splash_icon.xml`).
- **Application ID & Package**: Kept safe (`app.myspoti.engine` namespace with debug suffix `.dev` and release IDs) to avoid breaking Android permissions, keystore signing, and external redirect schemes.
- **Labels**: Manifest placeholders updated to `WhenVanshListens` (production), `WhenVansh Beta` (beta channel), and `WhenVansh dev` (debug channel).

### B. Design Tokens (AMOLED Pure Black & Electric Blue)
- **Background**: True AMOLED pure black (`#000000`)
- **Primary Surface**: Near-black (`#0A0A0D`)
- **Elevated Surface**: (`#111116`)
- **Primary Accent**: Electric Blue (`#3B82F6`)
- **Brighter Interactive Accent**: (`#60A5FA`)
- **Text Primary**: (`#F8FAFC`)
- **Text Secondary**: (`#94A3B8`)
- **Borders & Separators**: (`#1E293B`)
- All green branding accents replaced in the app's controls, theme, bottom navigation, and widgets.

---

## 3. Newly Implemented Features

### Feature 1: Music Inbox
- **Location**: `com.music.spotui.data.local.MusicInbox.kt` & `com.music.spotui.ui.screens.InboxScreen.kt`
- **Native Android Share Handling**: Registered `android.intent.action.SEND` with `text/plain` on `MainActivity`. URLs and text shared from browsers, Spotify, YouTube, Instagram, or social apps land in `MainActivity.handle()` and are stored in Music Inbox.
- **URL Normalization & Duplicate Detection**:
  - Automatically extracts HTTP/HTTPS URLs from freeform shared text.
  - Strips tracking parameters (`si`, `utm_source`, `utm_medium`, `feature`, etc.).
  - Extracts canonical Spotify URIs (`spotify:track:...`, `spotify:album:...`, `spotify:playlist:...`).
  - Detects duplicate links based on normalized URLs or Spotify URIs.
- **Status Lifecycle**: `To Listen`, `Listening`, `Completed`, `Archived`.
- **Note Support**: Add, edit, and view user notes per inbox item.
- **Actions**:
  - Direct Play (via Spotify playback engine for Spotify items).
  - Open in external browser / target app.
  - Add to Listening Plan.
  - Delete with Undo Snackbar.
- **Persistence**: Atomic local JSON persistence in `context.filesDir/music_inbox.json`.

### Feature 2: Listening Plans
- **Location**: `com.music.spotui.data.local.ListeningPlans.kt`, `ListeningPlansScreen.kt`, & `PlanDetailScreen.kt`
- **Purpose**: Intentional listening goals (e.g. "Albums to hear this month", "Explore artist discography") without streaks or guilt reminders.
- **Functionality**:
  - Create and edit custom Listening Plans (Name, Description).
  - Add tracks, albums, or playlists to plans.
  - Individual item completion toggling with instant visual feedback (strikethrough, completion timestamp).
  - Progress tracking: dynamically computes total items, completed items, and progress percentage.
  - Direct playback resumption from items in the plan.
  - Manual completion fallback ensuring no simulated or fake progress statistics.
- **Persistence**: Atomic local JSON persistence in `context.filesDir/listening_plans.json`.

### Feature 3: Sound Atlas
- **Location**: `com.music.spotui.data.local.SoundAtlas.kt` & `com.music.spotui.ui.screens.SoundAtlasScreen.kt`
- **Purpose**: Visual exploration of music relationships (Artist ↔ Album ↔ Track) using verified metadata.
- **Functionality**:
  - Navigable 2D relationship graph rendered on Compose Canvas.
  - Pan & Zoom gestures supported via `detectTransformGestures`.
  - Node hit-testing via `detectTapGestures`.
  - Entity Detail Card upon selection: displays title, entity type, and direct actions.
  - Interactive Actions:
    - **Play**: Initiates playback via `MyspotiRuntime.api.player.play()`.
    - **Expand**: Discovers connected releases and tracks.
    - **Save to Plan**: Directly adds the node entity to an active Listening Plan.
    - **View**: Navigates to the native Artist or Album screen.
  - Search bar to seed and anchor the graph on any artist or album.
  - Auto-seeding from currently playing track or recently played history.

### Feature 4: Integration Across Core Surfaces
- **Home Screen Dashboard**: Added `WhenVanshFeatureHub` banner cards on `HomeScreen.kt` providing 1-tap access to Inbox, Plans, and Atlas.
- **Now Playing / Track Options**: Added "Save to Music Inbox" and "Add to Listening Plan" to `SongOptionsSheet.kt` (available from the player and all song context menus).
- **Navigation Host**: Registered `Routes.Inbox`, `Routes.ListeningPlans`, `plan_detail/{planId}`, and `Routes.SoundAtlas` in `MyNavHost.kt`.
- **Settings Screen**: Added "WHENVANSH DATA & PRIVACY" section with data metrics and clear actions for Inbox and Plans.
- **Android Widget**: Polished `NowPlayingWidget` with AMOLED background (`#0A0A0D`), electric-blue accent border, and fallback branding.

---

## 4. Advertising & Third-Party Integration Audit

- **Ad SDK Audit**: Zero advertising SDKs (AdMob, Unity Ads, AppLovin, Facebook Audience Network, etc.) exist in the dependency catalog or build files.
- **Pre-existing Upstream Ad Handling**: The upstream codebase switches off audio and video ad breaks via headless Web Player script injection (`player-bridge.js`).
- **Compatibility Risk**: Third-party Spotify Web Player APIs require a standard Spotify account. Free accounts can encounter server-side rate limits or restrictions imposed by Spotify's web player infrastructure.
- **Integrity Guarantee**: Antigravity has not introduced any new ad-skipping or circumvention exploits, nor introduced any tracking or monetization SDKs.

---

## 5. Persistence & Data Privacy

- **100% Local On-Device**: All Music Inbox items, Listening Plans, and Sound Atlas graph states are stored exclusively in private application sandbox storage (`context.filesDir`).
- **No Analytics / Telemetry**: No user data, URLs, or notes are transmitted to any third-party analytics service.
- **Atomic File Operations**: All file operations write to a temporary `.tmp` file before renaming to prevent data corruption during process kill or power loss.

---

## 6. Build and Verification Summary

| Component / Task | Result | Notes |
|---|---|---|
| `:api-spotify:test` | **PASS** | 7 tasks executed, baseline tests pass |
| `:app:compileDebugKotlin` | **PASS** | Kotlin 2.1.10 / Compose compiler passed |
| `:app:testDebugUnitTest` | **PASS** | All baseline and new unit tests pass |
| `MusicInboxTest` | **PASS** | Normalization, duplicates, JSON roundtrip |
| `ListeningPlansTest` | **PASS** | Creation, completion progress, JSON roundtrip |
| `SoundAtlasTest` | **PASS** | Seed generation, node expansion |
| `assembleDebug` | **PASS** | `base/app/build/outputs/apk/debug/app-debug.apk` (100.9 MB) |

---

## 7. Known Limitations & Next Steps

1. **Third-Party Spotify Web Player**: Requires an active network connection and valid Spotify login on initial launch.
2. **Metadata Resolution for Non-Spotify URLs**: Generic web links (e.g. YouTube, SoundCloud) remain fully saveable and openable in the browser; deep audio playback within the app requires a matched Spotify URI.
3. **Manual Verification on Device**: Connect an Android device via USB, run `./gradlew.bat installDebug`, and test sharing a link from Spotify or YouTube via the Android Share sheet.
