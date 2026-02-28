import { z } from "zod"

export const userRoleSchema = z.enum(["admin", "member"])

export const userSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  role: userRoleSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createUserSchema = userSchema.omit({
  uid: true,
  createdAt: true,
  updatedAt: true,
})

export const updateUserSchema = userSchema
  .omit({ uid: true, createdAt: true, updatedAt: true })
  .partial()

export type UserSchema = z.infer<typeof userSchema>
export type CreateUserSchema = z.infer<typeof createUserSchema>
export type UpdateUserSchema = z.infer<typeof updateUserSchema>
