import { SUPPORTED_BENGALURU_PIN_CODES } from '../../config/serviceAreas';

const approvedPincodes = new Set<string>(SUPPORTED_BENGALURU_PIN_CODES);

export type DeliveryServiceStatus = 'unknown' | 'supported' | 'unsupported';

export interface DetectedDeliveryLocation {
  locality: string;
  pincode: string;
}

export function normalizeBengaluruPincode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function isApprovedBengaluruPincode(value: string): boolean {
  return approvedPincodes.has(normalizeBengaluruPincode(value));
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<DetectedDeliveryLocation> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    addressdetails: '1',
    zoom: '18',
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Location lookup failed.');
  }

  const result = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string | undefined>;
  };
  const address = result.address || {};
  const locality =
    address.neighbourhood ||
    address.suburb ||
    address.city_district ||
    address.city ||
    address.town ||
    address.village ||
    result.display_name?.split(',')[0]?.trim();
  const pincode = normalizeBengaluruPincode(address.postcode || '');

  if (!locality || pincode.length !== 6) {
    throw new Error('We could not determine a complete delivery location.');
  }

  return { locality, pincode };
}
