import { isLocationOnCampus } from '@/services/locationService';
import { Coordinates } from '@/types/map';
import { useCallback, useState } from 'react';

interface UseCampusBoundaryReturn {
  checkLocation: (location: Coordinates) => boolean;
  isOutsideCampus: boolean;
  showWarning: boolean;
  setShowWarning: (show: boolean) => void;
}

/**
 * Hook for checking if location is within campus boundaries
 */
export const useCampusBoundary = (): UseCampusBoundaryReturn => {
  const [isOutsideCampus, setIsOutsideCampus] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const checkLocation = useCallback((location: Coordinates): boolean => {
    const onCampus = isLocationOnCampus(location);
    setIsOutsideCampus(!onCampus);
    
    if (!onCampus) {
      setShowWarning(true);
    }
    
    return onCampus;
  }, []);

  return {
    checkLocation,
    isOutsideCampus,
    showWarning,
    setShowWarning,
  };
};

export default useCampusBoundary;