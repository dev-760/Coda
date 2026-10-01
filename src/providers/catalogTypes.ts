/**
 * Catalog entities beyond a single Track: artists, albums and their art.
 *
 * These carry the IDs the API needs. `Track` deliberately does not, so a
 * screen that received a Track alone cannot fetch its album or artist — the
 * fields required to do so live here.
 */

export interface CatalogArtist {
  id: string;
  name: string;
  /** Artist portrait, already resolved to a URL. Null when the API omits it. */
  picture: string | null;
  /** Opaque upstream mix uuid, usable with /mix/. Null when unavailable. */
  mixId: string | null;
  popularity: number;
}

export interface CatalogAlbum {
  id: string;
  title: string;
  artist: string;
  artistId: string | null;
  cover: string | null;
  releaseDate: string | null;
  numberOfTracks: number;
  type: string;
  explicit: boolean;
}

export interface CatalogTrackList {
  album: CatalogAlbum;
  tracks: import('./types').Track[];
}