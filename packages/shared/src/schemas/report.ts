import { z } from "zod"

export const createReportSchema = z.object({
  values: z.array(z.string().min(1)).min(1, "Must report at least one value"),
  comment: z.string().max(500).nullable().optional(),
})

export type CreateReportInput = z.infer<typeof createReportSchema>
