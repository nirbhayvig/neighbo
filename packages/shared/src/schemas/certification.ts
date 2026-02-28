import { z } from "zod"

export const selfAttestSchema = z.object({
  values: z.array(z.string().min(1)).min(1, "Must attest at least one value"),
})

export const uploadEvidenceSchema = z.object({
  valueSlug: z.string().min(1),
  fileURLs: z.array(z.string().url()),
  description: z.string().max(1000).optional(),
})

export type SelfAttestInput = z.infer<typeof selfAttestSchema>
export type UploadEvidenceInput = z.infer<typeof uploadEvidenceSchema>
