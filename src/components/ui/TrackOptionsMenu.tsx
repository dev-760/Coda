import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, ScrollView, Alert, Share } from 'react-native';
import { Track } from '../../providers/types';
import Icon from './Icon';
import { useLibraryStore } from '../../store/libraryStore';
import { audioService } from '../../audio/AudioService';
import { useDownloadStore } from '../../downloads/downloadStore';
import { useRouter } from 'expo-router';

interface TrackOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  track: Track | null;
  onAddToPlaylist?: (track: Track) => void;
}

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
      Alert.alert('Collection', `Removed "${track.title}" from your collection.`);
    } else {
      await addFavorite(track);
      Alert.alert('Collection', `Added "${track.title}" to your collection.`);
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
    } catch (error) {
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
      params: { name: track.artist, id: (track as any).artistId || '' }
    });
  };

  const handleGoToAlbum = () => {
    onClose();
    router.push({
      pathname: '/album' as any,
      params: { title: track.album || track.title, artist: track.artist, coverUrl: track.coverUrl || '' }
    });
  };

  const handleTrackRadio = async () => {
    onClose();
    await audioService.playTrack(track);
  };

  const handleShare = async () => {
    onClose();
    try {
      await Share.share({
        message: `Listen to "${track.title}" by ${track.artist} on Luma`,
      });
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        {/* Track header */}
        <View style={s.trackHeader}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={s.art} />
          ) : (
            <View style={[s.art, s.artPlaceholder]}>
              <Icon name="musical-notes" size={24} color="#8e8e93" />
            </View>
          )}
          <View style={s.trackInfo}>
            <Text numberOfLines={1} style={s.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={s.trackArtist}>{track.artist}</Text>
          </View>
        </View>

        <View style={s.separator} />

        {/* Options list */}
        <ScrollView style={s.optionsList} showsVerticalScrollIndicator={false}>
          <Pressable style={s.optionRow} onPress={() => {
            onClose();
            if (onAddToPlaylist) onAddToPlaylist(track);
            else Alert.alert('Add to playlist', 'Open a playlist from your collection to add this track.');
          }}>
            <Text style={s.optionLabel}>Add to playlist</Text>
            <Icon name="chevron-forward" size={18} color="#8e8e93" />
          </Pressable>

          <Pressable style={s.optionRow} onPress={handleToggleCollection}>
            <Text style={s.optionLabel}>
              {inCollection ? 'Remove from My Collection' : 'Add to My Collection'}
            </Text>
          </Pressable>

          <Pressable style={s.optionRow} onPress={handleDownload}>
            <Text style={s.optionLabel}>
              {downloadStatus === 'completed'
                ? 'Remove download'
                : downloadStatus === 'downloading'
                  ? 'Cancel download'
                  : 'Download'}
            </Text>
            {downloadStatus === 'completed' && <Icon name="checkmark" size={18} color="#00e5bf" />}
          </Pressable>

          <Pressable style={s.optionRow} onPress={handleTrackRadio}>
            <Text style={s.optionLabel}>Go to track radio</Text>
          </Pressable>

          <Pressable style={s.optionRow} onPress={handleGoToAlbum}>
            <Text style={s.optionLabel}>Go to album</Text>
          </Pressable>

          <Pressable style={s.optionRow} onPress={handleCredits}>
            <Text style={s.optionLabel}>Credits</Text>
          </Pressable>

          <Pressable style={s.optionRow} onPress={handleGoToArtist}>
            <Text style={s.optionLabel}>Go to artist</Text>
            <Icon name="chevron-forward" size={18} color="#8e8e93" />
          </Pressable>

          <Pressable style={s.optionRow} onPress={handleShare}>
            <Text style={s.optionLabel}>Share</Text>
            <Icon name="chevron-forward" size={18} color="#8e8e93" />
          </Pressable>
        </ScrollView>

        {/* Close Button */}
        <Pressable style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeBtnText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#262626',
  },
  artPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  trackArtist: {
    fontSize: 13,
    color: '#8e8e93',
  },
  separator: {
    height: 1,
    backgroundColor: '#2c2c2e',
    marginBottom: 8,
  },
  optionsList: {
    maxHeight: 380,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#2c2c2e',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
