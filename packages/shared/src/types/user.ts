export type UserType = "user" | "business"

export type User = {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  userType: UserType
  valuePreferences: string[]
  claimedRestaurantId: string | null
  reportCount: number
  createdAt: string
  updatedAt: string
}
