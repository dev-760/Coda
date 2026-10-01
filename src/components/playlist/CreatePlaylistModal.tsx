import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { colors, r, sp, t } from '../../theme/theme';
import Icon from '../ui/Icon';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string, color?: string, icon?: string) => Promise<void>;
  isLoading?: boolean;
}

const COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#64748b', // Slate
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
  'lightning',
  'rocket',
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  visible,
  onClose,
  onCreate,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      await onCreate(name.trim(), description.trim(), selectedColor, selectedIcon);
      // Reset form
      setName('');
      setDescription('');
      setSelectedColor(COLORS[0]);
      setSelectedIcon(ICONS[0]);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create playlist');
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
            <Text style={[t.titleLg, { color: colors.onSurface }]}>Create Playlist</Text>
            <TouchableOpacity onPress={onClose} style={s.closeButton}>
              <Icon name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.content}>
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
                      <Icon name="checkmark" size={16} color="#fff" />
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
                <Icon name={selectedIcon} size={32} color="#fff" />
                <Text style={[s.previewName, { color: '#fff' }]}>{name || 'Playlist Name'}</Text>
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
              <Text style={[t.labelMd, { color: '#fff' }]}>Create</Text>
            </TouchableOpacity>
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
    borderColor: '#fff',
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