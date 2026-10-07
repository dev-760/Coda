# Architecture

How Coda is organised, and why the seams are where they are. Every claim here is
checkable against the source as of this writing.

## 1. Layers

```
+-- app/ ---------------------------------------------------------+
|  Expo Router screens. The live UI.                             |
+-----------------------------+---------------------------------+
                              |
+-- src/store ----------------v-----------------------------------+
|  Zustand stores. Synchronous, read directly by screens.         |
+-----------------------------+---------------------------------+
                              |
        +---------------------+---------------------+
        |                     |                     |
+-- src/audio -------+  +-- src/services +  +-- src/downloads ---+
| AudioService       |  | suggestions   |  | downloadManager   |
|  +-- ExpoAudioBack |  | autoQueue     |  | downloadStorage   |
|                    |  | hifiApiClient |  | dashDownloader    |
+----------+---------+  +-------+-------+  +---------+----------+
           |                    |                    |
+-- src/providers -------------v--------------------v-----------+
|  MusicProvider abstraction, zod validation, mappers            |
+-----------------------------+-----------------------------------+
                              |
                    +---------v---------+
                    | HiFi API (remote) |
                    +-------------------+
```

Screens go through stores and services. They never import the provider layer or an HTTP
client directly.

## 2. Audio

One module owns playback. `AudioService` is the orchestrator; `ExpoAudioBackend` holds
everything platform specific.

```ts
interface AudioBackend {
  init(): Promise<void>
  play(stream: StreamInfo, track: Track): Promise<void>
  pause(): Promise<void>; resume(): Promise<void>; stop(): Promise<void>
  seekTo(positionMs: number): Promise<void>
  getPosition(): Promise<number>; getDuration(): Promise<number>
  setVolume(volume: number): Promise<void>
  setPlaybackRate(rate: number): Promise<void>
  updateMetadata(track: Track): void
  activateMediaSession(track: Track | null): void
  deactivateMediaSession(): void
  preload(stream: StreamInfo): Promise<void>
  dispose(): Promise<void>
  readonly events: AudioBackendEvents
}
```

The backend reports five events: `onTrackEnded`, `onProgress`, `onPauseRequested`,
`onError`, and `onPlayingChanged`. It never decides what plays next. That is the queue
store's job.

`AudioService` owns the conversation in both directions: it asks the queue for the next
entry when a track ends or the user taps Next, and it reports progress and errors into
`playbackStore`.

### Two things worth knowing about the media session

`activateMediaSession` / `deactivateMediaSession` are called **on playback, not at init**.
Registering for the whole app lifetime would put an idle player in the OS media session,
which shows an empty now-playing entry in the lock screen and shade before the user has
played anything.

`onPlayingChanged` exists because when the user presses play or pause on the lock screen,
the native player is the source of truth. The store follows it rather than assuming its
own last write is still correct. This is the fix from commit `c048ac6`.

### Why the queue boundary matters

Repeat-one was broken for a long time because two functions, `moveNext` and
`getNextTrack`, independently decided what "next" meant and disagreed about repeat. They
are now two clearly named paths on the queue store:

- `advanceForTrackEnd()` - natural end. Honours repeat one by replaying in place.
- `advanceForManualNext()` - the Next button. Always advances, even on repeat one.

`AudioService` picks one or the other based on which event arrived, so there is no
branching logic about repeat mode left in the audio layer.

### expo-audio specifics

- `setAudioModeAsync` is called with `playsInSilentMode`, `shouldPlayInBackground`, and
  `interruptionMode: 'doNotMix'`. The last one is required; without it the OS does not
  associate lock screen controls with the player.
- expo-audio reports **seconds**. Every other boundary in the app uses milliseconds, so
  the conversion happens in `ExpoAudioBackend` and nowhere else.
- Lock screen metadata is pushed with `updateLockScreenMetadata` on every track change.
- The `expo-audio` config plugin in `app.config.ts` adds the Android media foreground
  service. It only applies to a real build, not Expo Go.
- Track end is inferred from the progress poll. Some stream formats never report a
  duration, so completion is detected as playback stopped near a known duration. An
  `endReported` flag makes that event fire at most once per playback.

## 3. Queue

The model follows MusicKit: entries, not tracks.

```ts
interface QueueEntry {
  entryId: string   // unique, so the same track can appear twice
  trackId: string
  source: 'user' | 'context' | 'suggestion'
}
```

Track metadata lives in a module-level cache keyed by track id, not inside the entries,
so persisting the queue stores a list of small ids rather than a copy of every track.

Two tiers, ordered by insertion position rather than by an explicit priority field:

- `source: 'user'` is what the user added on purpose. `playNext` inserts at the front of
  this tier, `addToQueue` at the end.
- `source: 'context'` and `'suggestion'` are everything else, and play after the user
  tier.

Reorder is restricted to the user tier, which is what the queue screen actually renders.

### Persistence

Version 3, under the AsyncStorage key `coda-queue-storage`.

