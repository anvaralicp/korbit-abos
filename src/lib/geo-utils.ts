/**
 * Calculates Great-Circle Haversine distance in meters between two GPS coordinates.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface RoadDistanceResult {
  distanceKm: number;
  durationMinutes: number;
  isFallback: boolean;
}

/**
 * Calculates driving road distance in km and duration in minutes between two GPS points.
 * Queries OSRM (Open Source Routing Machine) with a 3.5s timeout.
 * Gracefully falls back to Haversine distance × 1.25 road-factor if OSRM is unreachable or offline.
 */
export async function calculateRoadDistanceKm(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RoadDistanceResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = Number((route.distance / 1000).toFixed(2));
        const durationMinutes = Math.round(route.duration / 60);
        return {
          distanceKm,
          durationMinutes,
          isFallback: false,
        };
      }
    }
  } catch (err) {
    // Network timeout or offline -> seamless fallback
    console.warn("OSRM routing API unreachable, applying Haversine x 1.25 road factor fallback:", err);
  }

  // Fallback: Haversine distance in meters / 1000 * 1.25 road winding factor
  const directMeters = calculateHaversineDistanceMeters(originLat, originLng, destLat, destLng);
  const roadFactor = 1.25;
  const distanceKm = Number(((directMeters / 1000) * roadFactor).toFixed(2));
  // Estimate average Indian city speed ~ 25 km/h
  const durationMinutes = Math.max(1, Math.round((distanceKm / 25) * 60));

  return {
    distanceKm,
    durationMinutes,
    isFallback: true,
  };
}
