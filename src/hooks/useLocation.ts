/**
 * useLocation Hook
 * React hook for accessing location services
 */

import {
  getCurrentLocation,
  hasLocationPermission,
  isLocationEnabled,
  requestLocationPermission,
  watchLocation,
} from '@/services/locationService';
import { Location, LocationPermissionStatus, LocationSubscription } from '@/types/location';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseLocationReturn {
  location: Location | null;
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
  permissionStatus: LocationPermissionStatus | null;
  requestPermission: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
}

/**
 * Hook for managing location state and permissions
 * @param watchPosition - Whether to continuously watch position updates
 * @returns Location state and control functions
 */
export const useLocation = (watchPosition: boolean = false): UseLocationReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus | null>(null);
  
  const subscriptionRef = useRef<LocationSubscription | null>(null);

  /**
   * Check permission status
   */
  const checkPermission = useCallback(async () => {
    try {
      const permitted = await hasLocationPermission();
      setHasPermission(permitted);
      setPermissionStatus(
        permitted ? LocationPermissionStatus.GRANTED : LocationPermissionStatus.DENIED
      );
    } catch (err) {
      console.error('Error checking permission:', err);
      setHasPermission(false);
    }
  }, []);

  /**
   * Get current location (one-time)
   */
  const refreshLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const enabled = await isLocationEnabled();
      if (!enabled) {
        setError('Location services are disabled');
        return;
      }

      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
    } catch (err) {
      console.error('Error getting location:', err);
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async () => {
    try {
      setLoading(true);
      const status = await requestLocationPermission();
      setPermissionStatus(status);
      setHasPermission(status === LocationPermissionStatus.GRANTED);
      
      if (status === LocationPermissionStatus.GRANTED) {
        await refreshLocation();
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to request permission');
    } finally {
      setLoading(false);
    }
  }, [refreshLocation]);

  /**
   * Start watching location updates
   */
  const startWatching = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }

      const newSubscription = await watchLocation((newLocation) => {
        setLocation(newLocation);
        setError(null);
      });

      subscriptionRef.current = newSubscription;
    } catch (err) {
      console.error('Error watching location:', err);
      setError(err instanceof Error ? err.message : 'Failed to watch location');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Stop watching location updates
   */
  const stopWatching = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  /**
   * Auto-watch if enabled
   */
  useEffect(() => {
    if (watchPosition && hasPermission) {
      startWatching();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
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