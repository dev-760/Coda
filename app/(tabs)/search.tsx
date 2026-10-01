import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import HeaderBar from '../../src/components/ui/HeaderBar';
import { useResponsive } from '../../src/hooks/useResponsive';
import Icon from '../../src/components/ui/Icon';
import TrackOptionsMenu from '../../src/components/ui/TrackOptionsMenu';
import { recommendationsService } from '../../src/services/recommendationsService';
import { audioService } from '../../src/audio/AudioService';
import { Track } from '../../src/providers/types';
import { CatalogAlbum, CatalogArtist } from '../../src/providers/catalogTypes';
import { useLibraryStore } from '../../src/store/libraryStore';
import { useQueueStore, cacheTracks } from '../../src/store/queueStore';

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

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await recommendationsService.searchMulti(term);
        if (!active) return;
        setResults(data);
      } catch {
        if (active) {
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
        <Icon name="search" size={20} color="#8e8e93" />
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
          <Icon name="search" size={18} color="#8e8e93" />
          <TextInput
            ref={inputRef}
            style={s.activeInput}
            placeholder="Search"
            placeholderTextColor="#8e8e93"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSubmitSearch()}
            returnKeyType="search"
            autoFocus
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Icon name="close" size={18} color="#8e8e93" />
            </Pressable>
          )}
        </View>
        <Pressable onPress={handleCancelSearch} hitSlop={8} accessibilityLabel="Cancel search">
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color="#00e5bf" style={{ marginVertical: 16 }} />}

      {searchHistory.length > 0 && (
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
                <Icon name="time-outline" size={20} color="#8e8e93" />
                <Text style={s.suggestionText}>{item}</Text>
              </View>
              <Pressable
                onPress={() => removeFromSearchHistory(item)}
                hitSlop={8}
                style={{ padding: 4 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item} from recent searches`}
              >
                <Icon name="trash-outline" size={18} color="#8e8e93" />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

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
              <View style={[s.artistAvatar, s.avatarFallback]}>
                <Icon name="person" size={18} color="#8e8e93" />
              </View>
            )}
            <Text style={s.suggestionText}>{artist.name}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color="#8e8e93" />
        </Pressable>
      ))}
    </ScrollView>
  );

  const showTracks = activeTab === 'Top' || activeTab === 'Tracks';
  const showArtists = activeTab === 'Top' || activeTab === 'Artists';
  const showAlbums = activeTab === 'Top' || activeTab === 'Albums';
  const hasAnyResults =
    results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0;

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
          <Icon name="chevron-back" size={20} color="#ffffff" />
        </Pressable>
        <View style={s.resultsInputBox}>
          <Icon name="search" size={18} color="#8e8e93" />
          <TextInput
            style={s.activeInput}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (!text.trim()) setHasSubmitted(false);
            }}
            placeholder="Search"
            placeholderTextColor="#8e8e93"
          />
          {!!query && (
            <Pressable
              onPress={() => {
                setQuery('');
                setHasSubmitted(false);
              }}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <Icon name="close" size={18} color="#8e8e93" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
        {(['Top', 'Tracks', 'Artists', 'Albums'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[s.filterPill, isActive ? s.filterPillActive : s.filterPillInactive]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[s.filterPillText, isActive ? s.filterPillTextActive : s.filterPillTextInactive]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && <ActivityIndicator color="#00e5bf" style={{ marginVertical: 20 }} />}

      {error ? (
        <View style={s.stateBlock}>
          <Text style={s.stateText}>{error}</Text>
        </View>
      ) : !loading && !hasAnyResults ? (
        <View style={s.stateBlock}>
          <Text style={s.stateText}>No results for &ldquo;{query.trim()}&rdquo;.</Text>
        </View>
      ) : (
        <>
          {showTracks && results.tracks.length > 0 && (
            <View style={s.resultsGroup}>
              <View style={s.resultsGroupHeader}>
                <Text style={s.sectionTitle}>Tracks</Text>
                <Pressable
                  onPress={() => playMany(results.tracks, query.trim() || 'Search')}
                  hitSlop={8}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel="Play all results"
                >
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
                    {track.coverUrl ? (
                      <Image source={{ uri: track.coverUrl }} style={s.resultArt} />
                    ) : (
                      <View style={[s.resultArt, s.artFallback]}>
                        <Icon name="musical-note" size={20} color="#8e8e93" />
                      </View>
                    )}
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
                      <Icon name="ellipsis-horizontal" size={18} color="#8e8e93" />
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
                        <Icon name="person" size={20} color="#8e8e93" />
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
                    <Icon name="chevron-forward" size={18} color="#8e8e93" />
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
                        <Icon name="albums-outline" size={20} color="#8e8e93" />
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
                    <Icon name="chevron-forward" size={18} color="#8e8e93" />
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
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 16,
    gap: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#8e8e93',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  navArrows: {
    flexDirection: 'row',
    gap: 8,
  },
  navArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  featuredCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredArtContainer: {
    width: '100%',
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#141416',
  },
  ambientGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96, 165, 250, 0.25)',
    filter: 'blur(30px)',
  },
  featuredArt: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  featuredMeta: {
    padding: 16,
    gap: 4,
  },
  featuredTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00e5bf',
    letterSpacing: 0.8,
  },
  featuredArtist: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  featuredTitle: {
    fontSize: 14,
    color: '#8e8e93',
  },
  genresRow: {
    gap: 10,
    paddingVertical: 4,
  },
  genrePill: {
    backgroundColor: '#262626',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
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
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  activeInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  suggestionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  artistAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
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
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    height: 44,
    paddingHorizontal: 14,
    gap: 10,
  },
  tabsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#ffffff',
  },
  filterPillInactive: {
    backgroundColor: '#262626',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#000000',
  },
  filterPillTextInactive: {
    color: '#ffffff',
  },
  resultsList: {
    gap: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  resultArt: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: '#1c1c1e',
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
    color: '#ffffff',
  },
  resultSub: {
    fontSize: 13,
    color: '#8e8e93',
  },

  resultsGroup: {
    gap: 12,
  },
  resultsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateBlock: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  stateText: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
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

