# Luma

A music player for React Native and Expo. Luma streams from a third-party HiFi API,
keeps a persistent local library, downloads music for offline playback, and ranks
suggestions on the device from what you actually play.

No accounts, no backend of ours, no analytics. All state lives on the device.

## Features

**Playback**

- Play, pause, seek, next, previous, and a full screen Now Playing view
- Background playback with lock screen and notification controls
- Playback speed from 0.75x to 2x with pitch correction
- Sleep timer, by duration or at the end of the current track
- Stream quality selection (lossless, high, data saver)

**Queue**

- Two tiers: tracks you added on purpose play before the album, playlist, or radio
  context they came from
- Repeat off, repeat all, and repeat one. A manual Next advances even on repeat one
- Shuffle that reorders only what is still ahead and restores the original order when
  switched off
- Previous restarts the track if you are more than 3 seconds in, otherwise goes back
  through history
- Auto-queue appends suggestions when the queue runs low, and the setting persists
- A track that cannot play is retried once, then skipped, with a bounded skip budget

**Library**

- Favorites, playlists, and recently played, all persisted on the device
- Search across tracks, artists, albums, and playlists

**Downloads**

- Streamed to the app's private folder with real progress, so large lossless files do
  not run out of memory
- Concurrency limit of 2, with cancel, retry, and resume after an app restart
- The index is verified on launch and repaired if a file went missing
- Downloaded music plays in airplane mode
- Download quality, a Wi-Fi only option, per-item size, and total storage used

**Suggestions**

- Scored on the device from play counts, skips, favorites, and recency
- Every suggestion says why it was picked
- A user with no history gets an honest empty state instead of invented picks

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React Native 0.86.3, Expo SDK 57, Expo Router |
| React | 19.3.0 |
| Language | TypeScript, `strict: true` |
| State | Zustand, with `persist` where state must survive a relaunch |
| Audio | expo-audio |
| Files | expo-file-system (the `File` and `Directory` API) |
| Network | expo-network |
| Validation | Zod |

## Getting started

```bash
npm install
npm start
```

Background playback and lock screen controls need a development build, not Expo Go.
expo-audio does not ship in the Expo Go runtime on every platform, and the Android
media foreground service is added by a config plugin that only applies to a real build.

```bash
npx expo run:ios      # or: npx expo run:android
```

A native rebuild is required after changing `app.config.ts`, since the audio plugin and
the background modes are baked into the native projects.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the bundler |
| `npm run ios` / `npm run android` | Build and run a development build |
| `npm run web` | Expo web target |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Jest |

## Architecture

```
app/                     Expo Router screens
src/audio/               Audio engine: ExpoAudioBackend + AudioService
src/store/               Zustand stores
src/services/            API client, suggestions, auto-queue, connectivity
src/downloads/           Download manager, storage, index repair
src/providers/           Music provider abstraction and validation
```

The queue store is the only source of truth for what plays. The audio module plays what
it is told and reports events back. Nothing in `src/audio` decides what comes next, and
nothing in the queue store touches audio, so both sides can be tested on their own.

Track metadata is cached by track id and kept out of the persisted queue entries, so a
queue is a list of small ids rather than a copy of every track.

## Testing

```bash
npm test
```

96 tests across 7 suites, all covering pure logic: queue insertion and removal relative
to the playhead, repeat modes, shuffle and restore, the download index and its repair,
the suggestion scoring rules, the responsive breakpoints, and the API response mappers.

## Known limitations

- The catalog endpoints are reached through a hardcoded HiFi API base URL. There is no
  API key or environment variable support yet.
- The HiFi API is an unofficial, undocumented third-party proxy with no published
  contract. Endpoints can change or disappear without notice, and there is no auth, so
  the app has no catalog at all if that service is unreachable.
- Album and artist screens fetch real data through `/album/` and `/artist/?f=`. A screen
  opened without an id (a deep link, or a stale route) shows a retry state rather than
  invented content.
- The Collection > Albums grid is derived from tracks the user has saved, because the app
  has no "save album" feature yet. It cannot show an album the user has not favorited a
  track from.
- Crossfade and an equalizer were removed. expo-audio has no equalizer, and crossfade
  could not be made reliable with a single player.
- Download pause and resume are not exposed in the UI. Cancel and retry work.
- Artwork and lyrics are not downloaded alongside the audio, so Now Playing shows the
  remote cover and fetches lyrics when online.
- The web target builds through Expo Router. It is not a port of the app and has not
  been reviewed.

## License

MIT. See [LICENSE](./LICENSE).