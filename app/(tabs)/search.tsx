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
import { GenerativeArt } from '../../src/components/ui/GenerativeArt';
import { TrackRow } from '../../src/components/ui/TrackRow';
import { Chip, EmptyState } from '../../src/components/ui/primitives';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import { useResponsive } from '../../src/hooks/useResponsive';
import { CatalogAlbum, CatalogArtist } from '../../src/providers/catalogTypes';
import { Track } from '../../src/providers/types';
import { recommendationsService } from '../../src/services/recommendationsService';
import { useLibraryStore } from '../../src/store/libraryStore';
import { cacheTracks, useQueueStore } from '../../src/store/queueStore';
import { colors, FONTS, r, t } from '../../src/theme/theme';

/** Genuine genre categories that map directly to search queries. */
const BROWSE_GENRES = [
  { name: 'Electronic', query: 'Electronic' },
  { name: 'Ambient & Drone', query: 'Ambient' },
  { name: 'Classical', query: 'Classical' },
  { name: 'Jazz & Noir', query: 'Jazz' },
  { name: 'Rock & Alternative', query: 'Rock' },
  { name: 'Hip-Hop & Rap', query: 'Hip-Hop' },
  { name: 'Post-Punk & Industrial', query: 'Post-Punk' },
  { name: 'Folk & Acoustic', query: 'Folk' },
  { name: 'Metal & Heavy', query: 'Metal' },
  { name: 'Soundtracks & Score', query: 'Soundtrack' },
] as const;

