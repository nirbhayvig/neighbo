import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

export const Route = createFileRoute("/privacy" as any)({
  component: PrivacyPage,
})

function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Effective February 1, 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              What is Neighbo?
            </h2>
            <p>
              Neighbo is a values-based business discovery platform that helps you find local
              restaurants and businesses whose values align with yours — LGBTQ+ friendly,
              Black-owned, sustainable, worker cooperative, and more. This policy explains what
              personal information we collect, why we collect it, and how we protect it.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Information we collect
            </h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">Account information</p>
                <p>
                  When you sign in with Google, we receive your name, email address, and profile
                  photo from your Google account via Firebase Authentication. We use this to
                  identify your account and display your name in the app.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Location</p>
                <p>
                  We request access to your device location only to show businesses near you.
                  Your precise location is used on-device to center the map and query nearby
                  results — it is never stored on our servers or shared with third parties.
                  You can deny location permission at any time; the app still works, it just
                  defaults to a general area.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Usage data</p>
                <p>
                  We collect anonymized analytics through Firebase Analytics — things like which
                  screens are viewed and which filters are used. This helps us understand how
                  people use the app and improve it. This data is not linked to your identity.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Business-related content</p>
                <p>
                  If you submit community reports, claim a business, or contribute certifications,
                  that content is associated with your account and stored in our database so we
                  can maintain the integrity of the platform.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              How we use your information
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To authenticate you and maintain your account</li>
              <li>To show you nearby businesses that match your values</li>
              <li>To process community reports and certifications you submit</li>
              <li>To improve the app through anonymized usage analytics</li>
              <li>To respond to support requests you initiate</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Data sharing
            </h2>
            <p>
              We do not sell, rent, or trade your personal information. We use the following
              third-party services to operate the platform:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>
                <span className="font-medium text-foreground">Google Firebase</span> — authentication,
                database, and analytics. Subject to Google's Privacy Policy.
              </li>
              <li>
                <span className="font-medium text-foreground">Google Maps Platform</span> — map
                display and place data. Your map interactions are governed by Google's Privacy Policy.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Your rights
            </h2>
            <p>
              You can request deletion of your account and associated data at any time by
              contacting us at the address below. You may also revoke Neighbo's access to your
              Google account at any time from your Google Account settings.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Children's privacy
            </h2>
            <p>
              Neighbo is not directed at children under 13. We do not knowingly collect personal
              information from anyone under 13. If you believe a child has provided us personal
              information, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Changes to this policy
            </h2>
            <p>
              We may update this policy from time to time. If we make material changes, we will
              notify you within the app or by email. Continued use of the app after changes take
              effect constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">Contact</h2>
            <p>
              Questions about this policy?{" "}
              <a
                href="mailto:privacy@neighbo.app"
                className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                privacy@neighbo.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border/50 flex gap-4 text-xs text-muted-foreground">
          <Link to={"/terms" as any} className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link to={"/support" as any} className="hover:text-foreground transition-colors">
            Support
          </Link>
        </div>
      </div>
    </div>
  )
}
