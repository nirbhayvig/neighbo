export type ClaimRole = "owner" | "manager" | "authorized-rep"
export type ClaimStatus = "pending" | "approved" | "rejected"

export type BusinessClaim = {
  id: string
  restaurantId: string
  restaurantName: string
  userId: string
  userEmail: string
  ownerName: string
  role: ClaimRole
  phone: string
  email: string
  evidenceDescription: string | null
  evidenceFileURLs: string[]
  status: ClaimStatus
  createdAt: string
}