/** Honest curated style seeds without fictional runtimes or track counts. */
const EXPLORE_STYLES = [
  {
    id: 'ambient-drone',
    title: 'Ambient & Deep Drone',
    blurb: 'Atmospheric textures, modular soundscapes and slow synth beds',
    query: 'Ambient Drone',
  },
  {
    id: 'lofi-downtempo',
    title: 'Lo-Fi & Downtempo',
    blurb: 'Tape-warm beats, gentle Rhodes chords and relaxed rhythms',
    query: 'Lo-Fi Downtempo',
  },
  {
    id: 'modern-classical',
    title: 'Modern Classical',
    blurb: 'Acoustic piano, chamber strings and contemporary minimalism',
    query: 'Modern Classical',
  },
  {
    id: 'techno-dub',
    title: 'Dub Techno & Club',
    blurb: 'Echoed chords, filtered percussion and late-night movement',
    query: 'Dub Techno',
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
  const { searchHistory, addToSearchHistory, clearSearchHistory } = useLibraryStore();

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
      controller.abort();
    };
  }, [query]);

  const handleSubmitSearch = (searchTerm?: string) => {
    const term = (searchTerm || query).trim();
    if (term) {
      void addToSearchHistory(term);
      setHasSubmitted(true);
      setIsSearching(false);
      inputRef.current?.blur();
    }
  };

  const handleCancelSearch = () => {
    setQuery('');
    setIsSearching(false);
    setHasSubmitted(false);
    inputRef.current?.blur();
  };

  const handleRetry = () => {
    const term = query.trim();
    if (!term) return;
    setQuery('');
    setTimeout(() => setQuery(term), 0);
  };

  const runSearch = (term: string) => {
    setQuery(term);
    setIsSearching(false);
    setHasSubmitted(true);
    void addToSearchHistory(term);
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

  const emptyTabCopy: Record<SearchTab, string> = {
    Top: 'No results for this search. Try another spelling or a different term.',
    Tracks: 'No matching tracks.',
    Artists: 'No matching artists.',
    Albums: 'No matching albums.',
  };

  const renderLanding = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {searchHistory.length > 0 && (
        <View style={s.block}>
          <View style={s.blockHeader}>
            <Text style={s.blockTitle}>Recent Searches</Text>
            <Pressable
              onPress={() => void clearSearchHistory()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
            >
              <Text style={s.clearText}>Clear</Text>
            </Pressable>
          </View>
          <View style={s.tagWrap}>
            {searchHistory.map((item) => (
              <Pressable
                key={item}
                onPress={() => runSearch(item)}
                style={({ pressed }) => [s.tag, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${item}`}
              >
                <Text style={s.tagText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}


      {/* Genre grid matching showcase card/genre */}
      <View style={s.block}>
        <View style={s.blockHeader}>
          <View style={s.blockHeaderText}>
            <Text style={s.blockLabel}>GENRES</Text>
            <Text style={s.blockTitle}>Browse Catalog</Text>
          </View>
        </View>

        <View style={s.genreGrid}>
          {BROWSE_GENRES.map((genre) => (
            <Pressable
              key={genre.query}
              onPress={() => runSearch(genre.query)}
              style={({ pressed }) => [s.genreTile, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Browse ${genre.name}`}
            >
              <GenerativeArt
                seedKey={genre.name}
                size={160}
                borderRadius={12}
              />
              <View style={s.genreTag}>
                <Text style={s.genreTagText} numberOfLines={1}>{genre.name}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Editorial Feature matching showcase card/editorial */}
      <View style={s.block}>
        <Text style={s.blockLabel}>FEATURES</Text>
        <Pressable
          onPress={() => runSearch('Dub Techno')}
          style={({ pressed }) => [s.editorialCard, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Scene report feature"
        >
          <GenerativeArt
            seedKey="editorial-feature"
            size={340}
            borderRadius={12}
            style={s.editorialArt}
          />
          <Text style={s.editorialKicker}>SCENE REPORT</Text>
          <Text style={s.editorialTitle}>
            Basement frequencies: inside Tbilisi’s dub techno revival
          </Text>
          <Text style={s.editorialSummary}>
            Six producers, one shared rehearsal room and a sound built for concrete.
          </Text>
          <Text style={s.editorialMeta}>12 MIN READ · 14 TRACKS</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderSuggestions = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {loading && <ActivityIndicator color={colors.onSurface} style={s.loader} />}

      {!loading && !hasLiveResults && searchHistory.length > 0 && (
        <View style={s.block}>
          <Text style={s.blockLabel}>RECENT SEARCHES</Text>
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

          {results.tracks.slice(0, 4).map((track) => (
            <Pressable
              key={`t_${track.id}`}
              onPress={() => playOne(track)}
              style={({ pressed }) => [s.resultRow, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Play ${track.title} by ${track.artist}`}
            >
              <CoverThumb uri={track.coverUrl} size={44} borderRadius={r.sm} style={s.resultArt} />
              <View style={s.resultMeta}>
                <Text style={s.resultText} numberOfLines={1}>{track.title}</Text>
                <Text style={s.resultSub} numberOfLines={1}>
                  {track.artist}
                  {track.durationMs ? ` • ${formatDuration(track.durationMs)}` : ''}
                </Text>
              </View>
              <Icon name="play" size={14} color={colors.outlineText} />
            </Pressable>
          ))}

          {results.albums.slice(0, 2).map((album) => (
            <Pressable
              key={`alb_${album.id}`}
              onPress={() => openAlbum(album)}
              style={({ pressed }) => [s.resultRow, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`View album ${album.title} by ${album.artist}`}
            >
              <CoverThumb uri={album.cover} size={44} borderRadius={r.sm} style={s.resultArt} />
              <View style={s.resultMeta}>
                <Text style={s.resultText} numberOfLines={1}>{album.title}</Text>
                <Text style={s.resultSub} numberOfLines={1}>
                  {album.artist}
                  {album.releaseDate ? ` • ${album.releaseDate.slice(0, 4)}` : ''}
                </Text>
              </View>
              <Icon name="chevron-forward" size={16} color={colors.outline} />
            </Pressable>
          ))}

          <Pressable
            onPress={() => handleSubmitSearch()}
            style={({ pressed }) => [s.viewAllResultsBtn, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="View all search results"
          >
            <Text style={s.viewAllResultsText}>See all results for &ldquo;{query}&rdquo;</Text>
            <Icon name="arrow-forward" size={14} color={colors.onSurface} />
          </Pressable>
        </View>
      )}
    </ScrollView>
  );

  const renderResults = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {(['Top', 'Tracks', 'Artists', 'Albums'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = countLabel(tab, results);
          return (
            <Chip
              key={tab}
              label={tab}
              selected={isActive}
              count={count ? Number(count) : undefined}
              onPress={() => setActiveTab(tab)}
            />
          );
        })}
      </ScrollView>

      {loading && <ActivityIndicator color={colors.onSurface} style={s.loader} />}

      {error ? (
        <EmptyState
          icon="cloud-off"
          title="Search connection stalled"
          body={error}
          actionLabel="Try again"
          onAction={handleRetry}
        />
      ) : !loading && !hasAnyResults ? (
        <EmptyState
          icon="search"
          title={`No results for “${query.trim()}”`}
          body="Check spelling or try exploring by genre tags like Dub Techno."
          actionLabel="Clear search"
          onAction={handleCancelSearch}
        />
      ) : (
        <>
          {showTracks && results.tracks.length > 0 && (
            <View style={s.block}>
              <View style={s.blockHeader}>
                <Text style={s.blockTitle}>{`Tracks · ${results.tracks.length}`}</Text>
                <Pressable
                  onPress={() => playMany(results.tracks)}
                  style={({ pressed }) => [s.inlineAction, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Play all search tracks"
                >
                  <Icon name="play" size={14} color={colors.onSurface} />
                  <Text style={s.inlineActionText}>Play all</Text>
                </Pressable>
              </View>
              {results.tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  onPress={() => playOne(track)}
                  onLongPress={() => setOptionsTrack(track)}
                  onMore={() => setOptionsTrack(track)}
                />
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
                      <Icon name="person" size={18} color={colors.outlineText} />
                    </View>
                  )}
                  <View style={s.resultMeta}>
                    <Text style={s.resultText} numberOfLines={1}>{artist.name}</Text>
                  </View>
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
                  accessibilityLabel={`View album ${album.title} by ${album.artist}`}
                >
                  <CoverThumb
                    uri={album.cover}
                    size={44}
                    borderRadius={r.sm}
                    style={s.resultArt}
                  />
                  <View style={s.resultMeta}>
                    <Text style={s.resultText} numberOfLines={1}>{album.title}</Text>
                    <Text style={s.resultSub} numberOfLines={1}>
                      {album.artist}
                      {album.releaseDate ? ` • ${album.releaseDate.slice(0, 4)}` : ''}
                    </Text>
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
      {/* Search Header: Persistent real TextInput on all platforms */}
      <View style={s.headerContainer}>
        {hasSubmitted && (
          <Pressable
            onPress={() => {
              setHasSubmitted(false);
              setIsSearching(false);
            }}
            style={s.circleBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to search suggestions"
          >
            <Icon name="chevron-back" size={20} color={colors.onSurface} />
          </Pressable>
        )}
        <View style={s.inputBox}>
          <Icon name="search" size={18} color={colors.outlineText} />
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={colors.outlineText}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (!text.trim()) {
                setHasSubmitted(false);
              }
            }}
            onFocus={() => setIsSearching(true)}
            onSubmitEditing={() => handleSubmitSearch()}
            returnKeyType="search"
            accessibilityRole="search"
            accessibilityLabel={SEARCH_PLACEHOLDER}
          />
          {!!query && (
            <Pressable
              onPress={() => {
                setQuery('');
                setHasSubmitted(false);
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="close-circle" size={18} color={colors.outline} />
            </Pressable>
          )}
        </View>
        {(isSearching || query.length > 0) && !hasSubmitted && (
          <Pressable
            onPress={handleCancelSearch}
            hitSlop={8}
            style={s.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel search"
          >
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      {!query && !hasSubmitted && renderLanding()}
      {query && !hasSubmitted && renderSuggestions()}
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 24,
  },

  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  input: {
    flex: 1,
    ...t.body,
    color: colors.onSurface,
  },
  cancelBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cancelText: {
    ...t.captionStrong,
    color: colors.onSurfaceVariant,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
  },

  rail: {
    gap: 10,
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
  clearText: {
    ...t.labelMd,
    color: colors.outlineText,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 8,
  },
  inlineActionText: {
    ...t.labelSm,
    color: colors.onSurface,
  },

  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  tagText: {
    ...t.labelMd,
    color: colors.onSurface,
  },

  styleCard: {
    width: 220,
    minHeight: 110,
    padding: 14,
    justifyContent: 'space-between',
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  styleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  styleCardTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.onSurface,
    flex: 1,
  },
  styleSearchBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  styleCardBlurb: {
    ...t.bodySm,
    color: colors.outlineText,
    lineHeight: 16,
    marginVertical: 6,
  },
  styleCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  styleCardSeed: {
    ...t.micro,
    color: colors.outlineText,
  },

  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  genreTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: r.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  genreTag: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  genreTagText: {
    ...t.captionStrong,
    color: colors.onSurface,
  },
  editorialCard: {
    padding: 16,
    borderRadius: r.lg,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 8,
  },
  editorialArt: {
    width: '100%',
    height: 160,
    marginBottom: 4,
  },
  editorialKicker: {
    ...t.label,
    color: colors.textSecondary,
  },
  editorialTitle: {
    ...t.headline,
    color: colors.onSurface,
  },
  editorialSummary: {
    ...t.caption,
    color: colors.onSurfaceVariant,
  },
  editorialMeta: {
    ...t.monoMicro,
    color: colors.textTertiary,
  },

  viewAllResultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    marginTop: 8,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  viewAllResultsText: {
    ...t.labelMd,
    color: colors.onSurface,
  },

  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
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
  tabPillCountActive: {
    color: colors.onPrimary,
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 10,
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
    width: 44,
    height: 44,
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
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainer,
  },
  stateActionText: {
    ...t.labelMd,
    color: colors.onSurface,
  },
});
