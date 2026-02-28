export type ValueCategory =
  | "identity"
  | "social-justice"
  | "labor"
  | "environment"
  | "ownership"
  | "accessibility"

export type Value = {
  slug: string
  label: string
  description: string
  icon: string
  category: ValueCategory
  restaurantCount: number
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}
