# Architecture

How Luma is organised, and why the seams are where they are. Every claim here is
checkable against the source as of this writing.

## 1. Layers

```
┌─ app/ ───────────────────────────────────────────────────┐
│  Expo Router screens. The live UI.                       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌─ src/store ───────────────▼─────────────────────────────┐
│  Zustand stores. Synchronous, read directly by screens. │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌─ src/audio ────────┐ ┌─ src/services ┐ ┌─ src/downloads ─┐
│ AudioService       │ │ suggestions  │ │ downloadManager  │
│  └─ ExpoAudioBackend│ │ autoQueue    │ │ downloadStorage  │
│                    │ │ hifiApiClient│ │ connectivity     │
└─────────┬──────────┘ └──────┬───────┘ └────────┬─────────┘
          │                   │                  │
┌─ src/providers ─────────────▼──────────────────▼─────────┐
│  MusicProvider abstraction, zod validation, mappers      │
└───────────────────────────┬─────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │ HiFi API (remote) │
                  └───────────────────┘
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
  preload(stream: StreamInfo): Promise<void>
  dispose(): Promise<void>
  readonly events: AudioBackendEvents
}
```

The backend reports four events: `onTrackEnded`, `onProgress`, `onPauseRequested`, and
`onError`. It never decides what plays next. That is the queue store's job.

`AudioService` owns the conversation in both directions: it asks the queue for the next
entry when a track ends or the user taps Next, and it reports progress and errors into
`playbackStore`.

### Why the boundary matters

Repeat-one was broken for a long time because two functions, `moveNext` and
`getNextTrack`, independently decided what "next" meant and disagreed about repeat. They
are now two clearly named paths on the queue store:

- `advanceForTrackEnd()` — natural end. Honors repeat one by replaying in place.
- `advanceForManualNext()` — the Next button. Always advances, even on repeat one.

`AudioService` picks one or the other based on which event arrived, so there is no
branching logic about repeat mode left in the audio layer.

### expo-audio specifics

- `setAudioModeAsync` is called with `playsInSilentMode`, `shouldPlayInBackground`, and
  `interruptionMode: 'doNotMix'`. The last one is required; without it the OS does not
  associate lock screen controls with the player.
- expo-audio reports seconds. Every other boundary in the app uses milliseconds, so the
  conversion happens in `ExpoAudioBackend` and nowhere else.
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

Version 3. `partialize` excludes the shuffle snapshot, because a shuffled order cannot
survive a reload and would silently become a permanent shuffle. `migrate` rebuilds a v2
queue, which stored full tracks in a single tier, into the entry model, so an existing
queue survives the upgrade.

## 4. Suggestions

A scoring engine on the device. No server, no ML service.

`listeningStore` records, per track: play count, completed plays, skips under 30 seconds,
and last played time. It is persisted and capped at 2000 tracks.

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
are cached with a 10 minute TTL.

A track scoring zero or below is dropped. That is what keeps a user with no history from
seeing fabricated suggestions: the honest answer is an empty list.

Every suggestion carries a reason the user can check, either `From your favorites` or
`Because you play <artist>`.

## 5. Downloads

`downloadManager` orchestrates, `downloadStorage` persists the index and repairs it,
`connectivity` gates Wi-Fi only downloads.

- Files go to the app-private document directory, so no storage permission is needed on
  either platform. The Android `WRITE_EXTERNAL_STORAGE` request and its modal are gone.
- Downloads stream through `File.downloadFileAsync`. The previous implementation read the
  entire response into memory and converted it to base64 with a spread over a typed
  array, which overflows the call stack on any real lossless file.
- Concurrency is capped at 2. Over-limit items stay `pending` and start as slots free.
- Stream URLs expire, so a fresh one is resolved at the start of every attempt.
- `repairIndex` runs on launch. A completed entry whose file is gone or whose size no
  longer matches is dropped, and an interrupted entry goes back to `pending`.
- The file extension comes from the response, not from an assumption about quality.
- Playback resolves the local file first and only then asks the provider.

## 6. Connectivity

`connectivity.ts` wraps `expo-network` and exposes a subscribe function. The home screen
shows an offline banner and routes unplayable tracks to a clear message rather than
letting them fail silently.

## 7. Error handling

`hifiApiClient` treats a 202 as a queued request and polls for the result. Polling is
bounded on both attempt count (15) and total time (90 seconds), with a delay that grows
from 2 seconds to a 10 second cap. An external `AbortSignal` now cancels the request
rather than being discarded, which previously threw away the request timeout.

`AudioService.playAttempt` retries once with a freshly resolved URL when a failure looks
transient (timeout, 403, 404, network). A second failure marks the track unplayable and
skips it. After 3 consecutive skips the queue stops, so a broken queue cannot loop
forever.

## 8. Diagnostics

`Logger` keeps a ring buffer of 500 entries. `ReportBuilder` assembles a report and
shares it as JSON. Redaction walks the message and the structured data, because signed
stream URLs carry tokens.

The version comes from `package.json` through `src/version.ts`. `app.config.ts` reads the
same value, so the shipped build and the diagnostic report agree.

## 9. Dead code

Removed during the last pass, each confirmed by grep for importers:

| Removed | Why |
| --- | --- |
| `src/store/authStore.ts`, `src/store/suggestionsStore.ts` | never imported |
| `src/api/coreClient.ts`, `src/http/client.ts` | only used by the above |
| `src/hooks/*` | no importers |
| `src/utils/platform.ts`, `src/utils/responsive.ts` | no importers |
| `src/components/downloads/DownloadPermissionModal.tsx` | private directory needs no permission |
| `ExpoAudioBackend` (old stub) | threw in every method; replaced |
| `TrackPlayerBackend.ts`, `playbackService.ts` | replaced by expo-audio |
| `recommendationsService` on Home | replaced by the suggestion engine; still used by search |
| `app/(tabs)/feed.tsx`, `app/(tabs)/live.tsx` | rendered a hardcoded notification and "Live & Uploads" list; removed from the navigation |
| Collection > Videos / Profiles / Purchases | menu rows that always showed "No items found"; never had a data source |

Unused dependencies were removed together with the lockfile entries: `react-native-track-player`,
`axios`, `expo-document-picker`, `expo-web-browser`, `jszip`, `quickjs-emscripten`,
`react-native-quick-crypto`, `react-native-nitro-modules`, and `patch-package`.

`src/utils/formatting.ts` and `src/utils/validation.ts` are still used; `validation.ts`
is the zod boundary in front of the provider layer.

## 10. Testing

67 tests, all pure logic, no rendering.

| Suite | Covers |
| --- | --- |
| `store/queueStore` | two tier insertion, removal before/at/after the playhead, repeat off/all/one for both natural end and manual next, shuffle and restore, previous, reorder guards, duplicate entries |
| `downloads/downloadManager` | index round trip, progress from bytes, status transitions, index repair for missing and mismatched files, deletion |
| `services/suggestionEngine` | empty history, scoring order, favorite boost, skip penalty, recency decay, dedupe, diversity, offline pool, candidate sources, reason strings |
| `logging/ReportBuilder` | redaction of URLs in message and data |
| `utils/validation` | schema validation and error type |

The audio backend and the React components are not covered. They need a device, which is
where the remaining risk sits.