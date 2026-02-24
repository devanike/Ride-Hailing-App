import { useTheme } from "@/hooks/useTheme";
import { Upload } from "lucide-react-native";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ImageUpload {
  uri: string;
  uploading: boolean;
  uploaded: boolean;
  cloudinaryUrl?: string;
}

interface DocumentUploadButtonProps {
  label: string;
  document: ImageUpload | null;
  onUpload: () => void;
  error?: string;
}

export const DocumentUploadButton: React.FC<DocumentUploadButtonProps> = ({
  label,
  document,
  onUpload,
  error,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      backgroundColor: colors.backgroundAlt,
    },
    preview: {
      width: 60,
      height: 40,
      borderRadius: borderRadius.sm,
    },
    text: {
      marginLeft: spacing.sm,
      fontSize: typography.sizes.sm,
      fontFamily: typography.fonts.bodyMedium,
      color: colors.textSecondary,
    },
    error: {
      fontSize: typography.sizes.sm,
      color: colors.error,
      marginTop: spacing.xs,
      marginLeft: spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onUpload}>
        {document ? (
          <Image source={{ uri: document.uri }} style={styles.preview} />
        ) : (
          <Upload size={20} color={colors.textMuted} />
        )}
        <Text style={styles.text}>
          {document ? "Change" : "Upload"} {label}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};
