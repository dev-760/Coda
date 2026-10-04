import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { audioService } from '../../src/audio/AudioService';
import Icon from '../../src/components/ui/Icon';
import CoverThumb from '../../src/components/ui/CoverThumb';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import { useResponsive } from '../../src/hooks/useResponsive';
import { CatalogAlbum, CatalogArtist } from '../../src/providers/catalogTypes';
import { Track } from '../../src/providers/types';
import { recommendationsService } from '../../src/services/recommendationsService';
import { useLibraryStore } from '../../src/store/libraryStore';
import { cacheTracks, useQueueStore } from '../../src/store/queueStore';
import { colors, FONTS, r, t } from '../../src/theme/theme';

/**
 * Explore is three surfaces: a browse landing page, live suggestions while the
 * user types, and committed results.
 *
 * Browsing and searching are kept visually distinct so the landing page reads
 * as a front door to curation rather than a search box with buttons under it.
 */

/** Curated editions shown on the landing page. */

/**
 * Genre tiles for the taxonomy grid. Each carries the small taxonomy label set
 * above its name, and the sector number it is filed under.
 */
const GENRES = [
  { sector: '01', tag: 'RHYTHM', name: 'ELECTRONIC & CLUB' },
  { sector: '02', tag: 'SPACE', name: 'DARK AMBIENT & DRONE' },
  { sector: '03', tag: 'ACOUSTIC', name: 'MODERN CLASSICAL' },
  { sector: '04', tag: 'RAW', name: 'POST-PUNK & INDUSTRIAL' },
  { sector: '05', tag: 'ECHO', name: 'DUB TECHNO' },
  { sector: '06', tag: 'DESTRUCT', name: 'EXPERIMENTAL & GLITCH' },
  { sector: '07', tag: 'ORGANIC', name: 'FIELD RECORDINGS' },
  { sector: '08', tag: 'SHADOW', name: 'JAZZ NOIR' },
] as const;

/** Curated editorial entries. */
const CURATIONS = [
  {
    id: 'spatial-states',
    code: 'ARCH.01',
    title: 'Late Night Architecture',
    blurb: 'Skeletal sub-bass textures & cold reverbs designed for empty steel...',
    count: '18 Tracks',
    runtime: '1h 42m',
    seed: 'Late Night Architecture',
  },
  {
    id: 'transit',
    code: 'TRANSIT.09',
    title: 'Cold Winter Corridor',
    blurb: 'Glacial drones, rhythmic pulses and muted sub-zero fields.',
    count: '24 Tracks',
    runtime: '2h 11m',
    seed: 'Cold Winter Corridor',
  },
  {
    id: 'descent',
    code: 'DESC.14',
    title: 'Descent Into Static',
    blurb: 'Slow-burn noise, bowed metal and degraded tape loops.',
    count: '12 Tracks',
    runtime: '58m',
    seed: 'Descent Into Static',
  },
] as const;

type SearchTab = 'Top' | 'Tracks' | 'Artists' | 'Albums';

interface Results {
  tracks: Track[];
  artists: CatalogArtist[];
  albums: CatalogAlbum[];
}

const EMPTY_RESULTS: Results = { tracks: [], artists: [], albums: [] };
const SEARCH_PLACEHOLDER = 'Artists, songs, albums or podcasts';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Per-tab counts, shown on the filter pills so an empty tab is explained. */
function countLabel(tab: SearchTab, results: Results): string {
  switch (tab) {
    case 'Tracks':
      return String(results.tracks.length);
    case 'Artists':
      return String(results.artists.length);
    case 'Albums':
      return String(results.albums.length);
    default:
      return '';
  }
}

