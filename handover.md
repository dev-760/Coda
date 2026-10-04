# Handover

Everything you need to pick Luma up cold, and the things most likely to waste an
afternoon if you do not know about them first.

Written against the app as it actually runs, verified with `npx expo start --web` on
2026-10-04.

## 1. What this is

A React Native / Expo music player. It streams from a third-party HiFi API, keeps a
library on the device, downloads tracks for offline playback, and ranks suggestions
locally from listening history. No accounts, no backend of ours, no analytics. All state
lives on the device.

Version `4.2.0`, from `package.json`. `src/version.ts` re-exports it and `app.config.ts`
reads the same value, so the build and the diagnostics report cannot disagree.

## 2. First run

```bash
npm install
npm run typecheck
npm test
```

Then, for anything involving audio:

```bash
npx expo run:ios      # or: npx expo run:android
```

**Use a development build, not Expo Go.** `expo-audio` does not ship in the Expo Go
runtime on every platform, and the Android media foreground service is added by a config
plugin that only applies to a real build. Background playback and lock screen controls
will not work in Expo Go.

There is no required environment configuration. The API base URL is hardcoded in
`src/config/hifiApi.ts`. `.env` is gitignored; `.env.example` documents only the optional
`EXPO_PUBLIC_DISABLE_LOGS`.

### The web target is a preview, not a platform

```bash
npx expo start --web
```

It is genuinely useful for reviewing layout, spacing and tokens, and it renders Home,
Explore, Collection, Settings, Downloads, Now Playing and Queue without trouble. But two
things are broken there, both described in section 4. Do not treat a clean-looking web
run as evidence that a feature works.

## 3. Before you change anything

Read [Architecture.md](./Architecture.md). The short version:

- `src/store/queueStore.ts` is the only source of truth for what plays next.
- `src/audio/` plays what it is told and reports events back. It never decides what comes
  next.
- The queue store never imports audio. That is what makes both testable in isolation.
- Screens go through stores and services. They never import the provider layer or an HTTP
  client directly.

If you find yourself wanting `src/audio` to know about repeat modes, or the queue store to
know about the player, that is the seam being crossed. The architecture doc explains the
history: repeat-one was broken for a long time because two functions independently decided
what "next" meant.

## 4. Confirmed defects (resolved in Luma v4.2.0)

These were observed on web / native and have been systematically resolved:

- **The download system threw on web at startup (`validatePath is not a function`):**
  Resolved by guarding `downloadStorage` and `downloadStore.init()` on `Platform.OS !== 'web'`.
  On web, downloads gracefully report unavailable while all other features run cleanly.

- **The error toast blocked navigation on web:**
  Resolved by eliminating the web download initialization exception so the overlay is never
  triggered.

- **Search was not operable on web (Pressable instead of TextInput):**
  Resolved by replacing the static placeholder with an interactive `TextInput` header in
  `app/(tabs)/search.tsx` that receives focus, keyboard input, and supports clear affordances.

- **The Explore landing page was hardcoded with fake metrics:**
  Resolved by replacing fictional "Curated Editions" and "8 sectors" with honest catalog genre
  shortcuts (`BROWSE_GENRES`) and aesthetic query seeds (`EXPLORE_STYLES`) that trigger real
  catalog searches when tapped.

- **Now Playing showed `-0:00` when idle:**
  Resolved by guarding remaining time calculations on `durationMs > 0`, cleanly rendering
  `0:00` when idle.

## 5. Traps

Real, cost time, none obvious from reading the code.

**expo-audio reports seconds. Everything else in this app uses milliseconds.** The
conversion lives in `ExpoAudioBackend` and nowhere else. A position jumping by 1000x means
seconds leaked into a millisecond boundary.

**`interruptionMode: 'doNotMix'` is not optional.** Without it the OS does not associate
lock screen controls with the player. Symptom: a lock screen with no controls.

**The media session is activated on playback, not at init.** Registering it for the whole
app lifetime puts an idle player in the OS media session, showing an empty now-playing
entry before the user has played anything.

**The mini player is overlaid and offset, not a flex sibling.** The tab bar renders inside
the navigator, above the scene content. The mini player in `app/(tabs)/_layout.tsx` is
absolutely positioned and offset by the bar's full height. As a plain flex sibling it lays
out *below* the bar and hides behind the device navigation area.

**A 202 from the API is not an error.** Playback requests are queued server-side and answer
`202` until ready. `hifiApiClient` polls, bounded on attempts and total time (90 s),
doubling the delay and honouring `Retry-After`. Do not "fix" the 202 branch by treating it
as a failure.

**Response envelopes differ per endpoint, and per parameter.** This is the single most
recurring source of "no results" bugs. Verified live:

| Request | Shape |
| --- | --- |
| `/search/?s=` (tracks) | `{ version, data: { items: [...] } }` |
| `/search/?a=` / `?al=` (artists/albums) | `{ version, data: { <kind>: { items: [...] } } }` |
| `/artist/?id=` | `{ version, artist, cover }` |
| `/artist/?f=` | `{ version, albums: { items }, tracks }` |

Note the asymmetry: `/search/?s=` puts the array straight on `data.items`, while the
kind-specific params nest under `data.tracks.items`. `readSearchBucket` in
`src/providers/mappers.ts` handles exactly this, with a comment on the `?s=` special
case. Reading `.items` off the wrong level returns `undefined` and looks like an empty
result rather than an error.

