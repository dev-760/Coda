import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Track } from '../../providers/types';
import Icon from './Icon';
import CoverThumb from './CoverThumb';
import { AddToPlaylistModal } from '../playlist/AddToPlaylistModal';
import { useLibraryStore } from '../../store/libraryStore';
import { useQueueStore } from '../../store/queueStore';
import { useDownloadStore } from '../../downloads/downloadStore';
import { useSettingsStore } from '../../store/settingsStore';
import { colors, FONTS, r, t } from '../../theme/theme';

interface TrackOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  track: Track | null;
  onAddToPlaylist?: (track: Track) => void;
}

interface OptionRowProps {
  icon: string;
  label: string;
  detail?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
}

function OptionRow({ icon, label, detail, onPress, trailing }: OptionRowProps) {
  return (
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
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFavorite, addFavorite, removeFavorite } = useLibraryStore();
  const downloadStatus = useDownloadStore((state) =>
    track ? state.getDownloadStatus(track.id)?.status ?? null : null,
  );
  const downloadTrack = useDownloadStore((state) => state.downloadTrack);
  const deleteDownload = useDownloadStore((state) => state.deleteDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);
  const retryDownload = useDownloadStore((state) => state.retryDownload);
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
      if (downloadStatus === 'downloading') {
        await cancelDownload(track.id);
        return;
      }
      if (downloadStatus === 'paused' || downloadStatus === 'failed') {
        await retryDownload(track.id);
        return;
      }
      if (downloadStatus === 'pending') {
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
      await Share.share({ message: `Listen to "${track.title}" by ${track.artist} on Coda` });
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
    if (onAddToPlaylist) {
      onClose();
      onAddToPlaylist(track);
      return;
    }
    setShowAddToPlaylist(true);
  };

  const handlePlayNext = () => {
    useQueueStore.getState().playNext(track);
    onClose();
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

  return (
    <>
      <Modal visible={visible && !showAddToPlaylist} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} accessibilityLabel="Close options" />
      <View style={s.sheet}>
        <View style={s.grabber} />
        {/* Track header */}
        <View style={s.trackHeader}>
          <CoverThumb uri={track.coverUrl} size={50} borderRadius={10} />
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

        <ScrollView
          style={s.body}
          contentContainerStyle={[
            s.bodyContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick actions */}
          <View style={s.quickRow}>
            <Pressable
              onPress={handleToggleCollection}
              style={({ pressed }) => [
                s.quickAction,
                inCollection && s.quickActionActive,
                pressed && s.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={inCollection ? 'Remove from favorites' : 'Favorite'}
            >
              <Icon
                name={inCollection ? 'heart' : 'heart-outline'}
                size={20}
                color={inCollection ? '#FFFFFF' : colors.onSurface}
              />
              <Text style={[s.quickLabel, inCollection && s.quickLabelActive]}>FAVORITE</Text>
            </Pressable>

            <Pressable
              onPress={handleAddToPlaylist}
              style={({ pressed }) => [s.quickAction, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Add to playlist"
            >
              <Icon name="list" size={20} color={colors.onSurface} />
              <Text style={s.quickLabel}>ADD TO…</Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [s.quickAction, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <Icon name="share-outline" size={20} color={colors.onSurface} />
              <Text style={s.quickLabel}>SHARE</Text>
            </Pressable>

            <Pressable
              onPress={handleDownload}
              style={({ pressed }) => [
                s.quickAction,
                (isDownloaded || downloadStatus === 'downloading') && s.quickActionActive,
                pressed && s.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isDownloaded
                  ? 'Remove download'
                  : downloadStatus === 'downloading'
                  ? 'Cancel download'
                  : downloadStatus === 'failed' || downloadStatus === 'paused'
                  ? 'Retry download'
                  : 'Download for offline'
              }
            >
              <Icon
                name={
                  isDownloaded
                    ? 'download-done'
                    : downloadStatus === 'failed' || downloadStatus === 'paused'
                    ? 'retry'
                    : 'download'
                }
                size={20}
                color={isDownloaded || downloadStatus === 'downloading' ? '#FFFFFF' : colors.onSurface}
              />
              <Text style={[s.quickLabel, (isDownloaded || downloadStatus === 'downloading') && s.quickLabelActive]}>
                {isDownloaded
                  ? 'OFFLINE'
                  : downloadStatus === 'downloading'
                  ? 'SAVING'
                  : downloadStatus === 'pending'
                  ? 'QUEUED'
                  : downloadStatus === 'failed' || downloadStatus === 'paused'
                  ? 'RETRY'
                  : 'OFFLINE'}
              </Text>
            </Pressable>
          </View>

          <Text style={s.sectionLabel}>QUEUE &amp; PLAYBACK</Text>
          <OptionRow
            icon="play-forward"
            label="Play Next"
            detail="Play immediately after current track"
            onPress={handlePlayNext}
            trailing={<Icon name="add" size={18} color={colors.onSurfaceVariant} />}
          />
          <OptionRow
            icon="list"
            label="Add to Up Next Queue"
            detail="Append to tail of session queue"
            onPress={handleAddToQueue}
            trailing={<Icon name="add" size={18} color={colors.onSurfaceVariant} />}
          />

          <Text style={s.sectionLabel}>CONTEXT &amp; CREDITS</Text>
          <OptionRow
            icon="person-outline"
            label="Go to Artist"
            detail={`${track.artist}`}
            onPress={handleGoToArtist}
          />
          <OptionRow
            icon="disc-outline"
            label="Go to Album"
            detail={track.album ?? 'Single'}
            onPress={handleGoToAlbum}
          />
          <OptionRow
            icon="information-circle-outline"
            label="Song Credits"
            detail={`Produced by ${track.artist}`}
            onPress={handleCredits}
          />
        </ScrollView>
      </View>
    </Modal>
    {showAddToPlaylist && (
      <AddToPlaylistModal
        visible={showAddToPlaylist}
        track={track}
        onClose={() => {
          setShowAddToPlaylist(false);
          onClose();
        }}
      />
    )}
  </>
);
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    backgroundColor: '#18181B',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.7,
  },

  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  trackMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  trackTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackTitle: {
    fontFamily: FONTS.contentSemiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    flexShrink: 1,
    color: '#F4F4F5',
  },
  favDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onSurface,
  },
  trackArtist: {
    ...t.bodySm,
    fontSize: 13,
    color: '#A1A1AA',
  },

  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingTop: 4,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#222226',
    borderWidth: 1,
    borderColor: '#2E2E33',
  },
  quickActionActive: {
    backgroundColor: '#2E2E38',
    borderColor: '#3F3F46',
  },
  quickLabel: {
    ...t.monoMicro,
    fontSize: 10,
    fontWeight: '600',
    color: '#A1A1AA',
    letterSpacing: 0.5,
  },
  quickLabelActive: {
    color: '#FFFFFF',
  },

  sectionLabel: {
    ...t.label,
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 4,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222226',
    borderWidth: 1,
    borderColor: '#2E2E33',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowLabel: {
    fontFamily: FONTS.contentMedium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: '#FAFAFA',
  },
  rowDetail: {
    ...t.caption,
    fontSize: 12,
    color: '#A1A1AA',
  },

  formatBadge: {
    paddingHorizontal: 10,
    height: 24,
    justifyContent: 'center',
    borderRadius: r.full,
    backgroundColor: '#222226',
    borderWidth: 1,
    borderColor: '#2E2E33',
  },
  formatText: {
    ...t.monoMicro,
    fontSize: 10,
    fontWeight: '600',
    color: '#D4D4D8',
  },
});
