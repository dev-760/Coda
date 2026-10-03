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
import { audioService } from '../../audio/AudioService';
import { useDownloadStore } from '../../downloads/downloadStore';
import { colors, FONTS, r, t } from '../../theme/theme';

interface TrackOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  track: Track | null;
  onAddToPlaylist?: (track: Track) => void;
}

/**
 * Track options, as a drawer card with the four grouped sections from the
 * spec. Grouping is the point: queue actions, where to go, audio handling and
 * utilities are separate concerns, and one flat list buries them.
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

  if (!track) return null;

  const inCollection = isFavorite(track.id);

  const handleToggleCollection = async () => {
    if (inCollection) {
      await removeFavorite(track.id);
    } else {
      await addFavorite(track);
    }
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
      params: { title: track.album || track.title, artist: track.artist, coverUrl: track.coverUrl || '' },
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

  const handlePlayNext = () => {
    useQueueStore.getState().playNext(track);
    onClose();
  };

  const handleAddToQueue = () => {
    useQueueStore.getState().addToQueue(track);
    onClose();
  };

  const handleTrackRadio = async () => {
    onClose();
    useQueueStore.getState().playContext([track], 0, {
      type: 'radio',
      name: `${track.title} radio`,
    });
    await audioService.playTrack(track);
  };

  const handleShare = async () => {
    onClose();
    try {
      await Share.share({ message: `Listen to "${track.title}" by ${track.artist} on Luma` });
    } catch {
      // The user dismissed the share sheet.
    }
  };

  const handleCredits = () => {
    onClose();
    Alert.alert(
      'Credits',
      `Title: ${track.title}\nArtist: ${track.artist}\nAlbum: ${track.album || 'Single'}`,
    );
  };

  const Row = ({
    label,
    icon,
    onPress,
    badge,
    showChevron = false,
  }: {
    label: string;
    icon?: string;
    onPress: () => void;
    badge?: string;
    showChevron?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {!!icon && <Icon name={icon} size={16} color={colors.onSurfaceVariant} />}
      <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
      {!!badge && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      )}
      {showChevron && <Icon name="chevron-forward" size={16} color={colors.outlineText} />}
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} accessibilityLabel="Close options" />
      <View style={s.sheet}>
        <View style={s.handle} />

        {/* Track header */}
        <View style={s.trackHeader}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={s.art} />
          ) : (
            <View style={[s.art, s.artPlaceholder]}>
              <Icon name="musical-notes" size={18} color={colors.outlineText} />
            </View>
          )}
          <View style={s.trackInfo}>
            <Text numberOfLines={1} style={s.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={s.trackArtist}>{track.artist}</Text>
          </View>
          {inCollection && (
            <View style={s.badge}>
              <Text style={s.badgeText}>SAVED</Text>
            </View>
          )}
        </View>

        <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>Queue</Text>
          <Row icon="play-forward" label="Play next" onPress={handlePlayNext} />
          <Row icon="list" label="Add to queue" onPress={handleAddToQueue} />
          <Row icon="radio-outline" label="Track radio" onPress={handleTrackRadio} />

          <Text style={s.sectionLabel}>Library</Text>
          <Row
            icon={inCollection ? 'heart' : 'heart-outline'}
            label={inCollection ? 'Remove from collection' : 'Add to collection'}
            onPress={handleToggleCollection}
          />
          <Row icon="albums-outline" label="Add to playlist" onPress={handleAddToPlaylist} showChevron />
          <Row icon="arrow-down-circle-outline" label="On this device" onPress={handleDownload} />

          <Text style={s.sectionLabel}>Metadata</Text>
          <Row icon="disc-outline" label="Go to album" onPress={handleGoToAlbum} showChevron />
          <Row icon="person-outline" label="Go to artist" onPress={handleGoToArtist} showChevron />
          <Row icon="information-circle-outline" label="Credits" onPress={handleCredits} />

          <Text style={s.sectionLabel}>Utilities</Text>
          <Row icon="share-outline" label="Share" onPress={handleShare} />
        </ScrollView>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={s.closeText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    maxHeight: '88%',
    paddingTop: 12,
    paddingBottom: 24,
    borderRadius: r.lg,
    backgroundColor: colors.surfaceVariant,
  },
  pressed: {
    opacity: 0.7,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHighest,
    marginBottom: 12,
  },

  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: r.sm,
    backgroundColor: colors.surfaceContainer,
  },
  artPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  trackArtist: {
    ...t.bodyMd,
    color: colors.outlineText,
  },

  list: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    ...t.labelSm,
    color: colors.outlineText,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  rowLabel: {
    flex: 1,
    ...t.body,
    color: colors.onSurface,
  },
  badge: {
    paddingHorizontal: 8,
    height: 18,
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHighest,
  },
  badgeText: {
    ...t.micro,
    color: colors.onSurface,
    textTransform: 'uppercase',
  },

  closeBtn: {
    marginTop: 16,
    marginHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.pill,
    backgroundColor: colors.surfaceContainerHigh,
  },
  closeText: {
    ...t.labelMd,
    color: colors.onSurface,
  },
});