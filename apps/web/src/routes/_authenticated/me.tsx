import type { User } from "@neighbo/shared/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ChevronLeft, Fish } from "lucide-react"
import { useState } from "react"
import { RestaurantSheet } from "@/components/RestaurantSheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useFavorites } from "@/hooks/use-favorites"
import { useUser } from "@/hooks/use-user"
import { useValues } from "@/hooks/use-values"
import { api } from "@/lib/api"
import { signOut } from "@/lib/auth"
import { getValueColor } from "@/lib/mock/data/values"
import type { RouterContext } from "../__root"

export const Route = createFileRoute("/_authenticated/me" as any)({
  component: MePage,
})

// Value category → color tokens (same as home.tsx filter bar)
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  identity: { bg: "#A78BFA18", text: "#A78BFA", border: "#A78BFA30" },
  "social-justice": { bg: "#FBBF2418", text: "#D97706", border: "#FBBF2430" },
  labor: { bg: "#60A5FA18", text: "#3B82F6", border: "#60A5FA30" },
  environment: { bg: "#34D39918", text: "#059669", border: "#34D39930" },
  ownership: { bg: "#FB923C18", text: "#EA580C", border: "#FB923C30" },
  accessibility: { bg: "#2DD4BF18", text: "#0D9488", border: "#2DD4BF30" },
}

/** Generates a personalized manifesto headline from the user's saved value labels. */
function buildHeadline(labels: string[]): string {
  if (labels.length === 0) return "Every dollar is a vote. What are you voting for?"
  if (labels.length === 1) return `You're backing ${labels[0]} businesses in the Twin Cities.`
  if (labels.length === 2)
    return `You're backing ${labels[0]} and ${labels[1]} businesses in the Twin Cities.`
  // 3+ values: show first 3, acknowledge the rest
  const shown = labels.slice(0, 3)
  const more = labels.length - 3
  const list =
    more > 0
      ? `${shown[0]}, ${shown[1]}, ${shown[2]}, and ${more} more`
      : `${shown[0]}, ${shown[1]}, and ${shown[2]}`
  return `You're backing ${list} in the Twin Cities.`
}

/** "North Star since January 2024" — member-since formatted with Minnesota flair. */
function formatNorthStar(isoDate: string): string {
  const date = new Date(isoDate)
  const formatted = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  return `North Star since ${formatted}`
}

