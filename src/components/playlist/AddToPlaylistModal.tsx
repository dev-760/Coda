import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { colors, r, sp, t } from '../../theme/theme';
import Icon from '../ui/Icon';
import { useLibraryStore } from '../../store/libraryStore';
import { Track } from '../../providers/types';
import { showToast } from '../../store/toastStore';

interface AddToPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  track: Track;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  visible,
  onClose,
  track,
}) => {
  const { playlists, createPlaylist, addTrackToPlaylist } = useLibraryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !playlist.tracks.some(t => t.id === track.id)
  );

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await addTrackToPlaylist(playlistId, track);
      showToast(`Added "${track.title}" to playlist`, 'success');
      onClose();
    } catch {
      showToast('Failed to add track to playlist', 'error');
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) {
      showToast('Please enter a playlist name', 'warning');
      return;
    }

    try {
      setIsCreating(true);
      const newPlaylist = await createPlaylist(newPlaylistName.trim());
      await addTrackToPlaylist(newPlaylist.id, track);
      showToast(`Created playlist and added "${track.title}"`, 'success');
      setNewPlaylistName('');
      setIsCreating(false);
      onClose();
    } catch {
      setIsCreating(false);
      showToast('Failed to create playlist', 'error');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={[t.titleLg, { color: colors.onSurface }]}>Add to Playlist</Text>
            <Pressable onPress={onClose} style={s.closeButton}>
              <Icon name="close" size={24} color={colors.onSurface} />
            </Pressable>
          </View>

          {/* Track Info */}
          <View style={s.trackInfo}>
            <View style={s.trackThumbnail}>
              <Icon name="musical-notes" size={32} color={colors.onSurfaceVariant} />
            </View>
            <View style={s.trackDetails}>
              <Text style={[t.titleMd, { color: colors.onSurface }]} numberOfLines={1}>
                {track.title}
              </Text>
              <Text style={[t.bodySm, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
          </View>

          {/* Search */}
          <View style={s.searchContainer}>
            <Icon name="search" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={[s.searchInput, { color: colors.onSurface }]}
              placeholder="Search playlists..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Playlist List */}
          <ScrollView style={s.playlistList} contentContainerStyle={s.playlistListContent}>
            {filteredPlaylists.length === 0 ? (
              <View style={s.emptyState}>
                <Icon name="musical-notes" size={48} color={colors.onSurfaceVariant} />
                <Text style={[t.bodyMd, { color: colors.onSurfaceVariant, marginTop: sp.md }]}>
                  {searchQuery ? 'No playlists found' : 'No playlists available'}
                </Text>
              </View>
            ) : (
              filteredPlaylists.map((playlist) => (
                <Pressable
                  key={playlist.id}
                  style={s.playlistItem}
                  onPress={() => handleAddToPlaylist(playlist.id)}
                >
                  <View style={[s.playlistIcon, { backgroundColor: playlist.color || colors.primary }]}>
                    <Icon name={playlist.icon || 'musical-notes'} size={20} color={colors.onSurface} />
                  </View>
                  <View style={s.playlistInfo}>
                    <Text style={[t.bodyMd, { color: colors.onSurface }]}>{playlist.name}</Text>
                    <Text style={[t.bodySm, { color: colors.onSurfaceVariant }]}>
                      {playlist.tracks.length} tracks
                    </Text>
                  </View>
                  <Icon name="add-circle" size={24} color={colors.primary} />
                </Pressable>
              ))
            )}
          </ScrollView>

          {/* Create New Playlist */}
          <View style={s.createSection}>
            <Text style={[t.labelMd, { color: colors.onSurface, marginBottom: sp.sm }]}>
              Create New Playlist
            </Text>
            <View style={s.createRow}>
              <TextInput
                style={[s.createInput, { color: colors.onSurface, borderColor: colors.outline }]}
                placeholder="New playlist name"
                placeholderTextColor={colors.onSurfaceVariant}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
              />
              <Pressable
                style={[s.createButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateAndAdd}
                disabled={isCreating || !newPlaylistName.trim()}
              >
                <Icon name="add" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: r.xl,
    borderTopRightRadius: r.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: sp.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  closeButton: {
    padding: sp.xs,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp.lg,
    backgroundColor: colors.surfaceContainerLow,
    gap: sp.md,
  },
  trackThumbnail: {
    width: 50,
    height: 50,
    borderRadius: r.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackDetails: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: sp.lg,
    paddingHorizontal: sp.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: r.md,
    gap: sp.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: sp.md,
    fontSize: 16,
  },
  playlistList: {
    flex: 1,
  },
  playlistListContent: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: sp.xl,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: r.md,
    marginBottom: sp.sm,
    gap: sp.md,
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  createSection: {
    padding: sp.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  createRow: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  createInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: r.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.md,
    fontSize: 16,
  },
  createButton: {
    width: 50,
    height: 50,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});