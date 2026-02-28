import { createFileRoute } from "@tanstack/react-router"
import { GoogleSignInButton } from "../components/GoogleSignInButton"

export const Route = createFileRoute("/" as any)({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Neighbo</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Sign in to get started
        </p>
      </div>
      <GoogleSignInButton />
    </div>
  )
}
