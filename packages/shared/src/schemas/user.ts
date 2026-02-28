import { z } from "zod"

export const userTypeSchema = z.enum(["user", "business"])

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  photoURL: z.string().url().nullable().optional(),
  valuePreferences: z.array(z.string()).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
