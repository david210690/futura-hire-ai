import { useState, useEffect, useCallback } from 'react';

const TOUR_STORAGE_KEY = 'futurhire_tour_completed';

export function useProductTour(role: 'recruiter' | 'candidate') {
  const [hasCompletedTour, setHasCompletedTour] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`${TOUR_STORAGE_KEY}_${role}`);
    setHasCompletedTour(stored === 'true');
  }, [role]);

  const completeTour = useCallback(() => {
    localStorage.setItem(`${TOUR_STORAGE_KEY}_${role}`, 'true');
    setHasCompletedTour(true);
  }, [role]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(`${TOUR_STORAGE_KEY}_${role}`);
    setHasCompletedTour(false);
  }, [role]);

  return {
    hasCompletedTour,
    completeTour,
    resetTour,
    shouldShowTour: hasCompletedTour === false,
  };
}
