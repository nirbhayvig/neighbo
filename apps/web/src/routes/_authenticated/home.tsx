import { createFileRoute } from "@tanstack/react-router"
import { signOut } from "../../lib/auth"
import type { RouterContext } from "../__root"

export const Route = createFileRoute("/_authenticated/home" as any)({
  component: HomePage,
})

function HomePage() {
  const { user } = Route.useRouteContext() as RouterContext

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Welcome, {user?.displayName ?? user?.email}</h1>
      <p className="text-muted-foreground text-sm">{user?.email}</p>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-4 rounded-lg border border-input bg-background px-5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Sign out
      </button>
    </div>
  )
}
