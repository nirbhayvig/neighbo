import { distanceBetween, geohashForLocation, geohashQueryBounds } from "geofire-common"

export function computeGeohash(lat: number, lng: number): string {
  return geohashForLocation([lat, lng])
}

export function getGeohashBounds(
  lat: number,
  lng: number,
  radiusKm: number
): Array<[string, string]> {
  return geohashQueryBounds([lat, lng], radiusKm * 1000)
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return distanceBetween([lat1, lng1], [lat2, lng2])
}
