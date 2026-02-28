import { createFileRoute } from "@tanstack/react-router"
import { Crosshair, LogOut } from "lucide-react"
import { useState } from "react"
import { MapView } from "@/components/map/MapView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useGeolocation } from "@/hooks/use-geolocation"
import { MOCK_RESTAURANTS } from "@/lib/mock/data/restaurants"
import { VALUES, type ValueDefinition } from "@/lib/mock/data/values"
import { signOut } from "../../lib/auth"
import type { RouterContext } from "../__root"

export const Route = createFileRoute("/_authenticated/home" as any)({
  component: HomePage,
})

// Value category color mapping for filter chips
const CATEGORY_COLORS: Record<
  ValueDefinition["category"],
  { bg: string; text: string; border: string }
> = {
  identity: { bg: "#A78BFA18", text: "#A78BFA", border: "#A78BFA30" },
  "social-justice": { bg: "#FBBF2418", text: "#D97706", border: "#FBBF2430" },
  labor: { bg: "#60A5FA18", text: "#3B82F6", border: "#60A5FA30" },
  environment: { bg: "#34D39918", text: "#059669", border: "#34D39930" },
  ownership: { bg: "#FB923C18", text: "#EA580C", border: "#FB923C30" },
  accessibility: { bg: "#2DD4BF18", text: "#0D9488", border: "#2DD4BF30" },
}

function HomePage() {
  const { user } = Route.useRouteContext() as RouterContext
  const { location: userLocation, requestLocation } = useGeolocation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [recenterRequested, setRecenterRequested] = useState(0)

  function toggleFilter(slug: string) {
    setActiveFilters((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">
      {/* ── Full-screen map ─────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <MapView
          restaurants={MOCK_RESTAURANTS}
          selectedId={selectedId}
          onPinClick={(id) => setSelectedId((prev) => (prev === id ? null : id))}
          onRestaurantOpen={(id) => console.log("Navigate to restaurant:", id)}
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

        {/* Sign out */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut()}
          className="pointer-events-auto rounded-full bg-card/90 backdrop-blur-sm border-border/50 shadow-sm text-xs gap-1.5 px-3"
        >
          <LogOut className="size-3.5" />
          {user?.displayName?.split(" ")[0] ?? "Sign out"}
        </Button>
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
            className="size-10 rounded-full bg-card/90 backdrop-blur-sm border-border/50 shadow-md"
            title="Recenter on my location"
          >
            <Crosshair className="size-4 text-foreground" />
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
            {VALUES.map((v) => {
              const active = activeFilters.includes(v.slug)
              const colors = CATEGORY_COLORS[v.category]
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
    </div>
  )
}
