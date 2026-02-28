import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import type { User } from "firebase/auth"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./app.css"
import { onAuthChange } from "./lib/auth"
import { routeTree } from "./routeTree.gen"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
})

/**
 * Wait for Firebase to resolve the initial auth state before creating the router.
 * Without this, auth.currentUser is always null on first render (even for signed-in
 * users), causing the _authenticated guard to incorrectly redirect on page refresh.
 */
function createAppRouter(user: User | null) {
  const router = createRouter({
    routeTree,
    context: { queryClient, user },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  return router
}

// One-time type registration — must use the return type of createAppRouter.
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

const domRoot = document.getElementById("root")
if (!domRoot) throw new Error("Root element not found")

const root = createRoot(domRoot)

// Firebase resolves the initial auth state asynchronously on page load.
// We wait for the first emission before rendering to prevent a flash redirect.
const unsubscribe = onAuthChange((user) => {
  // Only run once for the initial resolution, then detach.
  unsubscribe()

  const router = createAppRouter(user)

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  )
})
