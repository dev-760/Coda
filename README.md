# Coda

A music player for React Native and Expo. Coda streams from a third-party HiFi API,
keeps a persistent local library, downloads music for offline playback, and ranks
suggestions on the device from what you actually play.

No accounts, no backend of ours, no analytics. All state lives on the device.

## Features

**Playback**

- Play, pause, seek, next, previous, and a full screen Now Playing view
- Background playback with lock screen and notification controls
- Playback speed (0.75x, 1x, 1.25x, 1.5x, 2x) with pitch correction
- Sleep timer: 15 min, 30 min, 1 hour, or at the end of the current track
- Stream quality: Lossless (24bit/192kHz), High (320 kbps), Normal (160 kbps)
- A track that cannot play is retried once with a fresh URL, then skipped, with a bounded
  skip budget so a broken queue cannot loop forever

**Queue**

- Two tiers: tracks you added on purpose play before the album, playlist, or radio
  context they came from
- Repeat off, repeat all, and repeat one. A manual Next advances even on repeat one
- Shuffle that reorders only what is still ahead and restores the original order when
  switched off
- Previous restarts the track if you are more than 3 seconds in, otherwise goes back
  through history
- Auto-queue appends suggestions when fewer than 3 tracks remain, filling to 10, and the
  setting persists
- Now Playing carries NOW PLAYING, LYRICS and QUEUE as a single tabbed surface

**Library**

- Favorites, playlists, and recently played, all persisted on the device
- Collection splits into Playlists, Albums, Tracks and Downloads
- Search across tracks, artists and albums (see the web limitation below)

**Downloads**

- Streamed to the app's private folder with real progress, so large lossless files do
  not run out of memory
- No storage permission needed on either platform, because files are app-private
- MPEG-DASH streams are fetched segment by segment rather than as one blob
- Concurrency limit of 2, with cancel, retry, and resume after an app restart
- The index is verified on launch and repaired if a file went missing or changed size
- Download quality: Very High (FLAC Lossless 24-bit), High (AAC 320 kbps), Standard
  (AAC 160 kbps)
- A Wi-Fi only option, per-item size, and total storage used
- Downloads screen filters by All / Ready / Downloading
- Offline Mode refuses to silently stream anything that is not downloaded

**Suggestions**

- Scored on the device from play counts, skips, favorites, and recency
- Every suggestion says why it was picked
- A user with no history gets an honest empty state instead of invented picks

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React Native 0.86.3, Expo SDK 57, Expo Router |
| React | 19.3.0 |
| Language | TypeScript `~6.0.3`, `strict: true` |
| State | Zustand 4.5, with `persist` where state must survive a relaunch |
| Audio | expo-audio |
| Files | expo-file-system (the `File` and `Directory` API) |
| Network | expo-network |
| Validation | Zod 3.23 |
| Icons | @expo/vector-icons (Ionicons), via `src/components/ui/Icon.tsx` |
| Fonts | Geist (UI chrome) and Inter (catalog content) |

## Getting started

```bash
npm install
npm start
```

Background playback and lock screen controls need a development build, not Expo Go.
expo-audio does not ship in the Expo Go runtime on every platform, and the Android media
foreground service is added by a config plugin that only applies to a real build.

```bash
npx expo run:ios      # or: npx expo run:android
```

A native rebuild is required after changing `app.config.ts`, since the audio plugin and
the background modes are baked into the native projects.

There is no required environment configuration. `.env.example` documents the only
optional variable (`EXPO_PUBLIC_DISABLE_LOGS`), and `.env` is gitignored. The API base
URL is hardcoded in `src/config/hifiApi.ts`.

### Running it on the web

```bash
npx expo start --web
```

The web target is a partial preview, not a supported platform. See the limitations
section: search is not operable, and the download system fails to initialise.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the bundler |
| `npm run ios` / `npm run android` | Build and run a development build |
| `npm run web` | Expo web target |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Jest |

## Architecture

```
app/                     Expo Router screens
src/audio/               Audio engine: AudioBackend + AudioService + ExpoAudioBackend
src/store/               Zustand stores
src/services/            API client, catalog, suggestions, auto-queue, lyrics
src/downloads/           Download manager, storage, DASH downloader, index repair
src/providers/           Music provider abstraction, zod validation, mappers
src/components/ui/       Shared primitives, tab bar, mini player, icons
src/theme/               Design tokens
src/logging/             Ring-buffer logger and redacting report builder
```

The queue store is the only source of truth for what plays. The audio module plays what
it is told and reports events back. Nothing in `src/audio` decides what comes next, and
nothing in the queue store touches audio, so both sides can be tested on their own.

Track metadata is cached by track id and kept out of the persisted queue entries, so a
queue is a list of small ids rather than a copy of every track.

[Architecture.md](./Architecture.md) covers the layers, the seams, and why they sit
where they do. [handover.md](./handover.md) is the orientation guide, including the traps.

## Tests

```bash
npm test
```

**153 tests across 14 suites**, all pure logic with no rendering: queue insertion and
removal relative to the playhead, repeat modes, shuffle and restore, the download index
and its repair, DASH manifest parsing, the suggestion scoring rules, catalog search,
lyrics parsing, Offline Mode gating, report redaction, the response mappers, the
responsive breakpoints, schema validation, Spotify URL parsing, and the toast store.

The audio backend and the React components are not covered. They need a device, which is
where the remaining risk sits.

## Known limitations

- **The catalog is reached through a hardcoded base URL** in `src/config/hifiApi.ts`.
  There is no API key or environment variable support, and no way to point the app at a
  different host without editing that file.
- **The HiFi API is an unofficial, undocumented third-party proxy** with no published
  contract. Endpoints can change or disappear without notice, and there is no auth, so
  the app has no catalog at all if that service is unreachable. Its response envelopes are
  also inconsistent between endpoints; see [API.md](./API.md).
- **Album and artist screens fetch real data** through `/album/` and `/artist/?f=`. A
  screen opened without an id shows a retry state rather than invented content.
- **The Collection > Albums grid is derived from tracks the user has saved**, because the
  app has no "save album" feature. It cannot show an album the user has not favorited a
  track from.
- **Crossfade and an equalizer were removed.** expo-audio has no equalizer, and crossfade
  could not be made reliable with a single player.
- **Download pause and resume are not exposed in the UI.** Cancel and retry work.
- **Artwork and lyrics are not downloaded** alongside the audio, so Now Playing shows the
  remote cover and fetches lyrics when online.
- **Web target limitations:** Audio downloads are app-private on native file systems and
  disabled on web. Search, browsing, playlist management, queueing, and navigation run
  smoothly on web previews.

## Further reading

| Document | What it covers |
| --- | --- |
| [handover.md](./handover.md) | Orientation, traps, and what is not covered by tests |
| [Architecture.md](./Architecture.md) | Layers, boundaries, and the reasoning behind them |
| [Design.md](./Design.md) | Design tokens, palette, typography, components |
| [API.md](./API.md) | Reverse-engineered HiFi API reference and response envelopes |
| [LICENSE](./LICENSE) | MIT |

`STORAGE_PERMISSION_GUIDE.md` and `PLAYLIST_GUIDE.md` are historical. Storage permission
is no longer requested and playlists are handled by `src/store/libraryStore.ts`.

## License

MIT. See [LICENSE](./LICENSE).