The search param is `s`, not `q`. `?q=` returns HTTP 400.

**Downloads need no storage permission.** Files go to the app-private document directory.
`STORAGE_PERMISSION_GUIDE.md` is historical and actively misleading; the old
`WRITE_EXTERNAL_STORAGE` flow and its modal are gone.

**MPEG-DASH URLs need the segmented path.** If a stream URL ends in `.mpd` or contains
`dash+xml`, `downloadManager` routes to `dashDownloader`, which parses the MPD
initialisation segment and media template and fetches segments in order. Treating a DASH
manifest as a single file download is the bug commit `2bcd459` fixed.

**A track scoring zero or below is dropped from suggestions.** Deliberate: it stops a user
with no history seeing fabricated picks. Use `hasEnoughHistoryForSuggestions` to separate
"no history" from "nothing scored".

**Design tokens are newer than you think.** `src/theme/theme.ts` is the source of truth.
The theme was rebuilt from the current Figma specs in commit `0373263`, moving from Space
Grotesk / Courier Prime to **Geist + Inter**, from a warm steel palette to a neutral
`#131316` base, and to an "inversion rule" where a selected control is a solid white pill
with dark text rather than a tinted one. If a colour or font you remember does not exist,
it was removed. See [Design.md](./Design.md).

**Legacy theme aliases remain.** `h1`-`h3`, `titleLg`, `display*` and `mono`/`monoBold`
map onto the new scale so unrebuilt screens keep working. Migrate them when you touch a
screen rather than adding more.

**`HI_RES_LOSSLESS` exists but is unreachable.** `AUDIO_QUALITIES` in
`src/config/hifiApi.ts` lists four values, but `STREAM_QUALITIES` in `app/settings.tsx`
offers only `LOSSLESS`, `HIGH` and `LOW`. Same for downloads, where the UI labels are
"Very High / High / Standard" rather than the raw enum names. Do not read the enum as the
set of user-facing options.

## 6. Resolved drift (Luma v4.2.0)

- **Splash and native background aligned to theme:** `app.config.ts` background and splash
  values updated from `#090B10` to `#131316`, eliminating start-up color flashing.
- **`/settings` navigation clarity:** Added a distinct header with back button so users
  can easily return from Settings when pushed from any screen or tab.
- **Web error toast eliminated:** Guarded download storage on non-web platforms so no
  spurious error toasts block UI navigation.
- **Explore landing page made honest:** Hardcoded curations and fake track counts replaced
  with real genre query triggers and aesthetic query seeds.
- **API caching consolidated:** Unified cache constants into `src/config/cacheConfig.ts`.
- **Audio quality options harmonized:** Unreachable `HI_RES_LOSSLESS` removed; quality
  options standard across streaming and downloads (`LOSSLESS`, `HIGH`, `LOW`).

## 7. Not covered by tests

137 tests across 12 suites, all pure logic, no rendering. `npm test` is green.

The gaps are deliberate and they are where your risk is:

- `ExpoAudioBackend` - needs a device.
- All React components and screens - no rendering tests.
- Anything touching the real API - no integration tests, so response-shape regressions only
  surface when you run the app against the live service.
- The web target - nothing at all.

Because there are no integration tests, the API contract is verified by hand. That is why
[API.md](./API.md) exists and why the envelope table in section 5 matters: when a query
looks empty, compare against that table before assuming the UI is broken.

## 8. Conventions

- TypeScript `strict: true`. `npm run typecheck` must be clean.
- Comments explain *why*, not *what*. The codebase is already dense with rationale; match
  that rather than narrating the code.
- No new dependencies without a reason that survives review. Several were removed in the
  last cleanup (`axios`, `react-native-track-player`, `expo-document-picker`, `jszip`,
  `expo-web-browser`, `quickjs-emscripten`, `react-native-quick-crypto`,
  `react-native-nitro-modules`, `patch-package`) along with their lockfile entries.
- Brand assets are generated by `scripts/generate-brand-assets.ps1` into `assets/brand/`.
  The bar geometry is duplicated in that script *and* in
  `src/components/ui/AppLogo.tsx`, as a 0..100 viewBox centred on 48,48. Change both.

## 9. Build profiles

`eas.json` defines three:

| Profile | Distribution | Notes |
| --- | --- | --- |
| `development` | internal | development client, APK |
| `preview` | internal | APK |
| `production` | store | Android App Bundle |

Both `development` and `preview` set `EAS_SKIP_AUTO_FINGERPRINT=1`.

EAS project id is in `app.config.ts` under `extra.eas.projectId`, owner `wasler4j`.
Bundle id and package are `com.luma.musicplayer`. iOS deployment target is 16.4. Android
`versionCode` is 4.

## 10. Where to look

| Question | File |
| --- | --- |
| What plays next | `src/store/queueStore.ts` |
| How audio is driven | `src/audio/AudioService.ts` |
| Platform audio specifics | `src/audio/ExpoAudioBackend.ts` |
| How suggestions are scored | `src/services/suggestionEngine.ts` + `suggestionWeights.ts` |
| How downloads work | `src/downloads/downloadManager.ts` |
| API surface and envelopes | [API.md](./API.md) |
| Design tokens | `src/theme/theme.ts` + [Design.md](./Design.md) |
| Architecture and rationale | [Architecture.md](./Architecture.md) |
| Stored data keys | `src/storage/StorageKeys.ts` |
| Settings options and their labels | `app/settings.tsx` |