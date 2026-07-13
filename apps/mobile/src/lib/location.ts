import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

let cached: Coordinates | null = null;
let cachedAt = 0;
let permissionDenied = false;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Best-effort current coordinates for weather-aware chat. Requests foreground
 * location permission once; if the user declines we stop asking. Never throws —
 * returns null so chat works fine without location.
 */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  if (permissionDenied) return null;

  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      permissionDenied = true;
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    cached = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    cachedAt = Date.now();
    return cached;
  } catch {
    return null;
  }
}
