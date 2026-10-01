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
  Dimensions,
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
import { useLibraryStore } from '../../src/store/libraryStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const FEATURED_ITEMS = [
  {
    id: 'feat-1',
    tag: '10TH ANNIVERSARY',
    artist: 'Solange',
    title: 'A Seat at the Table',
    coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
  },
  {
    id: 'feat-2',
    tag: 'NEW ALBUM',
    artist: 'ElGrandeToto',
    title: 'SALGOAT (Vol. 2)',
    coverUrl: 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg',
  },
];

type SearchTab = 'Top results' | 'Tracks' | 'Profiles' | 'Uploads';

const EMPTY_RESULTS = { tracks: [], artists: [], albums: [], playlists: [] };

export default function SearchScreen() {
  const router = useRouter();
  const { bottomBarClearance } = useResponsive();
  const inputRef = useRef<TextInput>(null);
  const { searchHistory, addToSearchHistory, removeFromSearchHistory } = useLibraryStore();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('Top results');
  const [loading, setLoading] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [optionsTrack, setOptionsTrack] = useState<Track | null>(null);

  const [results, setResults] = useState<{
    tracks: Track[];
    artists: any[];
    albums: any[];
    playlists: any[];
  }>({
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
  });

  // Debounced search query
  useEffect(() => {
    const term = query.trim();
    let active = true;

    if (!term) {
      const timer = setTimeout(() => {
        if (!active) return;
        setResults(EMPTY_RESULTS);
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await recommendationsService.searchMulti(term);
        if (active) setResults(data);
      } catch (err) {
        if (active) setResults(EMPTY_RESULTS);
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
    const term = searchTerm || query;
    if (term.trim()) {
      addToSearchHistory(term.trim());
      setHasSubmitted(true);
    }
  };

  const handleCancelSearch = () => {
    setQuery('');
    setIsSearching(false);
    setHasSubmitted(false);
    inputRef.current?.blur();
  };

  const handlePlayTrack = (track: Track) => {
    audioService.playTrack(track);
  };

  const handleFeaturedPrev = () => {
    setFeaturedIndex((prev) => (prev > 0 ? prev - 1 : FEATURED_ITEMS.length - 1));
  };

  const handleFeaturedNext = () => {
    setFeaturedIndex((prev) => (prev < FEATURED_ITEMS.length - 1 ? prev + 1 : 0));
  };

  const currentFeatured = FEATURED_ITEMS[featuredIndex];

  // 1. Explore State (Screenshot 8)
  const renderExploreHome = () => (
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]} showsVerticalScrollIndicator={false}>
      <Text style={s.pageTitle}>Explore</Text>

      {/* Search Input Bar (Touch to activate search) */}
      <Pressable
        style={s.searchBar}
        onPress={() => {
          setIsSearching(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <Icon name="search" size={20} color="#8e8e93" />
        <Text style={s.searchPlaceholder}>Search</Text>
      </Pressable>

      {/* Featured Section */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Featured</Text>
          <View style={s.navArrows}>
            <Pressable style={s.navArrowBtn} onPress={handleFeaturedPrev}>
              <Icon name="chevron-back" size={16} color="#ffffff" />
            </Pressable>
            <Pressable style={s.navArrowBtn} onPress={handleFeaturedNext}>
              <Icon name="chevron-forward" size={16} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* Featured Card */}
        <Pressable
          style={s.featuredCard}
          onPress={() => {
            router.push({
              pathname: '/album' as any,
              params: {
                title: currentFeatured.title,
                artist: currentFeatured.artist,
                coverUrl: currentFeatured.coverUrl,
              },
            });
          }}
        >
          <View style={s.featuredArtContainer}>
            <View style={s.ambientGlow} />
            <Image source={{ uri: currentFeatured.coverUrl }} style={s.featuredArt} />
          </View>
          <View style={s.featuredMeta}>
            <Text style={s.featuredTag}>{currentFeatured.tag}</Text>
            <Text style={s.featuredArtist}>{currentFeatured.artist}</Text>
            <Text style={s.featuredTitle}>{currentFeatured.title}</Text>
          </View>
        </Pressable>
      </View>

      {/* Genres Section */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Genres</Text>
          <Pressable>
            <Text style={s.viewAllText}>View all</Text>
          </Pressable>
        </View>

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
              }}
            >
              <Text style={s.genreText}>{genre}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  // 2. Active Search Suggestions & History (Screenshot 9)
  const renderSearchSuggestions = () => (
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]} showsVerticalScrollIndicator={false}>
      {/* Search Input Row with Cancel button */}
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
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={18} color="#8e8e93" />
            </Pressable>
          )}
        </View>
        <Pressable onPress={handleCancelSearch} hitSlop={8}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color="#00e5bf" style={{ marginVertical: 16 }} />}

      {/* Recent searches */}
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
            >
              <View style={s.suggestionLeft}>
                <Icon name="time-outline" size={20} color="#8e8e93" />
                <Text style={s.suggestionText}>{item}</Text>
              </View>
              <Pressable
                onPress={() => removeFromSearchHistory(item)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Icon name="trash-outline" size={18} color="#8e8e93" />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {/* Live search suggestions */}
      {results.tracks.slice(0, 4).map((t) => (
        <Pressable
          key={`sugg_${t.id}`}
          style={s.suggestionRow}
          onPress={() => {
            setQuery(t.title);
            handleSubmitSearch(t.title);
          }}
        >
          <View style={s.suggestionLeft}>
            <Icon name="search" size={20} color="#8e8e93" />
            <Text style={s.suggestionText}>{t.title.toLowerCase()}</Text>
          </View>
        </Pressable>
      ))}

      {/* Suggested Artists */}
      {results.artists.slice(0, 3).map((artist) => (
        <Pressable
          key={`art_${artist.id || artist.name}`}
          style={s.suggestionRow}
          onPress={() => {
            router.push({
              pathname: '/artist' as any,
              params: { name: artist.name },
            });
          }}
        >
          <View style={s.suggestionLeft}>
            <Image
              source={{ uri: artist.picture || 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg' }}
              style={s.artistAvatar}
            />
            <Text style={s.suggestionText}>{artist.name}</Text>
          </View>
          <Icon name="ellipsis-horizontal" size={18} color="#8e8e93" />
        </Pressable>
      ))}
    </ScrollView>
  );

  // 3. Search Results (Screenshot 10)
  const renderSearchResults = () => (
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomBarClearance }]} showsVerticalScrollIndicator={false}>
      {/* Search Bar with Back Button */}
      <View style={s.resultsHeaderRow}>
        <Pressable onPress={() => setHasSubmitted(false)} style={s.circleBtn} hitSlop={8}>
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
            <Pressable onPress={() => { setQuery(''); setHasSubmitted(false); }} hitSlop={8}>
              <Icon name="close" size={18} color="#8e8e93" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Pill Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
        {(['Top results', 'Tracks', 'Profiles', 'Uploads'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[s.filterPill, isActive ? s.filterPillActive : s.filterPillInactive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.filterPillText, isActive ? s.filterPillTextActive : s.filterPillTextInactive]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && <ActivityIndicator color="#00e5bf" style={{ marginVertical: 20 }} />}

      {/* Results List matching Screenshot 10 */}
      <View style={s.resultsList}>
        {/* Render Tracks */}
        {(activeTab === 'Top results' || activeTab === 'Tracks') &&
          results.tracks.map((track) => (
            <Pressable
              key={track.id}
              style={s.resultItem}
              onPress={() => handlePlayTrack(track)}
            >
              <Image source={{ uri: track.coverUrl }} style={s.resultArt} />
              <View style={s.resultMeta}>
                <Text numberOfLines={1} style={s.resultTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={s.resultSub}>Track • {track.artist}</Text>
              </View>
              <Pressable onPress={() => setOptionsTrack(track)} hitSlop={8} style={{ padding: 6 }}>
                <Icon name="ellipsis-horizontal" size={18} color="#8e8e93" />
              </Pressable>
            </Pressable>
          ))}

        {/* Render Artist Profiles */}
        {(activeTab === 'Top results' || activeTab === 'Profiles') &&
          results.artists.map((artist) => (
            <Pressable
              key={artist.id || artist.name}
              style={s.resultItem}
              onPress={() => {
                router.push({
                  pathname: '/artist' as any,
                  params: { name: artist.name },
                });
              }}
            >
              <Image
                source={{ uri: artist.picture || 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg' }}
                style={[s.resultArt, s.resultArtCircle]}
              />
              <View style={s.resultMeta}>
                <Text numberOfLines={1} style={s.resultTitle}>{artist.name}</Text>
              </View>
            </Pressable>
          ))}

        {/* Render Albums */}
        {(activeTab === 'Top results') &&
          results.albums.map((album) => (
            <Pressable
              key={album.id || album.title}
              style={s.resultItem}
              onPress={() => {
                router.push({
                  pathname: '/album' as any,
                  params: {
                    title: album.title,
                    artist: album.artist?.name || album.artist,
                    coverUrl: album.cover,
                  },
                });
              }}
            >
              <Image
                source={{ uri: album.cover || 'https://resources.tidal.com/images/13c6aa66/410e/433f/a8d8/a4b13cefe446/320x320.jpg' }}
                style={s.resultArt}
              />
              <View style={s.resultMeta}>
                <Text numberOfLines={1} style={s.resultTitle}>{album.title}</Text>
                <Text numberOfLines={1} style={s.resultSub}>Album • {album.artist?.name || album.artist}</Text>
              </View>
            </Pressable>
          ))}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {!hasSubmitted && <HeaderBar />}

      {!isSearching && !hasSubmitted && renderExploreHome()}
      {isSearching && !hasSubmitted && renderSearchSuggestions()}
      {hasSubmitted && renderSearchResults()}

      {/* Options Menu Modal */}
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
});