`partialize` persists `entries`, `currentIndex`, `repeat`, `context`, and the
**serialised track cache**. The cache is persisted deliberately: entries alone are ids,
and losing the metadata stops playback entirely on a restored queue.

Shuffle is forced to `false` and excluded, because a shuffled order cannot survive a
reload and would otherwise silently become a permanent shuffle.

`migrate` rebuilds a v2 queue, which stored full tracks in a single tier, into the entry
model, so an existing queue survives the upgrade.

## 4. Suggestions

A scoring engine on the device. No server, no ML service.

`listeningStore` records, per track: play count, completed plays, skips under 30 seconds,
and last played time. It is persisted and capped at `MAX_TRACK_STATS` (2000) tracks.

`scoreTrack` is a weighted sum. Every weight lives in `suggestionWeights.ts` with a
comment saying what it does:

- artist and album affinity from completed plays
- a favorite boost
- a recency multiplier with a half life, so a play from a year ago barely counts
- a penalty per skip
- a penalty for anything played very recently

`applyDiversity` then guarantees no more than two consecutive entries from one artist.

The candidate pool is always local (favorites, playlists, completed downloads) and
additionally the API when online. Offline, only the local pool is used. API candidates
are cached with a TTL and cleared through `clearSuggestionCache`.

**A track scoring zero or below is dropped.** That is what keeps a user with no history
from seeing fabricated suggestions: the honest answer is an empty list.
`hasEnoughHistoryForSuggestions` lets the UI tell the two cases apart.

Every suggestion carries a reason the user can check: `From your favorites`,
`Because you play <artist>`, `Sounds like <track>`, `More from <artist>`, or
`New for you`.

## 5. Downloads

`downloadManager` orchestrates, `downloadStorage` persists the index and repairs it,
`connectivity` gates Wi-Fi only downloads, and `dashDownloader` handles segmented
streams.

- Files go to the app-private document directory, so no storage permission is needed on
  either platform. The Android `WRITE_EXTERNAL_STORAGE` request and its modal are gone,
  and `STORAGE_PERMISSION_GUIDE.md` is now historical only.
- Concurrency is capped at `maxConcurrentDownloads: 2`. Over-limit items stay `pending`
  and start as slots free.
- A 100 MB free-space floor is checked before starting. A lossless track is tens of
  megabytes, so 100 MB is safer than the old 10 MB guess.
- Stream URLs expire, so a fresh one is resolved at the start of every attempt.
- `repairIndex` runs on launch. A completed entry whose file is gone or whose size no
  longer matches is dropped; an interrupted entry goes back to `pending`.
- The file extension comes from the response MIME type via `EXTENSION_BY_MIME`, not from
  an assumption about quality.
- MPEG-DASH URLs (`.mpd`, `dash+xml`) route to `dashDownloader`, which parses the MPD
  initialisation segment and media template and fetches segments in order. This was the
  fix from commit `2bcd459`.
- Playback resolves the local file first and only then asks the provider.
- Offline Mode (Collection screen) gates that fallback: with it on, a track with no
  downloaded copy is refused with a named error instead of silently streaming. The
  refusal reason is passed through to the player, so the message says which track needs
  downloading rather than a generic "could not be played".

## 6. Connectivity

`connectivity.ts` wraps `expo-network` and exposes a subscribe function. The home screen
shows an offline banner and routes unplayable tracks to a clear message rather than
letting them fail silently.

## 7. Error handling

`hifiApiClient` treats a 202 as a queued request and polls for the result. Polling is
bounded on both attempt count and total time (90 s), with a delay that grows by doubling
from the initial value and honours a `Retry-After` header. An external `AbortSignal` is
wired into the internal `AbortController` rather than discarded, which previously threw
away the request timeout.

`catalogService` never throws. Every lookup returns `null` or an empty array, because
every caller needs to render an empty state rather than an error boundary.

Caching lives in two places with two different lifetimes: `catalogService` keeps
`CACHE_LIMIT` 60 entries for `CACHE_TTL_MS` (5 min), and the suggestion engine keeps up
to `MAX_CACHED_API_CANDIDATES` (30) for `API_CANDIDATE_TTL_MS` (10 min) - the latter
defined in `suggestionWeights.ts`, which is an odd home for a network cache constant.

`AudioService` retries once with a freshly resolved URL when a failure looks transient
(timeout, 403, 404, network). A second failure marks the track unplayable and skips it.
After `MAX_CONSECUTIVE_SKIPS` (3) consecutive skips playback stops, so a broken queue
cannot loop forever.

## 8. Diagnostics

`Logger` keeps a ring buffer of entries. `ReportBuilder` assembles a report and shares it
as JSON. Redaction walks the message and the structured data, because signed stream URLs
carry tokens.

The version comes from `package.json` through `src/version.ts`, so the shipped build and
the diagnostic report agree.

## 9. Navigation

