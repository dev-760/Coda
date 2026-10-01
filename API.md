# Hifi API — Reference (generated from client source)

> **Status: unofficial, undocumented upstream.** This reference was reverse-engineered from
> `src/services/hifiApiClient.ts`, `src/services/catalogService.ts`, and
> `src/config/hifiApi.ts`, and verified against the live service (version 2.10).
> The upstream service (`hifi-api00.vercel.app`, repo `binimum/hifi-api`) is a
> third-party proxy with no published contract — any endpoint can change or disappear
> without notice. Field shapes below reflect what the mappers in
> `src/providers/mappers.ts` read; anything not listed there is passed through as
> `unknown`.

## Connection

| | |
|---|---|
| Base URL | `https://hifi-api00.vercel.app` |
| Upstream repo | `https://github.com/binimum/hifi-api` |
| Auth | None observed in client requests |
| Timeout | 30 s |
| Content type | `application/json` |

## Response envelopes

The service is **not consistent** about envelopes. This is verified per endpoint and is
the single most common source of "no results" bugs — reading `.items` off a response
returns `undefined` because the array lives one or two levels deeper.

| Endpoint | Envelope |
|---|---|
| `/info/`, `/album/`, `/search/`, `/recommendations/`, `/playlist/` | `{ version, data }` |
| `/artist/?id=` | `{ version, artist, cover }` |
| `/artist/?f=` | `{ version, albums: { items }, tracks: [...] }` |
| `/cover/` | `{ version, covers }` |

`/search/` additionally nests by kind: `data.tracks`, `data.artists`, `data.albums`,
`data.playlists`, `data.videos`, `data.genres`, `data.topHits`.

List entries come in three shapes and must be unwrapped defensively:
bare objects, `{ item, type }` (album tracks) and `{ track, sources }` (recommendations).

`src/providers/mappers.ts` handles all of this; screens never touch raw responses.

## Track payload (as mapped by `mapHifiApiTrack`)

```jsonc
{
  "id": "123456789",              // string | number
  "title": "Song Title",
  "artist": "Name" | { "name": "Name" },
  "album": "Title" | { "title": "Title", "cover": "cover-uuid" },
  "coverUrl": "https://...",      // optional explicit cover
  "duration": 237                 // seconds (mapped to durationMs = duration * 1000)
}
```

Wrapped payloads (`{ "item": { ...track } }`) are unwrapped automatically.
Cover images resolve through the Tidal CDN: `https://resources.tidal.com/images/{uuid-with-dashes-replaced-by-slashes}/320x320.jpg`.

List responses carry an `items` array.

## Endpoints

### Metadata & search

| Method | Path | Params | Notes |
|---|---|---|---|
| GET | `/info/` | `id` (track id) | Track metadata |
| GET | `/search/` | `s` / `a` / `al` / `v` / `p` / `i` + `limit` | Search tracks / artists / albums / videos / playlists / by ISRC |
| GET | `/album/` | `id` | Album with items |
| GET | `/album/similar/` | `id` (+`limit`) | Similar albums |
| GET | `/artist/` | `id` (+`limit`) | Artist detail |
| GET | `/artist/similar/` | `id` (+`limit`) | Similar artists |
| GET | `/playlist/` | `id`, `limit` | Playlist with items |
| GET | `/mix/` | `id` | Mix (uuid) |
| GET | `/recommendations/` | `id` (track id) | Track-based recommendations — the only personalization signal |
| GET | `/cover/` | `id` (track id) or `q` (query) | Cover art lookup |
| GET | `/lyrics/` | `id` (track id) | Lyrics (synced/unverified — client passes through) |
| GET | `/topvideos/` | `countryCode`, `locale`, `deviceType`, `limit`, `offset` | Chart videos |

### Playback

| Method | Path | Params | Notes |
|---|---|---|---|
| GET | `/track/` | `id`, `quality` (`LOSSLESS`, `HIGH`, `LOW`, `HI_RES_LOSSLESS`) | Stream manifest/URL. **May return HTTP 202** with `requestId` — poll `GET /playback/requests/{requestId}` every ~2 s (max 15 tries) until it resolves to the payload |
| DELETE | `/playback/requests/{requestId}` | — | Cancel a pending async request |
| GET | `/trackManifests/` | track ids | Batch manifests |
| GET | `/video/` | `id`, `quality`, `url` | Video stream |

### DRM & downloads (used by `src/downloads/` + `hifiApiClient`)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/widevine` | `{ challenge }` | Widevine license request |

Plus client-side download helpers (`downloadTrack`, `getStreamUrl`) that fetch `/track/` and write to disk via expo-file-system.

## Known gaps / honesty notes

- **No artist/album-id on Track**: the app's `Track` type carries album *title* only, so
  `/album/similar/` and `/artist/similar/` cannot be called from a queue context. The
  Discover screen leaves those shelves empty rather than faking them.
- **No personalization beyond track id**: the API exposes no skip-history, time-of-day,
  or taste-profile signals. "Daily Mix"-style features must be derived locally from
  `libraryStore` history.
- **Lyrics availability is unverified**: `/lyrics/` exists; whether it returns data for
  most tracks must be confirmed on device.
- **Undocumented response fields** pass through as `unknown`; the zod mapper drops any
  track lacking at minimum `id` + `title`.
