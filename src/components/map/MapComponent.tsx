import { useTheme } from "@/hooks/useTheme";
import { Coordinates, EdgePadding, MapMarker, MapRegion } from "@/types/map";
import { MAP_CONFIG } from "@/utils/constants";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";

// Default centre: University of Ibadan main campus
const DEFAULT_REGION: MapRegion = {
  latitude: 7.4453,
  longitude: 3.8993,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export interface MapComponentProps {
  initialRegion?: MapRegion;
  markers?: MapMarker[];
  routeCoordinates?: Coordinates[];
  circle?: {
    center: Coordinates;
    radius: number;
    fillColor?: string;
    strokeColor?: string;
  };
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  zoomEnabled?: boolean;
  scrollEnabled?: boolean;
  rotateEnabled?: boolean;
  onRegionChange?: (region: Region) => void;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (coordinate: Coordinates) => void;
  onMapReady?: () => void;
  style?: any;
  children?: React.ReactNode;
}

export interface MapComponentRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  fitToCoordinates: (
    coordinates: Coordinates[],
    edgePadding?: EdgePadding,
  ) => void;
  getCurrentRegion: () => Promise<Region | undefined>;
}

export const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(
  (
    {
      initialRegion = DEFAULT_REGION,
      markers = [],
      routeCoordinates = [],
      circle,
      showUserLocation = true,
      followUserLocation = false,
      showsMyLocationButton = true,
      showsCompass = true,
      showsScale = Platform.OS === "android",
      zoomEnabled = true,
      scrollEnabled = true,
      rotateEnabled = true,
      onRegionChange,
      onMarkerPress,
      onMapPress,
      onMapReady,
      style,
      children,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (
        region: MapRegion,
        duration = MAP_CONFIG.animationDuration,
      ) => {
        mapRef.current?.animateToRegion(region, duration);
      },

      fitToCoordinates: (
        coordinates: Coordinates[],
        edgePadding = MAP_CONFIG.edgePadding,
      ) => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding,
          animated: true,
        });
      },

      getCurrentRegion: async () => {
        const camera = await mapRef.current?.getCamera();
        if (!camera) return undefined;
        return {
          latitude: camera.center.latitude,
          longitude: camera.center.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
      },
    }));

    const getMarkerColor = (marker: MapMarker): string => {
      if (marker.color) return marker.color;

      switch (marker.type) {
        case "passenger":
          return colors.primary;
        case "driver":
          return colors.info;
        case "pickup":
          return colors.success;
        case "dropoff":
        case "destination":
          return colors.error;
        case "campus_location":
          return colors.textMuted;
        default:
          return colors.primary;
      }
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
      },
      map: {
        width: "100%",
        height: "100%",
      },
    });

    return (
      <View style={[styles.container, style]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={showUserLocation}
          followsUserLocation={followUserLocation}
          showsMyLocationButton={showsMyLocationButton}
          showsCompass={showsCompass}
          showsScale={showsScale}
          zoomEnabled={zoomEnabled}
          scrollEnabled={scrollEnabled}
          rotateEnabled={rotateEnabled}
          toolbarEnabled={false}
          onRegionChangeComplete={onRegionChange}
          onPress={(event) => onMapPress?.(event.nativeEvent.coordinate)}
          onMapReady={onMapReady}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
              pinColor={getMarkerColor(marker)}
              onPress={() => onMarkerPress?.(marker.id)}
            >
              {marker.icon && marker.icon}
            </Marker>
          ))}

          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}

          {circle && (
            <Circle
              center={circle.center}
              radius={circle.radius}
              fillColor={circle.fillColor || "rgba(59, 130, 246, 0.1)"}
              strokeColor={circle.strokeColor || colors.primary}
              strokeWidth={2}
            />
          )}

          {children}
        </MapView>
      </View>
    );
  },
);

MapComponent.displayName = "MapComponent";

export default MapComponent;
