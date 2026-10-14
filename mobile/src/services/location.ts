import * as Location from 'expo-location';

import { LOCATION_TIMEOUT_MS } from '@/constants/location';
import type { ReportLocation } from '@/types/report';

export class LocationTimeoutError extends Error {
  constructor() {
    super('Location request timed out');
    this.name = 'LocationTimeoutError';
  }
}
const REVERSE_GEOCODE_TIMEOUT_MS = 5_000;

function joinParts(parts: (string | null | undefined)[], separator: string) {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(separator);
}

function formatAddress(address: Location.LocationGeocodedAddress): string | null {
  const street = joinParts([address.street, address.streetNumber], ' ');
  const firstLine = joinParts([address.district, street], ', ');
  const secondLine = joinParts([address.subregion ?? address.city, address.region], ' / ');
  return joinParts([firstLine, secondLine], '\n') || address.formattedAddress || null;
}

export function getLocationPrecision(permission: Location.LocationPermissionResponse): ReportLocation['precision'] {
  if (permission.ios?.accuracy === 'reduced' || permission.android?.accuracy === 'coarse') return 'approximate';
  return 'precise';
}

async function getPositionWithTimeout() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new LocationTimeoutError()), LOCATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeout,
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function getCurrentReportLocation(precision: ReportLocation['precision']): Promise<ReportLocation> {
  const position = await getPositionWithTimeout();
  const { latitude, longitude, accuracy } = position.coords;
  let address: string | null = null;
  let geocoded: Location.LocationGeocodedAddress | null = null;

  try {
    const addresses = await Promise.race([Location.reverseGeocodeAsync({ latitude, longitude }), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Reverse geocode timeout')), REVERSE_GEOCODE_TIMEOUT_MS))]);
    if (addresses[0]) { geocoded = addresses[0]; address = formatAddress(addresses[0]); }
  } catch {
    // Koordinatlar kullanılabilir olduğundan reverse geocode hatası konumu geçersiz kılmaz.
  }

  return {
    latitude,
    longitude,
    accuracy,
    address,
    capturedAt: position.timestamp,
    isMocked: position.mocked ?? null,
    precision,
    city: geocoded?.city ?? null,
    subregion: geocoded?.subregion ?? null,
    district: geocoded?.district ?? null,
    postalCode: geocoded?.postalCode ?? null,
    countryCode: geocoded?.isoCountryCode ?? null,
  };
}
