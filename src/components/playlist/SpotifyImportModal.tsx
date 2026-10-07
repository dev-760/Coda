import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, r, sp, t } from '../../theme/theme';
import Icon from '../ui/Icon';
import CoverThumb from '../ui/CoverThumb';
import {
  fetchSpotifyPlaylist,
  matchSpotifyTracks,
  ImportProgress,
  SpotifyPlaylistData,
} from '../../services/spotifyImportService';
import { useLibraryStore } from '../../store/libraryStore';

interface SpotifyImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (playlistName: string, trackCount: number) => void;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'importing'>('input');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [playlistData, setPlaylistData] = useState<SpotifyPlaylistData | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { createPlaylist, addTrackToPlaylist, setPlaylistCover } = useLibraryStore();

  const handleReset = () => {
    setUrl('');
    setStep('input');
    setIsLoadingPreview(false);
    setPlaylistData(null);
    setProgress(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFetchPreview = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a Spotify playlist link');
      return;
    }

    setIsLoadingPreview(true);
    try {
      const data = await fetchSpotifyPlaylist(url.trim());
      if (data.tracks.length === 0) {
        Alert.alert('Empty Playlist', 'This playlist does not contain any tracks or is private.');
        setIsLoadingPreview(false);
        return;
      }
      setPlaylistData(data);
      setStep('preview');
    } catch (err: any) {
      Alert.alert('Import Error', err?.message || 'Could not fetch Spotify playlist. Please check the URL.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleStartImport = async () => {
    if (!playlistData || playlistData.tracks.length === 0) return;

    setStep('importing');
    abortControllerRef.current = new AbortController();

    try {
      const { matchedTracks } = await matchSpotifyTracks(
        playlistData.tracks,
        (p) => setProgress(p),
        abortControllerRef.current.signal,
      );

      if (matchedTracks.length === 0) {
        Alert.alert('No Matches', 'None of the tracks in this playlist could be matched in the catalog.');
        handleReset();
        return;
      }

      // Create new playlist with matched tracks
      const newPlaylist = await createPlaylist(
        playlistData.title,
        playlistData.description || `Imported from Spotify (${matchedTracks.length} tracks)`,
        '#8D8170', // Warm accent color
        'musical-notes',
      );

      if (playlistData.coverUrl) {
        await setPlaylistCover(newPlaylist.id, playlistData.coverUrl);
      }

      for (const track of matchedTracks) {
        await addTrackToPlaylist(newPlaylist.id, track);
      }

      onSuccess?.(playlistData.title, matchedTracks.length);
      handleClose();
      Alert.alert(
        'Playlist Imported',
        `Successfully imported "${playlistData.title}" with ${matchedTracks.length} tracks!`,
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        Alert.alert('Import Failed', err?.message || 'An error occurred while matching tracks.');
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.modalContainer}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerTitleRow}>
              <Icon name="arrow-down-circle" size={20} color={colors.accent} />
              <Text style={s.title}>IMPORT SPOTIFY PLAYLIST</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={12} style={s.closeButton}>
              <Icon name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {step === 'input' && (
            <View style={s.body}>
              <Text style={s.description}>
                Paste any public Spotify playlist URL below to import its songs into your local library.
              </Text>

              <View style={s.inputContainer}>
                <TextInput
                  style={s.input}
                  placeholder="https://open.spotify.com/playlist/..."
                  placeholderTextColor={colors.disabled}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectTextOnFocus
                />
              </View>

              <View style={s.buttonRow}>
                <TouchableOpacity style={s.cancelButton} onPress={handleClose}>
                  <Text style={s.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.primaryButton, (!url.trim() || isLoadingPreview) && s.disabledButton]}
                  onPress={handleFetchPreview}
                  disabled={!url.trim() || isLoadingPreview}
                >
                  {isLoadingPreview ? (
                    <ActivityIndicator size="small" color={colors.onAccent} />
                  ) : (
                    <Text style={s.primaryButtonText}>LOAD PLAYLIST</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 'preview' && playlistData && (
            <View style={s.body}>
              <View style={s.previewCard}>
                <CoverThumb uri={playlistData.coverUrl} size={64} borderRadius={8} />
                <View style={s.previewMeta}>
                  <Text style={s.previewTitle} numberOfLines={2}>
                    {playlistData.title}
                  </Text>
                  <Text style={s.previewCount}>
                    {playlistData.tracks.length} tracks found
                  </Text>
                </View>
              </View>

              <Text style={s.importNote}>
                Coda will search the lossless catalog to match each track automatically.
              </Text>

              <View style={s.buttonRow}>
                <TouchableOpacity style={s.cancelButton} onPress={() => setStep('input')}>
                  <Text style={s.cancelButtonText}>BACK</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.primaryButton} onPress={handleStartImport}>
                  <Text style={s.primaryButtonText}>START IMPORT</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 'importing' && (
            <View style={s.body}>
              <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 16 }} />

              <Text style={s.progressTitle}>Matching tracks in catalog...</Text>

              {progress && (
                <>
                  <Text style={s.progressTrack} numberOfLines={1}>
                    {progress.currentTrackName || 'Searching...'}
                  </Text>

                  <View style={s.progressBarTrack}>
                    <View
                      style={[
                        s.progressBarFill,
                        {
                          width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={s.progressStats}>
                    {progress.processed} of {progress.total} checked ({progress.matched} matched)
                  </Text>
                </>
              )}

              <View style={s.buttonRow}>
                <TouchableOpacity style={s.cancelButton} onPress={handleClose}>
                  <Text style={s.cancelButtonText}>STOP</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: sp.md,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surfaceContainer,
    borderRadius: r.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
  },
  title: {
    ...t.caption,
    color: colors.textPrimary,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  closeButton: {
    padding: sp.xs,
  },
  body: {
    gap: sp.md,
  },
  description: {
    ...t.body,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    ...t.body,
    color: colors.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  cancelButtonText: {
    ...t.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  primaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: r.md,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    ...t.caption,
    color: colors.onAccent,
    fontWeight: '700',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceContainerHigh,
    padding: 12,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  previewMeta: {
    flex: 1,
    gap: 4,
  },
  previewTitle: {
    ...t.titleMd,
    color: colors.textPrimary,
    fontSize: 15,
  },
  previewCount: {
    ...t.caption,
    color: colors.textSecondary,
  },
  importNote: {
    ...t.body,
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  progressTitle: {
    ...t.body,
    textAlign: 'center',
    color: colors.textPrimary,
    fontWeight: '600',
  },
  progressTrack: {
    ...t.caption,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  progressStats: {
    ...t.caption,
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 11,
  },
});
