import { useQuery } from "@tanstack/react-query"

export interface PlaceDetails {
  displayName: string | null
  formattedAddress: string | null
  internationalPhoneNumber: string | null
  websiteUri: string | null
  regularOpeningHours: google.maps.places.OpeningHours | null
  rating: number | null
  userRatingCount: number | null
  photos: google.maps.places.Photo[]
  reviews: google.maps.places.Review[]
}

// Fields requested for the restaurant detail page.
// Basic + Contact = free. Atmosphere + Photos = paid.
const DETAIL_FIELDS = [
  // Basic (free)
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "types",
  "businessStatus",
  // Contact (free)
  "internationalPhoneNumber",
  "websiteUri",
  // Atmosphere (paid — only fetch on detail page)
  "rating",
  "userRatingCount",
  "reviews",
  // Photos (paid — charged per photo getURI call)
  "photos",
  // Hours
  "regularOpeningHours",
]

// Fields for lightweight lookups (map pins, cards) — free only
const BASIC_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "businessStatus",
  "internationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
]

/**
 * Fetch full place details from Google Places API (New).
 * Uses google.maps.importLibrary("places") for lazy loading.
 *
 * @param placeId - Google Place ID (e.g., from our restaurant data)
 * @param basic - If true, fetch only free fields. Use false only on detail pages.
 */
export async function fetchPlaceDetails(placeId: string, basic = false): Promise<PlaceDetails> {
  const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary

  const place = new Place({ id: placeId })
  await place.fetchFields({ fields: basic ? BASIC_FIELDS : DETAIL_FIELDS })

  return {
    displayName: place.displayName ?? null,
    formattedAddress: place.formattedAddress ?? null,
    internationalPhoneNumber: place.internationalPhoneNumber ?? null,
    websiteUri: place.websiteUri ?? null,
    regularOpeningHours: place.regularOpeningHours ?? null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    photos: place.photos ?? [],
    reviews: place.reviews ?? [],
  }
}

/**
 * TanStack Query hook for place details.
 * 30-minute cache to minimize API calls and cost.
 * Only fetches paid fields (rating, reviews, photos) when `basic=false`.
 */
export function usePlaceDetails(placeId: string | null | undefined, basic = false) {
  return useQuery({
    queryKey: ["place-details", placeId, basic],
    queryFn: () => fetchPlaceDetails(placeId!, basic),
    enabled: Boolean(placeId),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  })
}

/**
 * Get a photo URI from a Google Places Photo object.
 * Charges apply per call — cache aggressively.
 */
export function getPhotoUri(
  photo: google.maps.places.Photo,
  maxWidth = 800,
  maxHeight = 600
): string {
  return photo.getURI({ maxWidth, maxHeight })
}
