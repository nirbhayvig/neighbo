import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, ExternalLink } from "lucide-react"

export const Route = createFileRoute("/support")({
  component: SupportPage,
})

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is Neighbo free to use?",
    a: "Yes — Neighbo is free for everyone discovering businesses. It will always be free for consumers. We generate revenue through optional advertising and analytics products for business owners.",
  },
  {
    q: "How are certifications determined?",
    a: "Certifications work on a three-tier system. Tier 1 is self-attested by the business. Tier 2 means multiple community members have confirmed the value through reports. Tier 3 means the claim has been independently verified. No tier is a legal certification — they reflect community consensus.",
  },
  {
    q: "A business has an incorrect value listed. What do I do?",
    a: "Tap the business on the map, open their detail page, and submit a community report. Our moderation team reviews all reports. Repeated credible reports will lower or remove a certification.",
  },
  {
    q: "How do I claim my business?",
    a: "Open the business listing in the app and tap \"Claim this business.\" You'll be asked to verify your role (owner or manager). Once verified, you can manage your values profile and respond to reports.",
  },
  {
    q: "Why does the app need my location?",
    a: "Location is used only to center the map and fetch businesses near you. It is never stored on our servers. You can deny location access — the app will default to a general area instead.",
  },
  {
    q: "Can I use Neighbo without signing in?",
    a: "Browsing the map is currently available to signed-in users only. Sign-in lets us keep the community reporting system accountable and prevents fake reviews.",
  },
  {
    q: "How do I delete my account?",
    a: "Email us at support@neighbo.app with your request and we will delete your account and associated data within 30 days. You can also revoke Neighbo's Google account access at any time from your Google Account settings.",
  },
]

function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Back */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>

        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-1">
          Support
        </h1>
        <p className="text-sm text-muted-foreground mb-10">We're here to help.</p>

        {/* Contact */}
        <div className="rounded-2xl bg-card border border-border/60 p-5 mb-10">
          <p className="font-display font-semibold text-foreground mb-1 text-sm">Get in touch</p>
          <p className="text-sm text-muted-foreground mb-4">
            For account issues, bug reports, or anything else, reach us directly.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">General</span>
              <a
                href="mailto:hello@neighbo.app"
                className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                hello@neighbo.app
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Privacy</span>
              <a
                href="mailto:privacy@neighbo.app"
                className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                privacy@neighbo.app
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Bugs</span>
              <a
                href="https://github.com/nirbhayvig/neighbo/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                GitHub Issues
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <h2 className="font-display font-semibold text-foreground text-base mb-5">
          Frequently asked questions
        </h2>

        <div className="space-y-6">
          {FAQ.map((item) => (
            <div key={item.q}>
              <p className="font-medium text-foreground text-sm mb-1.5">{item.q}</p>
              <p className="text-sm leading-relaxed text-foreground/70">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border/50 flex gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
