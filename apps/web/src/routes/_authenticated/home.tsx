import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Crosshair } from "lucide-react"
import { useState } from "react"
import { MapView } from "@/components/map/MapView"
import { RestaurantSheet } from "@/components/RestaurantSheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useNearbyRestaurants } from "@/hooks/use-nearby-restaurants"
import { useValues } from "@/hooks/use-values"
import type { RouterContext } from "../__root"

export const Route = createFileRoute("/_authenticated/home" as any)({
  component: HomePage,
})

// Value category color mapping for filter chips
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  identity: { bg: "#A78BFA18", text: "#A78BFA", border: "#A78BFA30" },
  "social-justice": { bg: "#FBBF2418", text: "#D97706", border: "#FBBF2430" },
  labor: { bg: "#60A5FA18", text: "#3B82F6", border: "#60A5FA30" },
  environment: { bg: "#34D39918", text: "#059669", border: "#34D39930" },
  ownership: { bg: "#FB923C18", text: "#EA580C", border: "#FB923C30" },
  accessibility: { bg: "#2DD4BF18", text: "#0D9488", border: "#2DD4BF30" },
}

function HomePage() {
  const { user } = Route.useRouteContext() as RouterContext
  const navigate = useNavigate()
  const { location: userLocation, requestLocation } = useGeolocation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [recenterRequested, setRecenterRequested] = useState(0)
  const [sheetRestaurantId, setSheetRestaurantId] = useState<string | null>(null)

  // Real data from API
  const { data: restaurants, isLoading: restaurantsLoading } = useNearbyRestaurants(userLocation)
  const { data: values = [] } = useValues()

  function toggleFilter(slug: string) {
    setActiveFilters((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  // True only on the very first load before any data has arrived
  const isFetching = restaurantsLoading && !restaurants

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">
      {/* ── Full-screen map ─────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <MapView
          restaurants={restaurants ?? []}
          selectedId={selectedId}
          onPinClick={(id) => setSelectedId((prev) => (prev === id ? null : id))}
          onRestaurantOpen={(id) => setSheetRestaurantId(id)}
          userLocation={userLocation}
          activeFilters={activeFilters}
          recenterRequested={recenterRequested}
          className="h-full w-full"
        />
      </div>

      {/* ── Top bar (floats over map) ────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-4 pb-3 pointer-events-none">
        {/* App name */}
        <span
          className="font-display font-bold text-foreground"
          style={{
            fontSize: 22,
            letterSpacing: "-0.02em",
            textShadow: "0 1px 3px rgba(255,255,255,0.8)",
          }}
        >
          Neighbo
        </span>

        {/* Profile avatar — tap to open /me */}
        <button
          type="button"
          onClick={() => navigate({ to: "/me" as any })}
          className="pointer-events-auto rounded-full bg-card/90 backdrop-blur-sm border border-border/50 shadow-sm p-0.5 transition-opacity hover:opacity-80 active:scale-95"
          aria-label="Your profile"
        >
          <Avatar size="default">
            <AvatarImage src={user?.photoURL ?? ""} alt={user?.displayName ?? "Profile"} />
            <AvatarFallback className="text-xs font-semibold font-display">
              {user?.displayName?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* ── Bottom panel ─────────────────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-none">
        {/* Recenter FAB */}
        <div className="flex justify-end px-4 pb-3 pointer-events-auto">
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              requestLocation()
              setRecenterRequested((n) => n + 1)
            }}
            className="size-10 rounded-full bg-card/90 backdrop-blur-sm border-border/50 shadow-md relative"
            title="Recenter on my location"
          >
            <Crosshair className="size-4 text-foreground" />
            {/* Pulsing dot while the initial restaurant fetch is in-flight */}
            {isFetching && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </div>

        {/* Filter chip tray */}
        <div
          className="pointer-events-auto bg-card/90 backdrop-blur-md border-t border-border/40 shadow-lg"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          <div className="px-4 pt-3 pb-1">
            <p className="font-display text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Filter by values
            </p>
          </div>

          <div
            className="flex gap-2 overflow-x-auto px-4 pb-4 hide-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {values.map((v) => {
              const active = activeFilters.includes(v.slug)
              const colors = CATEGORY_COLORS[v.category] ?? {
                bg: "#94A3B818",
                text: "#94A3B8",
                border: "#94A3B830",
              }
              return (
                <button
                  key={v.slug}
                  type="button"
                  onClick={() => toggleFilter(v.slug)}
                  className="shrink-0 transition-all duration-150 active:scale-95"
                >
                  <Badge
                    className="cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold font-display whitespace-nowrap transition-all duration-150"
                    style={
                      active
                        ? {
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1.5px solid ${colors.border}`,
                            boxShadow: `0 0 0 2px ${colors.text}20`,
                          }
                        : {
                            backgroundColor: "hsl(var(--card))",
                            color: "hsl(var(--muted-foreground))",
                            border: "1.5px solid hsl(var(--border))",
                          }
                    }
                  >
                    {v.label}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Restaurant detail drawer ──────────────────────────────────── */}
      <RestaurantSheet
        restaurantId={sheetRestaurantId}
        onClose={() => setSheetRestaurantId(null)}
      />
    </div>
  )
}