export default function SearchScreen() {
  const router = useRouter();
  const { bottomBarClearance } = useResponsive();
  const inputRef = useRef<TextInput>(null);
  const { searchHistory, addToSearchHistory } = useLibraryStore();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('Top');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);
  const [results, setResults] = useState<Results>(EMPTY_RESULTS);

  useEffect(() => {
    const term = query.trim();
    let active = true;

    if (!term) {
      // Deferred so this is not a synchronous setState in the effect body.
      const timer = setTimeout(() => {
        if (!active) return;
        setResults(EMPTY_RESULTS);
        setLoading(false);
        setError(null);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await recommendationsService.searchMulti(term, controller.signal);
        if (!active) return;
        setResults(data);
      } catch {
        // An aborted request was superseded by a newer term, so it must not
        // surface as a failure to the user.
        if (active && !controller.signal.aborted) {
          setResults(EMPTY_RESULTS);
          setError('Search failed. Check your connection and try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
      // Cancels the in-flight request so a fast typist does not keep every
      // superseded term's responses alive on the connection.
      controller.abort();
    };
  }, [query]);

  const handleSubmitSearch = (searchTerm?: string) => {
    const term = (searchTerm || query).trim();
    if (term) {
      addToSearchHistory(term);
      setHasSubmitted(true);
    }
  };

  const handleCancelSearch = () => {
    setQuery('');
    setIsSearching(false);
    setHasSubmitted(false);
    inputRef.current?.blur();
  };

  /**
   * Re-runs the current query. The debounce keys off `query`, so the term is
   * nudged through an empty value to restart it, then restored.
   */
  const handleRetry = () => {
    const term = query.trim();
    if (!term) return;
    setQuery('');
    setTimeout(() => setQuery(term), 0);
  };

  /** Runs a term straight from the browse page, skipping the type-then-submit. */
  const runSearch = (term: string) => {
    setQuery(term);
    setIsSearching(false);
    setHasSubmitted(true);
    addToSearchHistory(term);
  };

  const playOne = (track: Track) => {
    cacheTracks([track]);
    useQueueStore.getState().playContext([track], 0, {
      type: 'search',
      name: query.trim() || 'Explore',
    });
    void audioService.playTrack(track);
  };

  const playMany = (tracks: Track[]) => {
    if (tracks.length === 0) return;
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, 0, {
      type: 'search',
      name: query.trim() || 'Explore',
    });
    void audioService.playTrack(tracks[0]);
  };

  const openAlbum = (album: CatalogAlbum) => {
    router.push({
      pathname: '/album' as any,
      params: {
        albumId: album.id,
        title: album.title,
        artist: album.artist,
        artistId: album.artistId ?? '',
        coverUrl: album.cover ?? '',
      },
    });
  };

  const openArtist = (artist: CatalogArtist) => {
    router.push({
      pathname: '/artist' as any,
      params: { artistId: artist.id, name: artist.name, coverUrl: artist.picture ?? '' },
    });
  };

  const showTracks = activeTab === 'Top' || activeTab === 'Tracks';
  const showArtists = activeTab === 'Top' || activeTab === 'Artists';
  const showAlbums = activeTab === 'Top' || activeTab === 'Albums';
  const hasAnyResults =
    results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0;
  const hasLiveResults = hasAnyResults && query.trim().length > 0;

  /** Explains why a tab that has no rows is on screen. */
  const emptyTabCopy: Record<SearchTab, string> = {
    Top: 'No results for this search. Try another spelling or a different term.',
    Tracks: 'No matching tracks.',
    Artists: 'No matching artists.',
    Albums: 'No matching albums.',
  };

  /** Browse landing page. */
  const renderLanding = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.pageTitle}>Explore</Text>

      <Pressable
        style={s.searchBar}
        onPress={() => {
          setIsSearching(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        accessibilityRole="search"
        accessibilityLabel={SEARCH_PLACEHOLDER}
      >
        <Icon name="search" size={18} color={colors.outlineText} />
        <Text style={s.searchPlaceholder} numberOfLines={1}>
          {SEARCH_PLACEHOLDER}
        </Text>
      </Pressable>

      {/* Curated editions */}
      <View style={s.block}>
        <View style={s.blockHeader}>
          <View style={s.blockHeaderText}>
            <Text style={s.blockLabel}>CURATED EDITIONS</Text>
            <Text style={s.blockTitle}>Spatial States</Text>
          </View>
          <Text style={s.blockCount}>
            {String(CURATIONS.length).padStart(2, '0')} Curations
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.rail}
        >
          {CURATIONS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => runSearch(item.seed)}
              style={({ pressed }) => [s.curationCard, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.count}`}
            >
              <View style={s.curationArtWrap}>
                <View style={s.curationArtFallback}>
                  <Text style={s.curationCode}>{item.code}</Text>
                </View>
                <View style={s.curationCodeBadge}>
                  <Text style={s.curationCodeBadgeText}>{item.code}</Text>
                </View>
              </View>
              <Text style={s.curationTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={s.curationBlurb} numberOfLines={2}>{item.blurb}</Text>
              <View style={s.curationFooter}>
                <Text style={s.curationMeta}>
                  {item.count} • {item.runtime}
                </Text>
                <View style={s.curationPlay}>
                  <Icon name="play" size={12} color={colors.onPrimary} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Genre taxonomy grid */}
      <View style={s.block}>
        <View style={s.blockHeader}>
          <View style={s.blockHeaderText}>
            <Text style={s.blockLabel}>ACOUSTIC TAXONOMY</Text>
            <Text style={s.blockTitle}>Browse Genres</Text>
          </View>
          <Text style={s.blockCount}>{GENRES.length} Sectors</Text>
        </View>

        <View style={s.genreGrid}>
          {GENRES.map((genre) => (
            <Pressable
              key={genre.sector}
              onPress={() => runSearch(genre.name)}
              style={({ pressed }) => [s.genreTile, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${genre.name}`}
            >
              <View style={s.genreTop}>
                <Text style={s.genreSector}>{genre.sector}</Text>
                <Icon name="arrow-up-outline" size={14} color={colors.outlineText} />
              </View>
              <Text style={s.genreTag}>{genre.tag}</Text>
              <Text style={s.genreName} numberOfLines={2}>{genre.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  /** Live search, before the user commits a term. */
  const renderSuggestions = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.searchInputRow}>
        <View style={s.inputBox}>
          <Icon name="search" size={18} color={colors.outlineText} />
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={colors.outlineText}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSubmitSearch()}
            returnKeyType="search"
            autoFocus
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Icon name="close-circle" size={18} color={colors.outline} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={handleCancelSearch} hitSlop={8} accessibilityLabel="Cancel search">
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={colors.onSurface} style={s.loader} />}

      {!loading && !hasLiveResults && searchHistory.length > 0 && (
        <View style={s.block}>
          <Text style={s.blockLabel}>RECENT</Text>
          <View style={s.tagWrap}>
            {searchHistory.map((item) => (
              <Pressable
                key={item}
                onPress={() => runSearch(item)}
                style={({ pressed }) => [s.tag, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${item} again`}
              >
                <Text style={s.tagText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Every kind is listed so the three live requests are all visible. */}
      {hasLiveResults && (
        <View style={s.block}>
          <Text style={s.blockLabel}>TOP RESULTS</Text>
          {results.artists.slice(0, 2).map((artist) => (
            <Pressable
              key={`a_${artist.id}`}
              onPress={() => openArtist(artist)}
              style={({ pressed }) => [s.resultRow, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`View artist ${artist.name}`}
            >
              {artist.picture ? (
                <Image source={{ uri: artist.picture }} style={s.resultArtCircle} />
              ) : (
                <View style={[s.resultArtCircle, s.artFallback]}>
                  <Icon name="person" size={16} color={colors.outlineText} />
                </View>
              )}
              <Text style={s.resultText} numberOfLines={1}>{artist.name}</Text>
              <Icon name="chevron-forward" size={16} color={colors.outline} />
            </Pressable>
          ))}

          {results.tracks.slice(0, 3).map((track) => (
            <Pressable
              key={`t_${track.id}`}
              onPress={() => {
                playOne(track);
                handleSubmitSearch();
              }}
              style={({ pressed }) => [s.resultRow, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Play ${track.title} by ${track.artist}`}
            >
              <CoverThumb uri={track.coverUrl} size={44} borderRadius={r.sm} style={s.resultArt} />
              <View style={s.resultMeta}>
                <Text style={s.resultText} numberOfLines={1}>{track.title}</Text>
                <Text style={s.resultSub} numberOfLines={1}>{track.artist}</Text>
              </View>
              <Icon name="play" size={14} color={colors.onSurface} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );

  /** Committed search results, with per-kind tabs. */
  const renderResults = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.searchInputRow}>
        <Pressable
          onPress={() => setHasSubmitted(false)}
          style={s.circleBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to explore"
        >
          <Icon name="chevron-back" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={s.inputBox}>
          <Icon name="search" size={18} color={colors.outlineText} />
          <TextInput
            style={s.input}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (!text.trim()) setHasSubmitted(false);
            }}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={colors.outlineText}
            onSubmitEditing={() => handleSubmitSearch()}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable
              onPress={() => {
                setQuery('');
                setHasSubmitted(false);
              }}
              hitSlop={10}
              accessibilityLabel="Clear search"
            >
              <Icon name="close-circle" size={18} color={colors.outline} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {(['Top', 'Tracks', 'Artists', 'Albums'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = countLabel(tab, results);
          return (
            <Pressable
              key={tab}
              style={[s.tabPill, isActive && s.tabPillActive]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={count ? `${tab}, ${count} results` : tab}
            >
              <Text style={[s.tabPillText, isActive && s.tabPillTextActive]}>{tab}</Text>
              {!!count && <Text style={s.tabPillCount}>{count}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && <ActivityIndicator color={colors.onSurface} style={s.loader} />}

      {error ? (
        <View style={s.stateBlock}>
          <Icon name="cloud-offline-outline" size={24} color={colors.outlineText} />
          <Text style={s.stateText}>{error}</Text>
          <Pressable style={s.stateAction} onPress={handleRetry} accessibilityRole="button">
            <Text style={s.stateActionText}>Try again</Text>
          </Pressable>
        </View>
      ) : !loading && !hasAnyResults ? (
        <View style={s.stateBlock}>
          <Icon name="search" size={24} color={colors.outline} />
          <Text style={s.stateText}>{emptyTabCopy[activeTab]}</Text>
        </View>
      ) : (
        <>
          {showTracks && results.tracks.length > 0 && (
            <View style={s.block}>
              <View style={s.blockHeader}>
                <Text style={s.blockTitle}>Tracks</Text>
                <Pressable
                  onPress={() => playMany(results.tracks)}
                  style={({ pressed }) => [s.inlineAction, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Play all search tracks"
                >
                  <Icon name="play" size={14} color={colors.onSurface} />
                  <Text style={s.blockCount}>Play all</Text>
                </Pressable>
              </View>
              {results.tracks.map((track) => (
                <View key={track.id} style={s.resultRow}>
                  <Pressable
                    onPress={() => playOne(track)}
                    onLongPress={() => setOptionsTrack(track)}
                    style={({ pressed }) => [s.resultMain, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${track.title} by ${track.artist}`}
                  >
                    <CoverThumb
                      uri={track.coverUrl}
                      size={48}
                      borderRadius={r.sm}
                      style={s.resultArt}
                    />
                    <View style={s.resultMeta}>
                      <Text style={s.resultText} numberOfLines={1}>{track.title}</Text>
                      <Text style={s.resultSub} numberOfLines={1}>
                        {track.artist}
                        {track.album ? ` • ${track.album}` : ''}
                        {track.durationMs ? ` • ${formatDuration(track.durationMs)}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setOptionsTrack(track)}
                    hitSlop={8}
                    style={s.rowMore}
                    accessibilityLabel={`More options for ${track.title}`}
                  >
                    <Icon name="ellipsis-horizontal" size={16} color={colors.outlineText} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {showArtists && results.artists.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>Artists</Text>
              {results.artists.map((artist) => (
                <Pressable
                  key={artist.id}
                  onPress={() => openArtist(artist)}
                  style={({ pressed }) => [s.resultRow, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`View artist ${artist.name}`}
                >
                  {artist.picture ? (
                    <Image source={{ uri: artist.picture }} style={s.resultArtCircle} />
                  ) : (
                    <View style={[s.resultArtCircle, s.artFallback]}>
                      <Icon name="person" size={16} color={colors.outlineText} />
                    </View>
                  )}
                  <Text style={s.resultText} numberOfLines={1}>{artist.name}</Text>
                  <Icon name="chevron-forward" size={16} color={colors.outline} />
                </Pressable>
              ))}
            </View>
          )}

          {showAlbums && results.albums.length > 0 && (
            <View style={s.block}>
              <Text style={s.blockTitle}>Albums</Text>
              {results.albums.map((album) => (
                <Pressable
                  key={album.id}
                  onPress={() => openAlbum(album)}
                  style={({ pressed }) => [s.resultRow, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open album ${album.title} by ${album.artist}`}
                >
                  {album.cover ? (
                    <Image source={{ uri: album.cover }} style={s.resultArt} />
                  ) : (
                    <View style={[s.resultArt, s.artFallback]}>
                      <Icon name="albums-outline" size={16} color={colors.outlineText} />
                    </View>
                  )}
                  <View style={s.resultMeta}>
                    <Text style={s.resultText} numberOfLines={1}>{album.title}</Text>
                    <Text style={s.resultSub} numberOfLines={1}>{album.artist}</Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color={colors.outline} />
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {!isSearching && !hasSubmitted && renderLanding()}
      {isSearching && !hasSubmitted && renderSuggestions()}
      {hasSubmitted && renderResults()}

      <TrackOptionsMenu
        visible={!!optionsTrack}
        track={optionsTrack}
        onClose={() => setOptionsTrack(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
      paddingTop: 16,
    gap: 24,
  },

  pageTitle: {
    ...t.display,
    color: colors.onSurface,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  searchPlaceholder: {
    ...t.body,
    flex: 1,
    color: colors.outlineText,
  },

  rail: {
    gap: 8,
    paddingRight: 16,
  },

  block: {
    gap: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockHeaderText: {
    gap: 2,
  },
  blockLabel: {
    ...t.labelSm,
    color: colors.outlineText,
  },
  blockTitle: {
    ...t.title,
    color: colors.onSurface,
  },
  blockCount: {
    ...t.labelSm,
    color: colors.outlineText,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },

  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    height: 32,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  tagText: {
    ...t.labelMd,
    color: colors.onSurface,
  },

  curationCard: {
    width: 250,
    padding: 12,
    gap: 6,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  curationArtWrap: {
    position: 'relative',
    height: 140,
    borderRadius: r.md,
    overflow: 'hidden',
  },
  curationArtFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  curationCode: {
    ...t.mono,
    color: colors.outlineText,
  },
  curationCodeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    height: 20,
    justifyContent: 'center',
    borderRadius: r.sm,
    backgroundColor: 'rgba(14, 14, 17, 0.85)',
  },
  curationCodeBadgeText: {
    ...t.micro,
    color: colors.onSurface,
  },
  curationTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  curationBlurb: {
    ...t.bodySm,
    color: colors.outlineText,
    lineHeight: 16,
  },
  curationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  curationMeta: {
    ...t.micro,
    color: colors.outlineText,
  },
  curationPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onSurface,
  },

  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreTile: {
    width: '48%',
    minHeight: 130,
    padding: 14,
    gap: 4,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  genreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  genreSector: {
    ...t.labelSm,
    color: colors.outlineText,
  },
  genreTag: {
    ...t.labelSm,
    color: colors.outlineText,
  },
  genreName: {
    ...t.titleMd,
    color: colors.onSurface,
  },

  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
  },
  cancelText: {
    ...t.labelMd,
    color: colors.onSurfaceVariant,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },

  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 16,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  tabPillActive: {
    backgroundColor: colors.onSurface,
  },
  tabPillText: {
    ...t.labelMd,
    color: colors.onSurfaceVariant,
  },
  tabPillTextActive: {
    color: colors.onPrimary,
  },
  tabPillCount: {
    ...t.micro,
    color: colors.outlineText,
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: r.md,
    backgroundColor: colors.surfaceVariant,
  },
  resultMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    minHeight: 44,
  },
  resultArt: {
    backgroundColor: colors.surfaceContainer,
  },
  resultArtCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  resultText: {
    ...t.body,
    color: colors.onSurface,
  },
  resultSub: {
    ...t.bodySm,
    color: colors.outlineText,
  },
  rowMore: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loader: {
    marginVertical: 24,
  },
  stateBlock: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  stateText: {
    ...t.bodyMd,
    color: colors.outlineText,
    textAlign: 'center',
  },
  stateAction: {
    paddingHorizontal: 20,
    height: 40,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  stateActionText: {
    ...t.labelMd,
    color: colors.onSurface,
  },
});
