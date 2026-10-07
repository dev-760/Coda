import React from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Alert } from 'react-native';
import { colors, r, sp, t } from '../../theme/theme';
import Icon from '../ui/Icon';
import { Playlist } from '../../store/libraryStore';

interface PlaylistActionsModalProps {
  visible: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onPlay?: () => void;
  onShufflePlay?: () => void;
  onDownload?: () => void;
}

export const PlaylistActionsModal: React.FC<PlaylistActionsModalProps> = ({
  visible,
  onClose,
  playlist,
  onEdit,
  onDuplicate,
  onDelete,
  onShare,
  onPlay,
  onShufflePlay,
  onDownload,
}) => {
  // The caller clears the selection to dismiss the sheet, so a render can land
  // here with a null playlist while the modal is still mounted.
  if (!playlist) return null;

  const handleDelete = () => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  const actions = [
    onPlay ? {
      icon: 'play',
      label: 'Play Now',
      onPress: () => {
        onPlay();
        onClose();
      },
    } : null,
    onShufflePlay ? {
      icon: 'shuffle',
      label: 'Shuffle Play',
      onPress: () => {
        onShufflePlay();
        onClose();
      },
    } : null,
    onDownload ? {
      icon: 'download',
      label: 'Download',
      onPress: () => {
        onDownload();
        onClose();
      },
    } : null,
    onEdit ? {
      icon: 'pencil',
      label: 'Edit',
      onPress: () => {
        onEdit();
        onClose();
      },
    } : null,
    onDuplicate ? {
      icon: 'copy',
      label: 'Duplicate',
      onPress: () => {
        onDuplicate();
        onClose();
      },
    } : null,
    onShare ? {
      icon: 'share',
      label: 'Share',
      onPress: () => {
        onShare();
        onClose();
      },
    } : null,
    onDelete ? {
      icon: 'trash',
      label: 'Delete',
      onPress: handleDelete,
      destructive: true,
    } : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.container}>
          <View style={s.header}>
            <View style={[s.playlistHeader, { backgroundColor: playlist.color || colors.primary }]}>
              <Icon name={playlist.icon || 'musical-notes'} size={32} color={colors.onSurface} />
              <Text style={[s.playlistName, { color: colors.onSurface }]}>{playlist.name}</Text>
              <Text style={[s.trackCount, { color: 'rgba(255,255,255,0.8)' }]}>
                {playlist.tracks.length} tracks
              </Text>
            </View>
          </View>

          <View style={s.actionsContainer}>
            {actions.map((action, index) => (
              <Pressable
                key={index}
                style={[s.actionItem, action.destructive && s.destructiveAction]}
                onPress={action.onPress}
              >
                <Icon
                  name={action.icon as any}
                  size={24}
                  color={action.destructive ? colors.error : colors.onSurface}
                />
                <Text
                  style={[
                    t.bodyMd,
                    { color: action.destructive ? colors.error : colors.onSurface },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={s.cancelButton} onPress={onClose}>
            <Text style={[t.labelMd, { color: colors.primary }]}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
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
    paddingBottom: sp.xl,
  },
  header: {
    padding: sp.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  playlistHeader: {
    borderRadius: r.lg,
    padding: sp.lg,
    alignItems: 'center',
    gap: sp.xs,
  },
  playlistName: {
    ...t.titleLg,
    fontWeight: 'bold',
  },
  trackCount: {
    ...t.bodySm,
  },
  actionsContainer: {
    padding: sp.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sp.md,
    gap: sp.md,
    borderRadius: r.md,
  },
  destructiveAction: {},
  cancelButton: {
    padding: sp.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
});