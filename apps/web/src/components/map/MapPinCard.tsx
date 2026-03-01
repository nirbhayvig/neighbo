import type { RestaurantSummary } from "@neighbo/shared/types"
import { AdvancedMarker } from "@vis.gl/react-google-maps"
import { ArrowRight, MapPin, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getValueColor } from "@/lib/mock/data/values"

interface MapPinCardProps {
  restaurant: RestaurantSummary
  distanceKm?: number
  onTap: (id: string) => void
  onClose: () => void
}

/** Cert tier labels — concise for the mini card */
const TIER_LABELS: Record<number, string> = {
  1: "Self-Attested",
  2: "Community Vetted",
  3: "Verified",
}

function formatDistance(km: number): string {
  const miles = km * 0.621371
  return `${miles < 0.1 ? "< 0.1" : miles.toFixed(1)} mi`
}

/**
 * MapPinCard — mini info card that appears above a selected restaurant pin.
 *
 * Rendered as a React AdvancedMarker at the restaurant's position.
 * Uses shadcn Badge and Button components styled with Neighbo design tokens.
 */
export function MapPinCard({ restaurant, distanceKm, onTap, onClose }: MapPinCardProps) {
  // Show the top value (highest certTier first)
  const topValue = [...restaurant.values].sort((a, b) => b.certTier - a.certTier)[0]
  const valueColor = topValue ? getValueColor(topValue.slug) : "#94A3B8"

  return (
    <AdvancedMarker
      position={restaurant.location}
      zIndex={200}
      // Offset so the card appears above the pin, not on top of it
      anchorPoint={
        /* @ts-expect-error — anchorPoint is not yet in type definitions */
        { x: 0.5, y: 1.0 }
      }
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: map overlay card stops propagation to prevent map click */}
      <div
        className="relative mb-3 animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ width: 220 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Card body */}
        <div
          className="rounded-2xl bg-card shadow-lg overflow-hidden"
          style={{ border: "1.5px solid hsl(var(--border))" }}
        >
          {/* Color accent strip at top */}
          <div style={{ height: 3, backgroundColor: valueColor }} />

          <div className="p-3">
            {/* Header row: name + close */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <p
                className="font-display font-semibold text-foreground leading-tight"
                style={{ fontSize: 14, letterSpacing: "-0.01em" }}
              >
                {restaurant.name}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 -mt-0.5 -mr-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Top value badge */}
            {topValue && (
              <Badge
                className="mb-2.5 text-[11px] font-semibold rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: `${valueColor}18`,
                  color: valueColor,
                  border: `1px solid ${valueColor}30`,
                }}
              >
                {topValue.label}
                {topValue.certTier >= 2 && (
                  <span className="opacity-60 ml-0.5">· {TIER_LABELS[topValue.certTier]}</span>
                )}
              </Badge>
            )}

            {/* Footer: distance + CTA */}
            <div className="flex items-center justify-between gap-2">
              {distanceKm !== undefined ? (
                <span
                  className="flex items-center gap-1 text-muted-foreground"
                  style={{ fontSize: 11 }}
                >
                  <MapPin className="size-3 shrink-0" />
                  {formatDistance(distanceKm)}
                </span>
              ) : (
                <span className="text-muted-foreground" style={{ fontSize: 11 }}>
                  {restaurant.city}
                </span>
              )}

              <Button
                size="xs"
                variant="default"
                onClick={() => onTap(restaurant.id)}
                className="rounded-full font-display text-[11px] px-2.5 py-1 h-auto active:scale-95"
              >
                View
                <ArrowRight className="size-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Downward pointing caret */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full"
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid hsl(var(--card))",
            filter: "drop-shadow(0 2px 2px rgba(0,30,68,0.12))",
          }}
        />
      </div>
    </AdvancedMarker>
  )
}
