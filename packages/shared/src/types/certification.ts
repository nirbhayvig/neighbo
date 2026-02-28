export type CertTier = 1 | 2 | 3

export type CertificationValue = {
  slug: string
  label: string
  certTier: CertTier
  selfAttested: boolean
  reportCount: number
  verifiedAt: string | null
}

export type Certification = {
  restaurantId: string
  values: CertificationValue[]
  certTierMax: CertTier
  totalReportCount: number
}
