# AUDIT: Luma v4.0.0 Quality & UI/UX Audit

Date: 2026-10-04
Target: Luma v4.0.0 (React Native 0.86 / Expo SDK 57 / Expo Router / TypeScript strict / Zustand 4.5 / expo-audio / expo-file-system)

## 1. Confirmed Known Defects Verification

| ID | Issue | Severity | Status | Findings / Root Cause |
|---|---|---|---|---|
| D-01 | Web: `downloadStorage` throws `this.validatePath is not a function` at init | Blocker | Confirmed | `src/downloads/downloadStorage.ts` calls `new Directory(Paths.document, 'downloads')`. On web (`Platform.OS === 'web'`), `Paths.document` and `Directory` methods like `validatePath` are not supported. Throws on startup in `initializeDownloads()`. |
| D-02 | Web: Error toast full-screen overlay blocks pointer events and navigation | Blocker | Confirmed | While unhandled errors / toasts bubble up, overlays without `pointerEvents="box-none"` or modals intercepting clicks freeze the web preview. |
| D-03 | Web: Explore search field is a `Pressable`, not a real `TextInput` | Blocker | Confirmed | In `app/(tabs)/search.tsx`, landing view renders a `Pressable` that tries to set `isSearching(true)` and focus `inputRef`. On web and direct touch, it is not a direct text input; moreover, clicking it on web fails to provide a seamless search input. |
| D-04 | Explore landing page hardcoded (`CURATIONS`, `GENRES`) with fictional counts | Should-fix | Confirmed | `CURATIONS` lists fictional tracks ("18 Tracks", "1h 42m", etc.) and fake codes. `GENRES` lists sectors 01-08 with tags like "DESTRUCT". Tapping them executes searches, but the counts/durations are completely fabricated. Needs honest query actions or honest categories without invented stats. |
| D-05 | Now Playing displays `-0:00` when idle | Polish | Confirmed | `app/now-playing.tsx`: `remainingMs = durationMs > 0 ? durationMs - positionMs : 0;` renders `'-' + formatMs(remainingMs)` as `-0:00` when idle or duration is 0. Should be `--:--` or empty when idle. |
| D-06 | Splash & native background colour `#090B10` vs theme base `#131316` | Polish | Confirmed | `app.config.ts` has `#090B10` for `backgroundColor`, `android.backgroundColor`, `web.backgroundColor`, and splash screen. Theme base is `#131316`. |
| D-07 | `/settings` registered as both tab href (`TabBar.tsx`) and stack route (`_layout.tsx`) | Should-fix | Confirmed | `app/(tabs)/_layout.tsx` only defines `index`, `library`, `search`. `TabBar.tsx` contains tab entry `/settings`. `_layout.tsx` registers `settings` as a stack screen. Inconsistent tab navigation hierarchy. |
| D-08 | Two API caches with separate constants (`suggestionWeights.ts` vs `catalogService.ts`) | Should-fix | Confirmed | `API_CANDIDATE_TTL_MS` (10m) and `MAX_CACHED_API_CANDIDATES` (30) in `suggestionWeights.ts`; `CACHE_TTL_MS` (5m) and `CACHE_LIMIT` (60) in `catalogService.ts`. Unconsolidated cache config. |
| D-09 | `HI_RES_LOSSLESS` in `AUDIO_QUALITIES` but unreachable from `STREAM_QUALITIES` | Should-fix | Confirmed | `app/settings.tsx` defines `STREAM_QUALITIES` with Lossless, High, Normal (`LOSSLESS`, `HIGH`, `LOW`). `AUDIO_QUALITIES` has `HI_RES_LOSSLESS`, but tests show API returns 422 for unsupported ultra/hi-res. Streaming and downloads use disjoint vocabulary ("Very High" vs "Lossless"). |
| D-10 | Legacy theme aliases (`h1`-`h3`, `titleLg`, `display*`, `mono`, `r.xl`, `COLORS.*`) | Should-fix | Confirmed | Used in `library.tsx`, `search.tsx`, `lyrics.tsx`, `now-playing.tsx`, `queue.tsx`, and playlist modals. |

---

## 2. Code Quality, Linter, & Architectural Findings

| ID | Location | Severity | Problem & Remediation Plan |
|---|---|---|---|
| C-01 | `src/components/discover/MadeForYou.tsx:35, 49` | Blocker | ESLint React Hook Error: Calling `setState` synchronously within effect (`setHistoryVersion` and `setState('loading')`) causes cascading renders. |
| C-02 | `src/components/ui/TrackOptionsMenu.tsx:144, 253` | Blocker | ESLint React Error: Declaring `Row` component inside render function causes state resets on each render. Move `Row` outside component or render directly. |
| C-03 | `src/components/playlist/AddToPlaylistModal.tsx`, `CreatePlaylistModal.tsx`, `Icon.tsx`, `downloadManager.ts`, `theme.ts` | Should-fix | Unused variables (`Playlist`, `error`, `audioService`, `track`, `SUBTLE`) and named import conflicts causing lint failure. |
| C-04 | `src/config/hifiApi.ts` & `src/services/hifiApiClient.ts` | Should-fix | Base URL is hardcoded without fallback to `Constants.expoConfig?.extra?.hifiApiBaseUrl`. Need typed `ApiError` with user-presentable reasons, timeouts, and backoff for idempotent GET requests. |
| C-05 | `src/store/settingsStore.ts` | Should-fix | Missing persist `version` and `migrate`. Needs explicit migration strategy and state hygiene. |
| C-06 | `src/downloads/downloadStorage.ts` & `downloadManager.ts` | Blocker/Should-fix | Guard file system for web (`Platform.OS === 'web'`). Clean up partial `.part` files on failure/cancel. Fix Wi-Fi only check failure recovery and index repair. |
| C-07 | Position ticks & rendering | Should-fix | Scrubber / position updates re-render Now Playing and Queue. Ensure isolated position subscriptions or throttled position updates. |

