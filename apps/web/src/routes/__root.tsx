import { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Outlet, createRootRouteWithContext, useRouter } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import type { User } from "firebase/auth"
import { useEffect } from "react"
import { onAuthChange } from "../lib/auth"

export interface RouterContext {
  queryClient: QueryClient
  user: User | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const router = useRouter()

  // Keep the router context in sync with ongoing auth state changes
  // (e.g. user signs in or signs out after initial load).
  useEffect(() => {
    return onAuthChange(() => {
      router.invalidate()
    })
  }, [router])

  return (
    <>
      <Outlet />
      {/* Both devtools panels are automatically stripped from production builds */}
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </>
  )
}
