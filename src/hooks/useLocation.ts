import {
  getCurrentLocation,
  hasLocationPermission,
  isLocationEnabled,
  requestLocationPermission,
  watchLocation,
} from "@/services/locationService";
import {
  Location,
  LocationPermissionStatus,
  LocationPermissionStatusValue,
} from "@/types/location";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseLocationReturn {
  location: Location | null;
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
  permissionStatus: LocationPermissionStatusValue | null;
  requestPermission: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
}

export const useLocation = (
  watchPosition: boolean = false,
): UseLocationReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Using the exact type you defined in types/location.ts
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatusValue | null>(null);

  // watchLocation returns () => void, so we type the ref to match
  const subscriptionRef = useRef<(() => void) | null>(null);

  const checkPermission = useCallback(async () => {
    try {
      // hasLocationPermission returns a boolean
      const permitted = await hasLocationPermission();
      setHasPermission(permitted);
      setPermissionStatus(
        permitted
          ? LocationPermissionStatus.GRANTED
          : LocationPermissionStatus.DENIED,
      );
    } catch (err) {
      console.error("Error checking permission:", err);
      setHasPermission(false);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const enabled = await isLocationEnabled();
      if (!enabled) {
        setError("Location services are disabled");
        return;
      }

      // getCurrentLocation returns basic Coordinates
      const coords = await getCurrentLocation();

      // Safely map Coordinates to your Location interface
      setLocation({
        ...coords,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error("Error getting location:", err);
      setError(err instanceof Error ? err.message : "Failed to get location");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setLoading(true);
      // requestLocationPermission returns a boolean
      const isGranted = await requestLocationPermission();

      setPermissionStatus(
        isGranted
          ? LocationPermissionStatus.GRANTED
          : LocationPermissionStatus.DENIED,
      );
      setHasPermission(isGranted);

      if (isGranted) {
        await refreshLocation();
      }
    } catch (err) {
      console.error("Error requesting permission:", err);
      setError(
        err instanceof Error ? err.message : "Failed to request permission",
      );
    } finally {
      setLoading(false);
    }
  }, [refreshLocation]);

  const startWatching = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Clean up existing subscription if it exists
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }

      // watchLocation returns an unsubscribe function
      const unsubscribe = watchLocation((newLocation) => {
        setLocation(newLocation);
        setError(null);
      });

      subscriptionRef.current = unsubscribe;
    } catch (err) {
      console.error("Error watching location:", err);
      setError(err instanceof Error ? err.message : "Failed to watch location");
    } finally {
      setLoading(false);
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current(); // Execute the unsubscribe function
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    if (watchPosition && hasPermission) {
      startWatching();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [watchPosition, hasPermission, startWatching]);

  return {
    location,
    loading,
    error,
    hasPermission,
    permissionStatus,
    requestPermission,
    refreshLocation,
    startWatching,
    stopWatching,
  };
};

export default useLocation;
