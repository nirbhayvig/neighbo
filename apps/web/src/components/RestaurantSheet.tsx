import { useQuery } from "@tanstack/react-query"
import { ExternalLink, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { getPhotoUri, usePlaceDetails } from "@/lib/google-places"
import { getValueColor } from "@/lib/mock/data/values"
import type { Restaurant } from "@neighbo/shared/types"

interface RestaurantSheetProps {
  restaurantId: string | null
  onClose: () => void
}

const TIER_LABELS: Record<number, string> = {
  1: "Self-Attested",
  2: "Community Vetted",
  3: "Verified",
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  identity: { bg: "#A78BFA18", text: "#A78BFA", border: "#A78BFA30" },
  "social-justice": { bg: "#FBBF2418", text: "#D97706", border: "#FBBF2430" },
  labor: { bg: "#60A5FA18", text: "#3B82F6", border: "#60A5FA30" },
  environment: { bg: "#34D39918", text: "#059669", border: "#34D39930" },
  ownership: { bg: "#FB923C18", text: "#EA580C", border: "#FB923C30" },
  accessibility: { bg: "#2DD4BF18", text: "#0D9488", border: "#2DD4BF30" },
}

function getValueColors(slug: string) {
  const color = getValueColor(slug) // hex string
  return (
    Object.values(CATEGORY_COLORS).find((c) => c.text.toLowerCase() === color.toLowerCase()) ?? {
      bg: `${color}18`,
      text: color,
      border: `${color}30`,
    }
  )
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function RestaurantSheetContent({ restaurant }: { restaurant: Restaurant }) {
  // Fetch Google Places photo in parallel — independent of Neighbo data
  const { data: place } = usePlaceDetails(restaurant.googlePlaceId)
  const heroUrl =
    place?.photos && place.photos.length > 0 ? getPhotoUri(place.photos[0]!, 800, 400) : null

  const mapsUrl = `https://maps.google.com/?q=${restaurant.location.lat},${restaurant.location.lng}`

  return (
    <>
      {/* Hero photo — only rendered when a real URL is available */}
      {heroUrl && (
        <div className="overflow-hidden mx-4 mt-1 rounded-2xl" style={{ height: 180 }}>
          <img
            src={heroUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
      )}

      <DrawerHeader className="pt-3 pb-0">
        <DrawerTitle
          className="font-display text-left text-lg leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {restaurant.name}
        </DrawerTitle>
        <DrawerDescription className="flex items-center gap-1.5 text-left">
          {restaurant.distanceKm !== undefined && (
            <>
              <MapPin className="size-3 shrink-0" />
              <span>{formatDistance(restaurant.distanceKm)}</span>
              <span className="text-border">·</span>
            </>
          )}
          <span>{restaurant.city}</span>
        </DrawerDescription>
      </DrawerHeader>

      {/* Values list */}
      <div className="px-4 pt-3 pb-1">
        <p className="font-display text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Values
        </p>
        <div className="flex flex-col gap-2">
          {restaurant.values.map((v) => {
            const colors = getValueColors(v.slug)
            return (
              <div key={v.slug} className="flex items-center justify-between gap-3">
                <Badge
                  className="rounded-full px-3 py-1 text-[12px] font-semibold font-display"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1.5px solid ${colors.border}`,
                  }}
                >
                  {v.label}
                </Badge>
                {v.certTier > 0 && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {TIER_LABELS[v.certTier] ?? `Tier ${v.certTier}`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <DrawerFooter>
        <Button asChild className="rounded-full font-display font-semibold">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Get Directions
          </a>
        </Button>
      </DrawerFooter>
    </>
  )
}

function RestaurantSheetSkeleton() {
  return (
    <>
      <DrawerHeader className="pb-0">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <Skeleton className="h-4 w-28 rounded-lg mt-1" />
      </DrawerHeader>
      <div className="px-4 pt-3 pb-1 flex flex-col gap-3">
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-8 w-44 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>
      <DrawerFooter>
        <Skeleton className="h-10 rounded-full" />
      </DrawerFooter>
    </>
  )
}

/**
 * RestaurantSheet — swipe-up drawer showing full restaurant details.
 *
 * Opens when restaurantId is non-null. Fires two parallel fetches:
 * 1. Neighbo API for values + cert data
 * 2. Google Places for the hero photo (only rendered if a photo exists)
 */
export function RestaurantSheet({ restaurantId, onClose }: RestaurantSheetProps) {
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurants", restaurantId],
    queryFn: async (): Promise<Restaurant> => {
      const res = await api.restaurants[":id"].$get({ param: { id: restaurantId! } })
      if (!res.ok) throw new Error("Restaurant not found")
      return res.json()
    },
    enabled: restaurantId !== null,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <Drawer
      open={restaurantId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      direction="bottom"
    >
      <DrawerContent>
        {isLoading || !restaurant ? (
          <RestaurantSheetSkeleton />
        ) : (
          <RestaurantSheetContent restaurant={restaurant} />
        )}
      </DrawerContent>
    </Drawer>
  )
}
