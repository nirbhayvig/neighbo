import { createFileRoute, redirect } from "@tanstack/react-router"
import { GoogleSignInButton } from "../components/GoogleSignInButton"
import type { RouterContext } from "./__root"
import { Input } from "../components/ui/input"
import GoogleMap from "@/components/GoogleMap"

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
    <div>
      <header className="flex justify-between px-8 py-4 bg-blue-950 text-white">
        <h1 className="text-4xl font-bold tracking-tight">Neighbo</h1>
      </header>
      <section className="flex flex-col items-center gap-4 justify-center relative" style={{height: "400px"}}>
        <GoogleMap />
        <GoogleSignInButton />
      </section>
      <section title="Results" className="p-8">
        <h2 className="text-2xl font-bold tracking-tight">Businesses</h2>
        <Input className="mt-8" />
      </section>
    </div>
  )
}
