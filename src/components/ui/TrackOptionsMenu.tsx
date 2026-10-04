import React from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Track } from '../../providers/types';
import Icon from './Icon';
import { useLibraryStore } from '../../store/libraryStore';
import { useQueueStore } from '../../store/queueStore';
import { useDownloadStore } from '../../downloads/downloadStore';
import { useSettingsStore } from '../../store/settingsStore';
import { audioService } from '../../audio/AudioService';
import { colors, FONTS, r, t } from '../../theme/theme';

interface TrackOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  track: Track | null;
  onAddToPlaylist?: (track: Track) => void;
}

/**
 * Track options as a full-height sheet.
 *
 * The quick actions sit in a row of four up top because favorite, queue, share
 * and offline are the things reached for constantly. Everything else is grouped
 * underneath, since these are occasional.
 */
export default function TrackOptionsMenu({
  visible,
  onClose,
  track,
  onAddToPlaylist,
}: TrackOptionsMenuProps) {
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore();
  const downloadStatus = useDownloadStore((state) =>
    track ? state.getDownloadStatus(track.id)?.status ?? null : null,
  );
  const downloadTrack = useDownloadStore((state) => state.downloadTrack);
  const deleteDownload = useDownloadStore((state) => state.deleteDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);
  const hifiQuality = useSettingsStore((state) => state.audio.hifiAudioQuality);

  if (!track) return null;

  const inCollection = isFavorite(track.id);
  const isDownloaded = downloadStatus === 'completed';

  const handleToggleCollection = async () => {
    if (inCollection) await removeFavorite(track.id);
    else await addFavorite(track);
    onClose();
  };

  const handleDownload = async () => {
    onClose();
    try {
      if (downloadStatus === 'completed') {
        await deleteDownload(track.id);
        return;
      }
      if (downloadStatus === 'downloading' || downloadStatus === 'pending') {
        await cancelDownload(track.id);
        return;
      }
      await downloadTrack(track);
    } catch {
      Alert.alert(
        'Download failed',
        'Check your connection and try again. If you set Wi-Fi only, downloads wait for Wi-Fi.',
      );
    }
  };

  const handleShare = async () => {
    onClose();
    try {
      await Share.share({ message: `Listen to "${track.title}" by ${track.artist} on Luma` });
    } catch {
      // The user dismissed the share sheet.
    }
  };

  const handleGoToArtist = () => {
    onClose();
    router.push({
      pathname: '/artist' as any,
      params: { name: track.artist, id: (track as any).artistId || '' },
    });
  };

  const handleGoToAlbum = () => {
    onClose();
    router.push({
      pathname: '/album' as any,
      params: {
        title: track.album || track.title,
        artist: track.artist,
        coverUrl: track.coverUrl || '',
      },
    });
  };

  const handleAddToPlaylist = () => {
    onClose();
    if (onAddToPlaylist) {
      onAddToPlaylist(track);
      return;
    }
    Alert.alert('Add to playlist', 'Open a playlist from your collection to add this track.');
  };

  const handleAddToQueue = () => {
    useQueueStore.getState().addToQueue(track);
    onClose();
  };

  const handleCredits = () => {
    onClose();
    Alert.alert(
      'Song Credits',
      `Title: ${track.title}\nArtist: ${track.artist}\nAlbum: ${track.album || 'Single'}`,
    );
  };

  /** Short fidelity badge for the track header. */
  const formatBadge = (() => {
    const q = hifiQuality ?? '';
    if (/24\/192/i.test(q)) return 'FLAC 24/192';
    if (/24\/96/i.test(q)) return 'FLAC 24/96';
    if (/320/i.test(q)) return 'AAC 320';
    return 'AAC 160';
  })();

  const Row = ({
    icon,
    label,
    detail,
    onPress,
    trailing,
  }: {
    icon: string;
    label: string;
    detail?: string;
    onPress: () => void;
    trailing?: React.ReactNode;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
    >
      <View style={s.rowIcon}>
        <Icon name={icon} size={16} color={colors.onSurfaceVariant} />
      </View>
      <View style={s.rowText}>
        <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
        {!!detail && <Text style={s.rowDetail} numberOfLines={1}>{detail}</Text>}
      </View>
      {trailing ?? <Icon name="chevron-forward" size={16} color={colors.outlineText} />}
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} accessibilityLabel="Close options" />
      <View style={s.sheet}>
        {/* Track header */}
        <View style={s.trackHeader}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={s.art} />
          ) : (
            <View style={[s.art, s.artFallback]}>
              <Icon name="musical-note" size={18} color={colors.outlineText} />
            </View>
          )}
          <View style={s.trackMeta}>
            <View style={s.trackTitleLine}>
              <Text numberOfLines={1} style={s.trackTitle}>{track.title}</Text>
              {inCollection && <View style={s.favDot} />}
            </View>
            <Text numberOfLines={1} style={s.trackArtist}>
              {[track.artist, track.album].filter(Boolean).join(' • ')}
            </Text>
          </View>
          <View style={s.formatBadge}>
            <Text style={s.formatText}>{formatBadge}</Text>
          </View>
        </View>

        <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
          {/* Quick actions */}
          <View style={s.quickRow}>
            <Pressable
              onPress={handleToggleCollection}
              style={({ pressed }) => [s.quickAction, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={inCollection ? 'Remove from favorites' : 'Favorite'}
            >
              <Icon
                name={inCollection ? 'heart' : 'heart-outline'}
                size={18}
                color={colors.onSurface}
              />
              <Text style={s.quickLabel}>FAVORITE</Text>
            </Pressable>

            <Pressable
              onPress={handleAddToPlaylist}
              style={({ pressed }) => [s.quickAction, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Add to playlist"
            >
              <Icon name="list" size={18} color={colors.onSurface} />
              <Text style={s.quickLabel}>ADD TO…</Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [s.quickAction, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <Icon name="share-outline" size={18} color={colors.onSurface} />
              <Text style={s.quickLabel}>SHARE</Text>
            </Pressable>

            <Pressable
              onPress={handleDownload}
              style={({ pressed }) => [s.quickAction, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel={isDownloaded ? 'Remove download' : 'Download for offline'}
            >
              <Icon
                name={isDownloaded ? 'checkmark-circle' : 'arrow-down-circle-outline'}
                size={18}
                color={colors.onSurface}
              />
              <Text style={s.quickLabel}>OFFLINE</Text>
            </Pressable>
          </View>

          <Row
                      icon="list"
                      label="Add to Up Next Queue"
                      detail="Append to tail of session queue"
                      onPress={handleAddToQueue}
                      trailing={<Icon name="add" size={18} color={colors.onSurfaceVariant} />}
                    />

          <Text style={s.sectionLabel}>CONTEXT &amp; CREDITS</Text>
          <Row
            icon="person-outline"
            label="Go to Artist"
            detail={`${track.artist}`}
            onPress={handleGoToArtist}
          />
          <Row
            icon="disc-outline"
            label="Go to Album"
            detail={track.album ?? 'Single'}
            onPress={handleGoToAlbum}
          />
          <Row
            icon="information-circle-outline"
            label="Song Credits"
            detail={`Produced by ${track.artist}`}
            onPress={handleCredits}
          />

          </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '92%',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: r.lg,
    borderTopRightRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  pressed: {
    opacity: 0.7,
  },

  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainer,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
    color: colors.onSurface,
  },
  favDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onSurface,
  },
  trackArtist: {
    ...t.bodySm,
    color: colors.outlineText,
  },

  body: {
    paddingBottom: 24,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
  },
  quickLabel: {
    fontSize: 9,
    letterSpacing: 0.4,
    color: colors.outlineText,
  },

  sectionLabel: {
    ...t.labelSm,
    color: colors.outlineText,
    marginTop: 20,
    marginBottom: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: r.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    ...t.titleMd,
    color: colors.onSurface,
  },
  rowDetail: {
      ...t.bodySm,
      color: colors.outlineText,
    },

    formatBadge: {
    paddingHorizontal: 10,
    height: 22,
    justifyContent: 'center',
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainerHighest,
  },
  formatBadgeActive: {
    backgroundColor: colors.onSurface,
  },
  formatText: {
    fontSize: 9,
    letterSpacing: 0.4,
    color: colors.onSurfaceVariant,
  },
  formatTextActive: {
    color: colors.onPrimary,
  },

  });
