export type RestaurantValue = {
  slug: string
  label: string
  certTier: number
  selfAttested: boolean
  reportCount: number
  verifiedAt: string | null
}

export type RestaurantSummary = {
  id: string
  googlePlaceId: string
  name: string
  city: string
  values: RestaurantValue[]
  certTierMax: number
  location: { lat: number; lng: number }
  distanceKm?: number
}

export type Restaurant = RestaurantSummary & {
  totalReportCount: number
  claimedByUserId: string | null
  claimStatus: "pending" | "approved" | "rejected" | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}
