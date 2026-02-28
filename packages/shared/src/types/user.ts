export type UserRole = "admin" | "member"

export interface User {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface UserProfile extends User {
  // Extend with app-specific profile fields here
}
