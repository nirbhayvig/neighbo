import { z } from "zod"

export const claimRoleSchema = z.enum(["owner", "manager", "authorized-rep"])

export const createClaimSchema = z.object({
  ownerName: z.string().min(1).max(200),
  role: claimRoleSchema,
  phone: z.string().min(7).max(20),
  email: z.string().email(),
  evidenceDescription: z.string().max(1000).optional(),
})

export type CreateClaimInput = z.infer<typeof createClaimSchema>