Four tabs - Home, Explore, Collection, Settings - plus a docked mini player in
`app/(tabs)/_layout.tsx`. The rest are card-presented stack routes: `now-playing`,
`queue`, `album`, `artist`, `settings`, `lyrics`, `downloads`.

Collection splits into four sub-tabs - Playlists, Albums, Tracks, Downloads - rendered as
in-page segmented controls rather than nested routes.

Now Playing carries three tabs of its own (NOW PLAYING, LYRICS, QUEUE) on a single route.

One wart to be aware of: `/settings` is both a tab href in `TabBar.tsx` and a
`Stack.Screen`. `Settings` is rendered by the stack, not as a real tab screen, so the tab
bar entry pushes onto the stack rather than switching tabs. Worth cleaning up if you
touch navigation.

The Explore landing page is not wired to the API. `CURATIONS` and `GENRES` in
`app/(tabs)/search.tsx` are literal constants; real search runs only after a query is
submitted. The first-run discovery rail therefore shows sample content with fabricated
track counts. This is deliberate-looking but undocumented, and it contradicts commit
`07b9c46`'s intent of building the discovery pool from real queries.

## 10. Dead code

Removed during the last pass, each confirmed by grep for importers:

| Removed | Why |
| --- | --- |
| `src/store/authStore.ts`, `src/store/suggestionsStore.ts` | never imported |
| `src/api/coreClient.ts`, `src/http/client.ts` | only used by the above |
| `src/hooks/*` | no importers (note: `useResponsive.ts` has since been **re-added** and is used) |
| `src/utils/platform.ts`, `src/utils/responsive.ts` | no importers (superseded by `src/hooks/useResponsive.ts`) |
| `src/components/downloads/DownloadPermissionModal.tsx` | private directory needs no permission |
| `ExpoAudioBackend` (old stub) | threw in every method; replaced |
| `TrackPlayerBackend.ts`, `playbackService.ts` | replaced by expo-audio |
| `recommendationsService` on Home | replaced by the suggestion engine; still used by search |
| `app/(tabs)/feed.tsx`, `app/(tabs)/live.tsx` | rendered a hardcoded notification and "Live & Uploads" list |
| Collection > Videos / Profiles / Purchases | menu rows that always showed "No items found" |

Unused dependencies were removed together with the lockfile entries:
`react-native-track-player`, `axios`, `expo-document-picker`, `expo-web-browser`,
`jszip`, `quickjs-emscripten`, `react-native-quick-crypto`,
`react-native-nitro-modules`, and `patch-package`.

`src/utils/formatting.ts` and `src/utils/validation.ts` are still used;
`validation.ts` is the zod boundary in front of the provider layer.

## 11. Platform support

The web target renders every screen, but two subsystems do not work there. Both were
observed by running `npx expo start --web` on 2026-10-04.

**`expo-file-system` is not implemented on web.** `downloadStorage` builds
`new Directory(Paths.document, 'downloads')`, and the web shim has no `validatePath`, so
`DownloadManager.initialize` throws a `TypeError` on every launch. The error is caught in
`downloadStore` and surfaced as a toast rather than crashing. The download manager,
storage and `dashDownloader` are therefore effectively native-only. If web support for
downloads is ever wanted, guard the `Directory` construction on `Platform.OS`.

**The search field is a `Pressable`, not a `TextInput`.** On web that renders no
`<input>`, so Explore search cannot be focused or typed into. Native is unaffected.

**The web error toast is full-screen and intercepts pointer events**, which blocks the tab
bar underneath it. Any browser automation has to navigate by URL until that is fixed.

Neither of these is covered by tests, because there are no rendering tests and no
platform matrix in CI.

## 12. Testing

**153 tests across 14 suites**, all pure logic, no rendering. `npm test` is green.

| Suite | Covers |
| --- | --- |
| `store/queueStore` | two tier insertion, removal before/at/after the playhead, repeat off/all/one for both natural end and manual next, shuffle and restore, previous, reorder guards, duplicate entries |
| `downloads/downloadManager` | index round trip, progress from bytes, status transitions, index repair for missing and mismatched files, deletion |
| `downloads/dashDownloader` | MPD parsing, segment planning |
| `services/suggestionEngine` | empty history, scoring order, favorite boost, skip penalty, recency decay, dedupe, diversity, offline pool, candidate sources, reason strings |
| `services/catalogSearch` | catalog query construction and response handling |
| `services/lyricsParser` | lyrics payload parsing |
| `audio/offlineMode` | Offline Mode gating of the local-file fallback |
| `logging/ReportBuilder` | redaction of URLs in message and data |
| `providers/mappers` | response envelope and field mapping |
| `providers/streamInfo` | stream info normalisation |
| `utils/useResponsive` | responsive breakpoints |
| `utils/validation` | schema validation and error type |
| `services/spotifyImportService` | Spotify URL parsing for playlist import |
| `store/toastStore` | toast show, replace, and dismiss |

The audio backend and the React components are not covered. They need a device, which is
where the remaining risk sits.