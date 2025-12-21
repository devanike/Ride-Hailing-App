import { useTheme } from '@/hooks/useTheme';
import { Camera, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ImageUpload {
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  cloudinaryUrl?: string;
}

interface PhotoUploadGridProps {
  photos: ImageUpload[];
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  maxPhotos?: number;
  label: string;
  error?: string;
}

export const PhotoUploadGrid: React.FC<PhotoUploadGridProps> = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
  maxPhotos = 4,
  label,
  error,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.base,
    },
    label: {
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    photoBox: {
      width: 100,
      height: 100,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border.light,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.gray,
    },
    photoContainer: {
      position: 'relative',
      width: 100,
      height: 100,
    },
    photo: {
      width: '100%',
      height: '100%',
      borderRadius: borderRadius.md,
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: colors.status.error,
      borderRadius: borderRadius.full,
      padding: spacing.xs,
    },
    error: {
      fontSize: typography.sizes.sm,
      color: colors.status.error,
      marginTop: spacing.xs,
      marginLeft: spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemovePhoto(index)}
            >
              <Trash2 size={16} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < maxPhotos && (
          <TouchableOpacity style={styles.photoBox} onPress={onAddPhoto}>
            <Camera size={24} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};