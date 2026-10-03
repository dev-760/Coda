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
import HeaderBar from '../../src/components/ui/HeaderBar';
import Icon from '../../src/components/ui/Icon';
import CoverThumb from '../../src/components/ui/CoverThumb';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import { useResponsive } from '../../src/hooks/useResponsive';
import { CatalogAlbum, CatalogArtist } from '../../src/providers/catalogTypes';
import { Track } from '../../src/providers/types';
import { recommendationsService } from '../../src/services/recommendationsService';
import { useLibraryStore } from '../../src/store/libraryStore';
import { cacheTracks, useQueueStore } from '../../src/store/queueStore';
import { COLORS, FONTS, colors } from '../../src/theme/theme';

const GENRES = [
  'Hip-Hop',
  'Pop',
  'R&B / Soul',
  'Country',
  'Electronic',
  'Rock',
  'Jazz',
  'Indie',
  'Afrobeats',
  'Classical',
];

type SearchTab = 'Top' | 'Tracks' | 'Artists' | 'Albums';

interface Results {
  tracks: Track[];
  artists: CatalogArtist[];
  albums: CatalogAlbum[];
}

const EMPTY_RESULTS: Results = { tracks: [], artists: [], albums: [] };

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
  const { searchHistory, addToSearchHistory, removeFromSearchHistory } = useLibraryStore();

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

  const playOne = (track: Track, context: string) => {
    cacheTracks([track]);
    useQueueStore.getState().playContext([track], 0, { type: 'collection', name: context });
    void audioService.playTrack(track);
  };

  const playMany = (tracks: Track[], context: string) => {
    if (tracks.length === 0) return;
    cacheTracks(tracks);
    useQueueStore.getState().playContext(tracks, 0, { type: 'collection', name: context });
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
      params: {
        artistId: artist.id,
        name: artist.name,
        coverUrl: artist.picture ?? '',
      },
    });
  };

  const renderExploreHome = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.pageTitle}>Explore</Text>

      <Pressable
        style={s.searchBar}
        onPress={() => {
          setIsSearching(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        accessibilityRole="search"
        accessibilityLabel="Search"
      >
        <Icon name="search" size={19} color={COLORS.onSurfaceVariant} />
        <Text style={s.searchPlaceholder}>Search</Text>
      </Pressable>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Genres</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.genresRow}
        >
          {GENRES.map((genre) => (
            <Pressable
              key={genre}
              style={s.genrePill}
              onPress={() => {
                setQuery(genre);
                setIsSearching(true);
                setHasSubmitted(true);
                addToSearchHistory(genre);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Search ${genre}`}
            >
              <Text style={s.genreText}>{genre}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  const renderSearchSuggestions = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.searchInputRow}>
        <View style={s.activeInputBox}>
          <Icon name="search" size={18} color={COLORS.onSurfaceVariant} />
          <TextInput
            ref={inputRef}
            style={s.activeInput}
            placeholder="Search"
            placeholderTextColor={COLORS.onSurfaceVariant}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSubmitSearch()}
            returnKeyType="search"
            autoFocus
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Icon name="close-circle" size={18} color={COLORS.outline} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={handleCancelSearch} hitSlop={8} accessibilityLabel="Cancel search">
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={COLORS.accent} style={s.loader} />}

      {!loading && !hasLiveResults && (
        <View style={s.idleHint}>
          <Icon name="search" size={18} color={COLORS.onSurfaceVariant} />
          <Text style={s.idleHintText}>
            {searchHistory.length > 0 ? 'Keep typing, or pick a recent search' : 'Search for music'}
          </Text>
        </View>
      )}

      {searchHistory.length > 0 && (
        <View style={s.sectionBlock}>
          <Text style={s.sectionTitle}>Recent</Text>
          <View style={s.suggestionsList}>
            {searchHistory.map((item) => (
              <Pressable
                key={item}
                style={s.suggestionRow}
                onPress={() => {
                  setQuery(item);
                  handleSubmitSearch(item);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Search ${item} again`}
              >
                <View style={s.suggestionLeft}>
                  <Icon name="time-outline" size={19} color={COLORS.onSurfaceVariant} />
                  <Text style={s.suggestionText} numberOfLines={1}>{item}</Text>
                </View>
                <Pressable
                  onPress={() => removeFromSearchHistory(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item} from recent searches`}
                >
                  <Icon name="close-circle" size={18} color={COLORS.outline} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Every kind is listed, so the three live requests are all visible here.
          Previously this block rendered only artists, which is why searching
          appeared to return nothing else. */}
      {hasLiveResults && (
        <>
          {results.artists.length > 0 && (
            <View style={s.sectionBlock}>
              <Text style={s.sectionTitle}>Artists</Text>
              <View style={s.suggestionsList}>
                {results.artists.slice(0, 3).map((artist) => (
                  <Pressable
                    key={`art_${artist.id}`}
                    style={s.suggestionRow}
                    onPress={() => openArtist(artist)}
                    accessibilityRole="button"
                    accessibilityLabel={`View artist ${artist.name}`}
                  >
                    <View style={s.suggestionLeft}>
                      {artist.picture ? (
                        <Image source={{ uri: artist.picture }} style={s.artistAvatar} />
                      ) : (
                        <View style={[s.artistAvatar, s.artFallback]}>
                          <Icon name="person" size={17} color={COLORS.onSurfaceVariant} />
                        </View>
                      )}
                      <Text style={s.suggestionText} numberOfLines={1}>{artist.name}</Text>
                    </View>
                    <Icon name="chevron-forward" size={17} color={COLORS.outline} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {results.tracks.length > 0 && (
            <View style={s.sectionBlock}>
              <Text style={s.sectionTitle}>Tracks</Text>
              <View style={s.suggestionsList}>
                {results.tracks.slice(0, 3).map((track) => (
                  <Pressable
                    key={`trk_${track.id}`}
                    style={s.suggestionRow}
                    onPress={() => {
                      playOne(track, query.trim() || 'Search');
                      handleSubmitSearch();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${track.title} by ${track.artist}`}
                  >
                    <View style={s.suggestionLeft}>
                      {track.coverUrl ? (
                        <Image source={{ uri: track.coverUrl }} style={s.artistAvatar} />
                      ) : (
                        <View style={[s.artistAvatar, s.artFallback]}>
                          <Icon name="musical-note" size={17} color={COLORS.onSurfaceVariant} />
                        </View>
                      )}
                      <View style={s.suggestionMeta}>
                        <Text style={s.suggestionText} numberOfLines={1}>{track.title}</Text>
                        <Text style={s.suggestionSub} numberOfLines={1}>{track.artist}</Text>
                      </View>
                    </View>
                    <Icon name="play" size={16} color={COLORS.accent} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {results.albums.length > 0 && (
            <View style={s.sectionBlock}>
              <Text style={s.sectionTitle}>Albums</Text>
              <View style={s.suggestionsList}>
                {results.albums.slice(0, 3).map((album) => (
                  <Pressable
                    key={`alb_${album.id}`}
                    style={s.suggestionRow}
                    onPress={() => {
                      openAlbum(album);
                      handleSubmitSearch();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open album ${album.title} by ${album.artist}`}
                  >
                    <View style={s.suggestionLeft}>
                      {album.cover ? (
                        <Image source={{ uri: album.cover }} style={s.artistAvatar} />
                      ) : (
                        <View style={[s.artistAvatar, s.artFallback]}>
                          <Icon name="albums-outline" size={17} color={COLORS.onSurfaceVariant} />
                        </View>
                      )}
                      <View style={s.suggestionMeta}>
                        <Text style={s.suggestionText} numberOfLines={1}>{album.title}</Text>
                        <Text style={s.suggestionSub} numberOfLines={1}>{album.artist}</Text>
                      </View>
                    </View>
                    <Icon name="chevron-forward" size={17} color={COLORS.outline} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const showTracks = activeTab === 'Top' || activeTab === 'Tracks';
  const showArtists = activeTab === 'Top' || activeTab === 'Artists';
  const showAlbums = activeTab === 'Top' || activeTab === 'Albums';
  const hasAnyResults =
    results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0;
  /** Drives the pre-submit suggestion list, which only shows when typing. */
  const hasLiveResults = hasAnyResults && query.trim().length > 0;

  /** Explains why a tab that has no rows is on screen. */
  const emptyTabCopy: Record<SearchTab, string> = {
    Top: hasAnyResults
      ? 'No results for this search.'
      : 'No results for this search. Try another spelling or a different term.',
    Tracks: 'No matching tracks.',
    Artists: 'No matching artists.',
    Albums: 'No matching albums.',
  };

  const renderSearchResults = () => (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.resultsHeaderRow}>
        <Pressable
          onPress={() => setHasSubmitted(false)}
          style={s.circleBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to explore"
        >
          <Icon name="chevron-back" size={20} color={colors.onSurface} />
        </Pressable>
        <View style={s.resultsInputBox}>
          <Icon name="search" size={18} color={COLORS.onSurfaceVariant} />
          <TextInput
            style={s.activeInput}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (!text.trim()) setHasSubmitted(false);
            }}
            placeholder="Search"
            placeholderTextColor={COLORS.onSurfaceVariant}
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
              <Icon name="close-circle" size={18} color={COLORS.outline} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
        {(['Top', 'Tracks', 'Artists', 'Albums'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count = countLabel(tab, results);
          return (
            <Pressable
              key={tab}
              style={[s.filterPill, isActive ? s.filterPillActive : s.filterPillInactive]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={count ? `${tab}, ${count} results` : tab}
            >
              <Text style={[s.filterPillText, isActive ? s.filterPillTextActive : s.filterPillTextInactive]}>
                {tab}
              </Text>
              {!!count && (
                <Text style={[s.filterPillCount, isActive ? s.filterPillCountActive : s.filterPillCountIdle]}>
                  {count}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && <ActivityIndicator color={COLORS.accent} style={s.loader} />}

      {error ? (
        <View style={s.stateBlock}>
          <Icon name="cloud-offline-outline" size={26} color={COLORS.onSurfaceVariant} />
          <Text style={s.stateText}>{error}</Text>
          <Pressable style={s.stateAction} onPress={handleRetry} accessibilityRole="button">
            <Text style={s.stateActionText}>Try again</Text>
          </Pressable>
        </View>
      ) : !loading && !hasAnyResults ? (
        <View style={s.stateBlock}>
          <Icon name="search" size={26} color={COLORS.outline} />
          <Text style={s.stateText}>{emptyTabCopy[activeTab]}</Text>
        </View>
      ) : (
        <>
          {/* A tab whose kind came back empty needs its own message, otherwise
              switching to it looks like the screen broke. */}
          {activeTab !== 'Top' && activeTab === 'Tracks' && results.tracks.length === 0 && (
            <View style={s.stateBlock}>
              <Icon name="musical-notes-outline" size={26} color={COLORS.outline} />
              <Text style={s.stateText}>{emptyTabCopy.Tracks}</Text>
            </View>
          )}
          {activeTab === 'Artists' && results.artists.length === 0 && (
            <View style={s.stateBlock}>
              <Icon name="people-outline" size={26} color={COLORS.outline} />
              <Text style={s.stateText}>{emptyTabCopy.Artists}</Text>
            </View>
          )}
          {activeTab === 'Albums' && results.albums.length === 0 && (
            <View style={s.stateBlock}>
              <Icon name="albums-outline" size={26} color={COLORS.outline} />
              <Text style={s.stateText}>{emptyTabCopy.Albums}</Text>
            </View>
          )}

          {showTracks && results.tracks.length > 0 && (
            <View style={s.resultsGroup}>
              <View style={s.resultsGroupHeader}>
                <Text style={s.sectionTitle}>Tracks</Text>
                <Pressable
                  onPress={() => playMany(results.tracks, query.trim() || 'Search')}
                  hitSlop={10}
                  style={s.inlineAction}
                  accessibilityRole="button"
                  accessibilityLabel="Play all results"
                >
                  <Icon name="play" size={13} color={COLORS.accent} />
                  <Text style={s.viewAllText}>Play all</Text>
                </Pressable>
              </View>
              <View style={s.resultsList}>
                {results.tracks.map((track) => (
                  <Pressable
                    key={track.id}
                    style={s.resultItem}
                    onPress={() => playOne(track, query.trim() || 'Search')}
                    onLongPress={() => setOptionsTrack(track)}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${track.title} by ${track.artist}`}
                  >
                    <CoverThumb
                      uri={track.coverUrl}
                      size={52}
                      borderRadius={8}
                      style={{ backgroundColor: COLORS.surfaceContainer }}
                    />
                    <View style={s.resultMeta}>
                      <Text numberOfLines={1} style={s.resultTitle}>
                        {track.title}
                      </Text>
                      <Text numberOfLines={1} style={s.resultSub}>
                        {track.artist}
                        {track.album ? ` • ${track.album}` : ''}
                        {track.durationMs ? ` • ${formatDuration(track.durationMs)}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setOptionsTrack(track)}
                      hitSlop={8}
                      style={{ padding: 6 }}
                      accessibilityLabel={`More options for ${track.title}`}
                    >
                      <Icon name="ellipsis-horizontal" size={18} color={COLORS.onSurfaceVariant} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {showArtists && results.artists.length > 0 && (
            <View style={s.resultsGroup}>
              <Text style={s.sectionTitle}>Artists</Text>
              <View style={s.resultsList}>
                {results.artists.map((artist) => (
                  <Pressable
                    key={artist.id}
                    style={s.resultItem}
                    onPress={() => openArtist(artist)}
                    accessibilityRole="button"
                    accessibilityLabel={`View artist ${artist.name}`}
                  >
                    {artist.picture ? (
                      <Image source={{ uri: artist.picture }} style={[s.resultArt, s.resultArtCircle]} />
                    ) : (
                      <View style={[s.resultArt, s.resultArtCircle, s.artFallback]}>
                        <Icon name="person" size={19} color={COLORS.onSurfaceVariant} />
                      </View>
                    )}
                    <View style={s.resultMeta}>
                      <Text numberOfLines={1} style={s.resultTitle}>
                        {artist.name}
                      </Text>
                      <Text numberOfLines={1} style={s.resultSub}>
                        Artist
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={COLORS.outline} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {showAlbums && results.albums.length > 0 && (
            <View style={s.resultsGroup}>
              <Text style={s.sectionTitle}>Albums</Text>
              <View style={s.resultsList}>
                {results.albums.map((album) => (
                  <Pressable
                    key={album.id}
                    style={s.resultItem}
                    onPress={() => openAlbum(album)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open album ${album.title} by ${album.artist}`}
                  >
                    {album.cover ? (
                      <Image source={{ uri: album.cover }} style={s.resultArt} />
                    ) : (
                      <View style={[s.resultArt, s.artFallback]}>
                        <Icon name="albums-outline" size={19} color={COLORS.onSurfaceVariant} />
                      </View>
                    )}
                    <View style={s.resultMeta}>
                      <Text numberOfLines={1} style={s.resultTitle}>
                        {album.title}
                      </Text>
                      <Text numberOfLines={1} style={s.resultSub}>
                        {album.artist}
                        {album.releaseDate ? ` • ${album.releaseDate.slice(0, 4)}` : ''}
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={COLORS.outline} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {!hasSubmitted && <HeaderBar />}

      {!isSearching && !hasSubmitted && renderExploreHome()}
      {isSearching && !hasSubmitted && renderSearchSuggestions()}
      {hasSubmitted && renderSearchResults()}

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
    backgroundColor: COLORS.surface,
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
  },
  pageTitle: {
      fontFamily: FONTS.display,
      fontSize: 32,
    fontWeight: '700',
    color: COLORS.onSurface,
    letterSpacing: -0.8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
  },
  section: {
    gap: 12,
  },
  /** A titled group in the suggestion list. */
  sectionBlock: {
    gap: 4,
  },
  sectionTitle: {
      fontFamily: FONTS.displayMedium,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  navArrows: {
    flexDirection: 'row',
    gap: 8,
  },
  navArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Compact action that sits on a section header line. */
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  genresRow: {
    gap: 10,
    paddingVertical: 4,
  },
  genrePill: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreText: {
    fontFamily: FONTS.displayMedium,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  activeInput: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 15,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  suggestionsList: {
    gap: 2,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
    minHeight: 44,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  /** Two-line variant used for tracks and albums. */
  suggestionMeta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  suggestionText: {
    flexShrink: 1,
    fontSize: 16,
    color: COLORS.onSurface,
    fontWeight: '500',
  },
  suggestionSub: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  artistAvatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  idleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  idleHintText: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  tabsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: COLORS.onSurface,
  },
  filterPillInactive: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: COLORS.surface,
  },
  filterPillTextInactive: {
    color: COLORS.onSurface,
  },
  /** Result count inside a filter pill. */
  filterPillCount: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterPillCountActive: {
    color: COLORS.onSurfaceVariant,
  },
  filterPillCountIdle: {
    color: COLORS.outline,
  },
  loader: {
    marginVertical: 20,
  },
  resultsList: {
    gap: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    minHeight: 60,
  },
  resultArt: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainer,
  },
  resultArtCircle: {
    borderRadius: 26,
  },
  resultMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  resultSub: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  resultsGroup: {
    gap: 4,
  },
  resultsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stateBlock: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
  },
  /** Recovery action inside an error block. */
  stateAction: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  stateActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

