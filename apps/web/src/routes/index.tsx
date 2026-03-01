import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { GoogleSignInButton } from "../components/GoogleSignInButton"
import type { RouterContext } from "./__root"

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if ((context as RouterContext).user) {
      throw redirect({ to: "/home" })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Neighbo</h1>
        <p className="text-muted-foreground mt-2 text-lg">Sign in to get started</p>
      </div>
      <GoogleSignInButton />
      <footer className="absolute bottom-6 flex gap-4 text-xs text-muted-foreground">
        <Link to={"/privacy" as any} className="hover:text-foreground transition-colors">
          Privacy
        </Link>
        <Link to={"/terms" as any} className="hover:text-foreground transition-colors">
          Terms
        </Link>
        <Link to={"/support" as any} className="hover:text-foreground transition-colors">
          Support
        </Link>
      </footer>
    </div>
  )
}
