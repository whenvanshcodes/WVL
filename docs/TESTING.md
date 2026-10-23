# WhenVanshListens — Testing and Verification Guide

This document provides step-by-step instructions for building, running unit tests, and verifying **WhenVanshListens** on an Android device or emulator.

---

## 1. Prerequisites

- **OS**: Windows, macOS, or Linux
- **JDK**: Java 17 or Java 21 (Gradle toolchains automatically download Azul JDK 21 if not present)
- **Android SDK**: Build-Tools 36.0.0, Platform SDK 37 (installed under Android SDK root)
- **Gradle**: Wrapper provided in repository (`gradlew.bat` on Windows, `./gradlew` on Unix)

---

## 2. Running Unit Tests

Run the full unit test suite from the repository `base` directory:

```bash
cd myspoti-main/base
.\gradlew.bat testDebugUnitTest
```

### Specific Feature Test Suites:
- **Music Inbox Tests**:
  ```bash
  .\gradlew.bat :app:testDebugUnitTest --tests com.music.spotui.data.local.MusicInboxTest
  ```
  *Verifies: URL extraction from text, removal of tracking parameters (`si`, `utm_source`), duplicate link detection, status transitions, JSON serialization.*

- **Listening Plans Tests**:
  ```bash
  .\gradlew.bat :app:testDebugUnitTest --tests com.music.spotui.data.local.ListeningPlansTest
  ```
  *Verifies: Plan creation, item additions, progress percentages, manual completion toggle, JSON serialization.*

- **Sound Atlas Tests**:
  ```bash
  .\gradlew.bat :app:testDebugUnitTest --tests com.music.spotui.data.local.SoundAtlasTest
  ```
  *Verifies: Entity seed generation, node creation, relationship edge mapping, node expansion.*

---

## 3. Building the Application

### Build Debug APK:
```bash
cd myspoti-main/base
.\gradlew.bat assembleDebug
```
Output location:
`base/app/build/outputs/apk/debug/app-debug.apk`

---

## 4. Manual On-Device Smoke Test Checklist

### A. Branding & Visual Design
1. Open the application.
2. Confirm the app icon shows the electric-blue **VB waveform** on pure AMOLED black background.
3. Confirm the launch screen and welcome header show **WhenVanshListens**.
4. Confirm true black `#000000` AMOLED surfaces with electric-blue `#3B82F6` accents across navigation tabs and buttons.

### B. Music Inbox
1. Open any browser or the Spotify/YouTube app.
2. Tap **Share** -> Choose **WhenVanshListens**.
3. Verify the link is captured and toast notification appears: *"Saved to Music Inbox"*.
4. Open the app -> Tap **Inbox** on Home dashboard.
5. Verify the item is listed under **To Listen**.
6. Tap the status badge and change to **Listening** or **Completed**.
7. Tap the item's options -> **Edit Note** -> Enter a note -> Confirm it persists.
8. Delete an item and tap **Undo** to verify restoration.

### C. Listening Plans
1. On Home dashboard, tap **Plans** -> Tap **+**.
2. Enter plan name *"Albums to hear this month"*, description *"Deep listening"*, and save.
3. Tap on the created plan to open the detail view.
4. Tap **+** -> Add an album title (e.g. *"Abbey Road"*).
5. Toggle the completion checkmark -> Verify progress bar updates dynamically.
6. Return to Home -> Verify progress percentage is reflected on the plan card.

### D. Sound Atlas
1. On Home dashboard, tap **Atlas**.
2. Verify the 2D relationship graph renders on the Canvas.
3. Test pan (drag with finger) and zoom (pinch to zoom).
4. Tap on any node -> Verify the bottom entity card appears.
5. Tap **Expand** -> Verify related releases and tracks branch out.
6. Tap **Save** -> Verify entity is added to an active Listening Plan.

### E. Now Playing Integration
1. Play any song.
2. Open Now Playing -> Tap the menu button (`⋮`).
3. Confirm *"Save to Music Inbox"* and *"Add to Listening Plan"* appear and perform their actions.
