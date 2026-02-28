export type ReportStatus = "active" | "withdrawn"

export type Report = {
  id: string
  restaurantId: string
  restaurantName: string
  userId: string
  values: string[]
  comment: string | null
  status: ReportStatus
  createdAt: string
}

export type ReportAggregate = {
  valueCounts: Record<string, number>
  totalReports: number
}

export type UserReportCheck = {
  hasActiveReport: boolean
  reportedValues: string[]
  nextReportAllowedAt: string | null
}