function MePage() {
  const { user: firebaseUser } = Route.useRouteContext() as RouterContext
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [sheetId, setSheetId] = useState<string | null>(null)

  const { data: user, isLoading: userLoading } = useUser()
  const { data: values = [], isLoading: valuesLoading } = useValues()
  const { data: favorites = [], isLoading: favLoading } = useFavorites()

  // Value preferences mutation — optimistic, auto-saves on every chip tap
  const { mutate: savePrefs } = useMutation({
    mutationFn: async (prefs: string[]) => {
      const res = await api.me.$patch({ json: { valuePreferences: prefs } })
      if (!res.ok) throw new Error("Failed to update preferences")
      return res.json() as Promise<User>
    },
    onMutate: (prefs) => {
      queryClient.setQueryData<User>(["me"], (old) =>
        old ? { ...old, valuePreferences: prefs } : old
      )
    },
    onSuccess: (updated) => queryClient.setQueryData(["me"], updated),
    onError: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  })

  function toggleValuePref(slug: string) {
    const current = user?.valuePreferences ?? []
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    savePrefs(next)
  }

  // Derive accent color from the user's first value preference (personalizes the avatar ring)
  const accentColor =
    user?.valuePreferences && user.valuePreferences.length > 0
      ? getValueColor(user.valuePreferences[0])
      : null

  // Derive personalized headline from value preference labels
  const prefLabels =
    user?.valuePreferences
      .map((slug) => values.find((v) => v.slug === slug)?.label)
      .filter((l): l is string => Boolean(l)) ?? []
  const headline = buildHeadline(prefLabels)

  const displayName = firebaseUser?.displayName ?? user?.displayName ?? "Neighbo Member"
  const email = firebaseUser?.email ?? user?.email ?? ""
  const photoURL = firebaseUser?.photoURL ?? user?.photoURL ?? ""

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Nav bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/40">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" as any })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Profile header ────────────────────────────────────────── */}
        <div className="px-4 pt-6 pb-4">
          {/* Avatar with accent ring */}
          <div
            className="inline-block mb-4 rounded-full"
            style={
              accentColor
                ? {
                    outline: `3px solid ${accentColor}50`,
                    outlineOffset: 3,
                  }
                : {}
            }
          >
            <Avatar className="size-16">
              <AvatarImage src={photoURL} alt={displayName} />
              <AvatarFallback
                className="text-xl font-bold font-display"
                style={
                  accentColor ? { backgroundColor: `${accentColor}18`, color: accentColor } : {}
                }
              >
                {displayName[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          {userLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-4 w-52 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded-lg mt-1" />
            </div>
          ) : (
            <>
              <h1
                className="font-display font-bold text-xl leading-tight text-foreground"
                style={{ letterSpacing: "-0.02em" }}
              >
                {displayName}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">{email}</p>
              {user?.createdAt && (
                <p className="text-muted-foreground text-xs mt-1">
                  {formatNorthStar(user.createdAt)}
                </p>
              )}

              {/* Stat strip */}
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">
                    {user?.valuePreferences.length ?? 0}
                  </span>{" "}
                  values
                </span>
                <span>
                  <span className="font-semibold text-foreground">{favorites.length}</span> go-to
                  spots
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Manifesto headline ────────────────────────────────────── */}
        {!userLoading && (
          <div
            className="mx-4 mb-6 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: accentColor ? `${accentColor}10` : "hsl(var(--muted))",
            }}
          >
            <p
              className="text-sm font-display font-medium leading-relaxed"
              style={{
                color: accentColor ?? "hsl(var(--muted-foreground))",
                letterSpacing: "-0.01em",
              }}
            >
              {headline}
            </p>
          </div>
        )}

        {/* ── What you stand for ────────────────────────────────────── */}
        <div className="px-4 mb-6">
          <p className="font-display text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            What you stand for
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Tap to declare your values. Saves automatically.
          </p>

          {valuesLoading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(6)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {values.map((v) => {
                const active = user?.valuePreferences.includes(v.slug) ?? false
                const colors = CATEGORY_COLORS[v.category] ?? {
                  bg: "#94A3B818",
                  text: "#94A3B8",
                  border: "#94A3B830",
                }
                return (
                  <button
                    key={v.slug}
                    type="button"
                    onClick={() => toggleValuePref(v.slug)}
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
          )}
        </div>

        {/* ── Your go-to spots ──────────────────────────────────────── */}
        <div className="px-4 mb-10">
          <p className="font-display text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Your go-to spots
          </p>

          {favLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Fish className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-display font-medium">
                Find a place that walks the walk.
              </p>
              <p className="text-xs text-muted-foreground">
                Tap 🐟 on any restaurant to save it here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {favorites.map((fav) => (
                <button
                  key={fav.restaurantId}
                  type="button"
                  onClick={() => setSheetId(fav.restaurantId)}
                  className="flex items-center justify-between rounded-2xl bg-card border border-border/60 px-4 py-3 text-left transition-all hover:bg-muted/50 active:scale-[0.98] duration-150"
                >
                  <div>
                    <p
                      className="font-display font-semibold text-sm text-foreground leading-tight"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      {fav.restaurantName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{fav.restaurantCity}</p>
                  </div>
                  <Fish className="size-4 fill-blue-500 text-blue-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Restaurant detail sheet — opened from "Your go-to spots" */}
      <RestaurantSheet restaurantId={sheetId} onClose={() => setSheetId(null)} />
    </div>
  )
}
