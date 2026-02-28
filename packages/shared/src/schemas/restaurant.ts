import { z } from "zod"

export const createRestaurantSchema = z.object({
  googlePlaceId: z.string().min(1),
  name: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  values: z.array(z.string()).default([]),
})

export const updateRestaurantSchema = z.object({
  values: z.array(z.string()).optional(),
})

export const restaurantListQuerySchema = z.object({
  q: z.string().optional(),
  values: z.string().optional(),
  city: z.string().optional(),
  certTier: z.coerce.number().min(1).max(3).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().default(5),
  sort: z.enum(["distance", "name", "certTier"]).default("name"),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().default(5),
  values: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>
export type RestaurantListQuery = z.infer<typeof restaurantListQuerySchema>
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>
