import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import type { RouterContext } from "./__root"

export const Route = createFileRoute("/_authenticated" as any)({
  beforeLoad: ({ context }) => {
    // context.user is resolved before the router is created (see main.tsx),
    // so this check is race-condition free even on page refresh.
    const { user } = context as RouterContext
    if (!user) {
      throw redirect({ to: "/" })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
