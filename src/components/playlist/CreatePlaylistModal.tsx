import React, { useState } from 'react';
import { Platform, View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView } from 'react-native';
import { colors, r, sp, t } from '../../theme/theme';
import Icon from '../ui/Icon';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string, color?: string, icon?: string) => Promise<void>;
  isLoading?: boolean;
  initialPlaylist?: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  } | null;
}

/**
 * Playlist identity colours, drawn from the Coda structural ramp rather than a
 * saturated rainbow. Design.md rules out saturated purple and cyan states, so
 * these stay in the steel-to-warm family and read as one system.
 */
const COLORS = [
  '#6F7E88', // Steel
  '#8D8170', // Warm accent
  '#5A6B75', // Deep steel
  '#7D8794', // Slate
  '#A38F76', // Sand
  '#4A5463', // Graphite
  '#8A94A2', // Pewter
  '#6B6152', // Umber
  '#5F7180', // Harbour
  '#737D8C', // Ash
];

const ICONS = [
  'musical-notes',
  'heart',
  'star',
  'flame',
  'leaf',
  'sun',
  'moon',
  'cloud',
  'disc',
  'rocket',
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  visible,
  onClose,
  onCreate,
  isLoading = false,
  initialPlaylist = null,
}) => {
  const [name, setName] = useState(initialPlaylist?.name ?? '');
  const [description, setDescription] = useState(initialPlaylist?.description ?? '');
  const [selectedColor, setSelectedColor] = useState(initialPlaylist?.color ?? COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(initialPlaylist?.icon ?? ICONS[0]);

  React.useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (initialPlaylist) {
        setName(initialPlaylist.name || '');
        setDescription(initialPlaylist.description || '');
        setSelectedColor(initialPlaylist.color || COLORS[0]);
        setSelectedIcon(initialPlaylist.icon || ICONS[0]);
      } else {
        setName('');
        setDescription('');
        setSelectedColor(COLORS[0]);
        setSelectedIcon(ICONS[0]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, initialPlaylist]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      await onCreate(name.trim(), description.trim(), selectedColor, selectedIcon);
      if (!initialPlaylist) {
        setName('');
        setDescription('');
        setSelectedColor(COLORS[0]);
        setSelectedIcon(ICONS[0]);
      }
      onClose();
    } catch {
      Alert.alert('Error', initialPlaylist ? 'Failed to update playlist' : 'Failed to create playlist');
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
        <KeyboardAvoidingView
          style={s.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.container}>
            <View style={s.header}>
              <Text style={[t.titleLg, { color: colors.onSurface }]}>
                {initialPlaylist ? 'Edit Playlist' : 'Create Playlist'}
              </Text>
              <TouchableOpacity onPress={onClose} style={s.closeButton}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            {/* Name Input */}
            <View style={s.inputGroup}>
              <Text style={[t.labelMd, { color: colors.onSurface, marginBottom: sp.xs }]}>
                Playlist Name *
              </Text>
              <TextInput
                style={[s.input, { color: colors.onSurface, borderColor: colors.outline }]}
                placeholder="My Awesome Playlist"
                placeholderTextColor={colors.onSurfaceVariant}
                value={name}
                onChangeText={setName}
                maxLength={50}
              />
            </View>

            {/* Description Input */}
            <View style={s.inputGroup}>
              <Text style={[t.labelMd, { color: colors.onSurface, marginBottom: sp.xs }]}>
                Description
              </Text>
              <TextInput
                style={[s.textArea, { color: colors.onSurface, borderColor: colors.outline }]}
                placeholder="Add a description for your playlist..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            {/* Color Selection */}
            <View style={s.inputGroup}>
              <Text style={[t.labelMd, { color: colors.onSurface, marginBottom: sp.sm }]}>
                Color
              </Text>
              <View style={s.colorGrid}>
                {COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      s.colorButton,
                      { backgroundColor: color },
                      selectedColor === color && s.selectedColor,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Icon name="checkmark" size={16} color={colors.onSurface} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Icon Selection */}
            <View style={s.inputGroup}>
              <Text style={[t.labelMd, { color: colors.onSurface, marginBottom: sp.sm }]}>
                Icon
              </Text>
              <View style={s.iconGrid}>
                {ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      s.iconButton,
                      { backgroundColor: colors.surfaceContainer, borderColor: colors.outline },
                      selectedIcon === icon && { borderColor: selectedColor, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Icon
                      name={icon}
                      size={24}
                      color={selectedIcon === icon ? selectedColor : colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={s.preview}>
              <View style={[s.previewCard, { backgroundColor: selectedColor }]}>
                <Icon name={selectedIcon} size={32} color={colors.onSurface} />
                <Text style={[s.previewName, { color: colors.onSurface }]}>{name || 'Playlist Name'}</Text>
                {description && (
                  <Text style={[s.previewDesc, { color: 'rgba(255,255,255,0.8)' }]}>
                    {description}
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={s.footer}>
            <TouchableOpacity
              style={[s.button, s.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[t.labelMd, { color: colors.onSurface }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.button, s.createButton, { backgroundColor: selectedColor }]}
              onPress={handleCreate}
              disabled={isLoading || !name.trim()}
            >
              <Text style={[t.labelMd, { color: colors.onSurface }]}>
                {initialPlaylist ? 'Save' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  keyboardContainer: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: r.xl,
    borderTopRightRadius: r.xl,
    maxHeight: '90%',
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
  content: {
    padding: sp.lg,
    paddingBottom: sp.xl,
  },
  inputGroup: {
    marginBottom: sp.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: r.md,
    padding: sp.md,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: r.md,
    padding: sp.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: r.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: colors.onSurface,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.sm,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: r.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginTop: sp.lg,
  },
  previewCard: {
    borderRadius: r.lg,
    padding: sp.lg,
    alignItems: 'center',
    gap: sp.sm,
  },
  previewName: {
    ...t.titleMd,
    fontWeight: 'bold',
  },
  previewDesc: {
    ...t.bodySm,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: sp.md,
    padding: sp.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  button: {
    flex: 1,
    paddingVertical: sp.md,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceContainer,
  },
  createButton: {
    opacity: 1,
  },
});