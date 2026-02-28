export interface ValueDefinition {
  slug: string
  label: string
  description: string
  icon: string
  category: "identity" | "social-justice" | "labor" | "environment" | "ownership" | "accessibility"
}

export const VALUES: ValueDefinition[] = [
  {
    slug: "lgbtq-friendly",
    label: "LGBTQ+ Friendly",
    description: "Welcoming and affirming to LGBTQ+ customers and employees",
    icon: "rainbow",
    category: "identity",
  },
  {
    slug: "anti-ice",
    label: "Anti-ICE / Sanctuary",
    description: "Has publicly declared solidarity with immigrant communities",
    icon: "shield",
    category: "social-justice",
  },
  {
    slug: "union",
    label: "Labor-Friendly / Union",
    description: "Supports organized labor, fair wages, and worker rights",
    icon: "handshake",
    category: "labor",
  },
  {
    slug: "sustainable",
    label: "Sustainable",
    description: "Prioritizes sustainable sourcing, waste reduction, or eco-friendly practices",
    icon: "leaf",
    category: "environment",
  },
  {
    slug: "black-owned",
    label: "Black-Owned",
    description: "Owned by Black entrepreneurs",
    icon: "fist",
    category: "ownership",
  },
  {
    slug: "woman-owned",
    label: "Woman-Owned",
    description: "Owned by women",
    icon: "venus",
    category: "ownership",
  },
  {
    slug: "disability-friendly",
    label: "Disability-Friendly",
    description: "Accessible facilities and accommodating to people with disabilities",
    icon: "accessibility",
    category: "accessibility",
  },
  {
    slug: "indigenous-owned",
    label: "Indigenous-Owned",
    description: "Owned by Indigenous peoples",
    icon: "feather",
    category: "ownership",
  },
  {
    slug: "immigrant-owned",
    label: "Immigrant-Owned",
    description: "Owned by immigrants",
    icon: "globe",
    category: "ownership",
  },
  {
    slug: "worker-cooperative",
    label: "Worker Cooperative",
    description: "Owned and operated cooperatively by workers",
    icon: "users",
    category: "labor",
  },
  {
    slug: "poc-owned",
    label: "POC-Owned",
    description: "Owned by people of color",
    icon: "circle",
    category: "ownership",
  },
]

export const VALUE_MAP = Object.fromEntries(VALUES.map((v) => [v.slug, v])) as Record<
  string,
  ValueDefinition
>

/** Color for each value category — used for map pins and badges */
export const VALUE_CATEGORY_COLORS: Record<ValueDefinition["category"], string> = {
  identity: "#A78BFA", // violet-400
  "social-justice": "#FBBF24", // amber-400
  labor: "#60A5FA", // blue-400
  environment: "#34D399", // emerald-400
  ownership: "#FB923C", // orange-400
  accessibility: "#2DD4BF", // teal-400
}

/** Returns the display color for a given value slug */
export function getValueColor(slug: string): string {
  const def = VALUE_MAP[slug]
  if (!def) return "#94A3B8" // slate-400 fallback
  return VALUE_CATEGORY_COLORS[def.category]
}
