import { useTheme } from "@/hooks/useTheme";
import { Coordinates } from "@/types/map";
import { User } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";

/**
 * User Location Marker
 * Custom marker for user's current location
 */
interface UserMarkerProps {
  coordinate: Coordinates;
  accuracy?: number;
  onPress?: () => void;
}

export const UserMarker: React.FC<UserMarkerProps> = ({
  coordinate,
  accuracy,
  onPress,
}) => {
  const { colors, borderRadius, shadows } = useTheme();

  const styles = StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.surface,
      ...shadows.medium,
    },
  });

  return (
    <Marker coordinate={coordinate} onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <User size={16} color={colors.textInverse} />
        </View>
      </View>
    </Marker>
  );
};

export default UserMarker;
