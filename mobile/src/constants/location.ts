export const LOCATION_TIMEOUT_MS = 12_000;
export const LOCATION_ACCURACY_GOOD_MAX_METERS = 50;
export const LOCATION_ACCURACY_WARNING_MAX_METERS = 100;

export type LocationAccuracyLevel = 'good' | 'warning' | 'poor' | 'unknown';

export function getLocationAccuracyLevel(accuracy: number | null): LocationAccuracyLevel {
  if (accuracy == null) return 'unknown';
  if (accuracy <= LOCATION_ACCURACY_GOOD_MAX_METERS) return 'good';
  if (accuracy <= LOCATION_ACCURACY_WARNING_MAX_METERS) return 'warning';
  return 'poor';
}
