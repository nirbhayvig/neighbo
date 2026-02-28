import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
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

function createAppRouter(user: User | null) {
  return createRouter({
    routeTree,
    context: { queryClient, user },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })
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

// Wait for Firebase to resolve the initial auth state before rendering.
// This prevents a flash redirect on page refresh for signed-in users.
const unsubscribe = onAuthChange((user) => {
  unsubscribe()

  const router = createAppRouter(user)

  // Keep router context in sync with ongoing auth state changes after initial render.
  // Running outside React avoids calling router.invalidate() synchronously during render.
  onAuthChange((nextUser) => {
    router.options.context.user = nextUser
    setTimeout(() => router.invalidate(), 0)
  })

  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  )
})
