import { useTheme } from '@/hooks/useTheme';
import { Coordinates, EdgePadding, MapMarker, MapRegion } from '@/types/map';
import { MAP_CONFIG } from '@/utils/constants';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';

/**
 * MapComponent Props
 */
export interface MapComponentProps {
  // Initial region
  initialRegion?: MapRegion;
  
  // Markers to display
  markers?: MapMarker[];
  
  // Route polyline coordinates
  routeCoordinates?: Coordinates[];
  
  // Circle overlay (for campus boundary, etc.)
  circle?: {
    center: Coordinates;
    radius: number;
    fillColor?: string;
    strokeColor?: string;
  };
  
  // User location
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  
  // Map controls
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  zoomEnabled?: boolean;
  scrollEnabled?: boolean;
  rotateEnabled?: boolean;
  
  // Callbacks
  onRegionChange?: (region: Region) => void;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (coordinate: Coordinates) => void;
  onMapReady?: () => void;
  
  // Style
  style?: any;
}

/**
 * Methods exposed via ref
 */
export interface MapComponentRef {
  animateToRegion: (region: MapRegion, duration?: number) => void;
  fitToCoordinates: (coordinates: Coordinates[], edgePadding?: EdgePadding) => void;
  getCurrentRegion: () => Promise<Region | undefined>;
}

export const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(
  (
    {
      initialRegion = MAP_CONFIG.initialRegion,
      markers = [],
      routeCoordinates = [],
      circle,
      showUserLocation = true,
      followUserLocation = false,
      showsMyLocationButton = true,
      showsCompass = true,
      showsScale = Platform.OS === 'android',
      zoomEnabled = true,
      scrollEnabled = true,
      rotateEnabled = true,
      onRegionChange,
      onMarkerPress,
      onMapPress,
      onMapReady,
      style,
    },
    ref
  ) => {
    const { colors } = useTheme();
    const mapRef = useRef<MapView>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MapRegion, duration = 300) => {
        mapRef.current?.animateToRegion(region, duration);
      },
      
      fitToCoordinates: (coordinates: Coordinates[], edgePadding = MAP_CONFIG.edgePadding) => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding,
          animated: true,
        });
      },
      
      getCurrentRegion: async () => {
        return await mapRef.current?.getCamera().then(camera => ({
          latitude: camera.center.latitude,
          longitude: camera.center.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }));
      },
    }));

    // Get marker color based on type
    const getMarkerColor = (marker: MapMarker): string => {
      if (marker.color) return marker.color;
      
      switch (marker.type) {
        case 'user':
          return colors.primary;
        case 'driver':
          return colors.accent;
        case 'pickup':
          return colors.status.success;
        case 'dropoff':
          return colors.status.error;
        case 'campus_location':
          return colors.status.info;
        default:
          return colors.primary;
      }
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
      },
      map: {
        width: '100%',
        height: '100%',
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
          onPress={(event) => {
            if (onMapPress) {
              onMapPress(event.nativeEvent.coordinate);
            }
          }}
          onMapReady={onMapReady}
        >
          {/* Markers */}
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

          {/* Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}

          {/* Circle Overlay */}
          {circle && (
            <Circle
              center={circle.center}
              radius={circle.radius}
              fillColor={circle.fillColor || 'rgba(59, 130, 246, 0.1)'}
              strokeColor={circle.strokeColor || colors.primary}
              strokeWidth={2}
            />
          )}
        </MapView>
      </View>
    );
  }
);

MapComponent.displayName = 'MapComponent';

export default MapComponent;