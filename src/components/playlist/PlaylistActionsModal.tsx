import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, r, sp, t } from '../../theme/theme';
import Icon from '../ui/Icon';
import { Playlist } from '../../store/libraryStore';

interface PlaylistActionsModalProps {
  visible: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare?: () => void;
  onPlay: () => void;
  onShufflePlay?: () => void;
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
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  const actions = [
    {
      icon: 'play',
      label: 'Play Now',
      onPress: () => {
        onPlay();
        onClose();
      },
    },
    onShufflePlay ? {
      icon: 'shuffle',
      label: 'Shuffle Play',
      onPress: () => {
        onShufflePlay();
        onClose();
      },
    } : null,
    {
      icon: 'pencil',
      label: 'Edit',
      onPress: () => {
        onEdit();
        onClose();
      },
    },
    {
      icon: 'copy',
      label: 'Duplicate',
      onPress: () => {
        onDuplicate();
        onClose();
      },
    },
    onShare ? {
      icon: 'share',
      label: 'Share',
      onPress: () => {
        onShare();
        onClose();
      },
    } : null,
    {
      icon: 'trash',
      label: 'Delete',
      onPress: handleDelete,
      destructive: true,
    },
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
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
              <TouchableOpacity
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
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.cancelButton} onPress={onClose}>
            <Text style={[t.labelMd, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
  destructiveAction: {
    // Can add special styling for destructive actions if needed
  },
  cancelButton: {
    padding: sp.lg,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
});