---

## 3. UI/UX, Anti-Slop, & Design Audit

| ID | Location | Severity | Problem & Remediation Plan |
|---|---|---|---|
| U-01 | `app/(tabs)/index.tsx` (Home) | Should-fix | "Curated series" (`Discover Weekly`, `Release Radar`, `Deep Focus Mono`) are hardcoded filler bento cards without backing feature or data. Replace with real rails (e.g. Recently Played / Favorites / Heavy Rotation). "See all" on Heavy Rotation leads directly to Explore. |
| U-02 | `app/(tabs)/search.tsx` (Explore) | Should-fix | "03 Curations" / "Spatial States" and "Acoustic Taxonomy 8 Sectors" with fictional track counts ("18 Tracks", "2h 11m") and tags ("DESTRUCT", "ECHO"). Replace with clean, functional genre/category browse that triggers genuine catalog searches without fake counts. |
| U-03 | `app/now-playing.tsx` & `Design.md` | Polish | Scrubber documentation mentions "hover thumb" which is not native touch. Replace with thumb on touch/drag. Timecodes need fixed-width tabular numbers (`tabular-nums`) to prevent jitter during playback. |
| U-04 | `app/queue.tsx` | Polish | "CURRENT FREQUENCY", "ON AIR", "1 Sequential". Eyebrow labels overused. Simplify copy to honest, clear terminology ("NOW PLAYING", "UP NEXT"). Ensure distinct tiers (Added by you vs Context queue) are clearly visible. |
| U-05 | `app/(tabs)/library.tsx` | Polish | Offline Mode row: explain clearly what it does ("Only play downloaded tracks") and use explicit state representation beyond tint. |
| U-06 | `app/settings.tsx` | Polish | Storage telemetry displays raw constants if disk space is unavailable. Numbering "01 // SYS" is unnecessary eyebrow decoration. Streamline and ensure real storage figures. Harmonize audio quality options. |
| U-07 | `app/downloads.tsx` | Polish | Hardcoded `#F43F5E` and `#10B981` hex colors. Replace with `colors.error` and `colors.success`. Empty state must give direct actionable guidance ("No downloads yet. Download tracks or albums from your collection or search to listen offline."). |
| U-08 | Hardcoded hex literals in components | Should-fix | Multiple occurrences in `album.tsx` (`#163330`), `artist.tsx` (`#b3b3b3`), `downloads.tsx` (`#F43F5E`, `#10B981`), `CreatePlaylistModal.tsx`, `MiniPlayer.tsx`. Migrate all to `colors` tokens. |

---

## 4. Mobile & Accessibility Audit

| ID | Issue | Severity | Status / Remediation Plan |
|---|---|---|---|
| A-01 | Touch targets | Should-fix | Ensure transport controls, secondary icons, close buttons, and tab items have at least 44x44 pt hit areas with `hitSlop` and visible press feedback (`opacity: 0.7`). |
| A-02 | Tabular numerals | Polish | Add `fontVariant: ['tabular-nums']` to timecodes across Now Playing, Mini Player, and Queue to avoid horizontal jitter as seconds tick. |
| A-03 | Accessibility props | Should-fix | Ensure `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` exist on all interactive elements (tabs, toggles, play/pause, delete, retry). |
| A-04 | Screen clearances | Should-fix | Ensure bottom clearances on lists account for tab bar + mini player + safe area insets on small screens, large phones, and tablets. |

---

## 5. WCAG Contrast Check Summary

- `onSurface` (#FFFFFF) on `background` (#131316): **18.54:1** (Passes AAA)
- `onSurfaceVariant` (#C6C6CF) on `background` (#131316): **10.93:1** (Passes AAA)
- `outlineText` (#C4C7C8) on `background` (#131316): **10.91:1** (Passes AAA)
- `outline` (#8E9192) on `background` (#131316): **5.84:1** (Passes AA)
- `error` (#FFB4AB) on `background` (#131316): **10.92:1** (Passes AAA)
- `success` (#3DA35D) on `background` (#131316): **5.82:1** (Passes AA)
- `onSurface` (#FFFFFF) on `errorContainer` (#DC2626): **4.83:1** (Passes AA)
- `error` (#FFB4AB) on `errorContainer` (#DC2626): **2.84:1** (Fails 4.5:1 for body text -> use `onErrorContainer` or `onSurface` for text over errorContainer).
