import { AdvancedMarker } from "@vis.gl/react-google-maps"
import type { MockRestaurant } from "@/lib/mock/data/restaurants"
import { getValueColor } from "@/lib/mock/data/values"

interface RestaurantPinProps {
  restaurant: MockRestaurant
  isSelected: boolean
  onClick: (id: string) => void
}

/**
 * Derives the "primary" value color for a restaurant:
 * uses the value with the highest certTier, falling back to the first.
 */
function getPrimaryColor(restaurant: MockRestaurant): string {
  if (restaurant.values.length === 0) return "#94A3B8"
  const sorted = [...restaurant.values].sort((a, b) => b.certTier - a.certTier)
  const top = sorted[0]
  if (!top) return "#94A3B8"
  return getValueColor(top.slug)
}

export function RestaurantPin({ restaurant, isSelected, onClick }: RestaurantPinProps) {
  const color = getPrimaryColor(restaurant)

  return (
    <AdvancedMarker
      position={restaurant.location}
      onClick={() => onClick(restaurant.id)}
      zIndex={isSelected ? 100 : 1}
      title={restaurant.name}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          // Reserve space for the pulsing ring so it doesn't clip
          width: isSelected ? 40 : 28,
          height: isSelected ? 40 : 28,
        }}
      >
        {/* Pulsing ring — only visible when selected */}
        {isSelected && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: 0.25,
              animation: "neighbo-pin-pulse 1.4s ease-out infinite",
            }}
          />
        )}

        {/* The pin dot itself */}
        <span
          style={{
            display: "block",
            width: isSelected ? 22 : 16,
            height: isSelected ? 22 : 16,
            borderRadius: "50%",
            backgroundColor: color,
            border: `2.5px solid white`,
            boxShadow: isSelected
              ? `0 0 0 3px ${color}40, 0 4px 12px ${color}60`
              : "0 2px 6px rgba(0,30,68,0.28)",
            transition:
              "width 0.2s cubic-bezier(0.34,1.56,0.64,1), height 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>

    </AdvancedMarker>
  )
}
