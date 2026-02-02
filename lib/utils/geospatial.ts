import { Loader } from '@googlemaps/js-api-loader';

let mapsLoader: Loader | null = null;

function getMapsLoader(): Loader {
  if (!mapsLoader) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set');
    }
    mapsLoader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['geometry'],
    });
  }
  return mapsLoader;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

/**
 * Check if consumer is within vendor's delivery radius
 * @param consumerCoords - Consumer coordinates {lat, lng}
 * @param vendorCoords - Vendor coordinates {lat, lng}
 * @param maxRadiusKm - Maximum delivery radius in kilometers (default: 10km)
 */
export function isWithinDeliveryRadius(
  consumerCoords: { lat: number; lng: number },
  vendorCoords: { lat: number; lng: number },
  maxRadiusKm: number = 10
): boolean {
  const distance = calculateDistance(
    consumerCoords.lat,
    consumerCoords.lng,
    vendorCoords.lat,
    vendorCoords.lng
  );
  return distance <= maxRadiusKm;
}

/**
 * Geocode an address using Google Maps API
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const loader = getMapsLoader();
    const { Geocoder } = await loader.importLibrary('geocoding');
    const geocoder = new Geocoder();
    
    const response = await geocoder.geocode({ address });
    
    if (response.results && response.results.length > 0) {
      const location = response.results[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
