// Type augmentations for Google Maps JS API features not yet covered by @vis.gl/react-google-maps.
// The core Map, Marker, and AdvancedMarker types come from that package.
// These cover Places API (New) types used in google-places.ts.

declare namespace google.maps.places {
  interface PlaceOptions {
    id: string
    requestedLanguage?: string
    requestedRegion?: string
  }

  interface FetchFieldsRequest {
    fields: string[]
  }

  interface OpeningHoursPeriod {
    open: { day: number; hour: number; minute: number }
    close?: { day: number; hour: number; minute: number }
  }

  interface OpeningHours {
    periods: OpeningHoursPeriod[]
    weekdayDescriptions: string[]
    isOpen(): boolean
  }

  interface AuthorAttribution {
    displayName: string
    photoURI: string
    uri: string
  }

  interface Review {
    authorAttribution: AuthorAttribution
    rating: number
    relativePublishTimeDescription: string
    text?: { text: string; languageCode: string }
  }

  interface Photo {
    heightPx: number
    widthPx: number
    authorAttributions: AuthorAttribution[]
    getURI(options?: { maxHeight?: number; maxWidth?: number }): string
  }

  class Place {
    static searchByText(request: {
      textQuery: string
      fields: string[]
      locationBias?: google.maps.LatLngBoundsLiteral
    }): Promise<{ places: Place[] }>

    constructor(options: PlaceOptions)
    fetchFields(request: FetchFieldsRequest): Promise<{ place: Place }>

    id: string
    displayName: string | null
    formattedAddress: string | null
    internationalPhoneNumber: string | null
    nationalPhoneNumber: string | null
    websiteUri: string | null
    rating: number | null
    userRatingCount: number | null
    priceLevel: string | null
    businessStatus: string | null
    regularOpeningHours: OpeningHours | null
    photos: Photo[]
    reviews: Review[]
    location: google.maps.LatLng | null
    types: string[]
  }
}
