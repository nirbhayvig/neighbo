import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { auth } from "../lib/firebase"

export const Route = createFileRoute("/_authenticated" as any)({
  beforeLoad: () => {
    if (!auth.currentUser) {
      throw redirect({ to: "/" })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
