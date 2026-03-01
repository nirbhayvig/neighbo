import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

export const Route = createFileRoute("/terms" as any)({
  component: TermsPage,
})

function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Effective February 1, 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-foreground/80">
          <section>
            <p>
              These Terms of Service ("Terms") govern your use of the Neighbo platform, including
              our website and mobile application (collectively, the "Service"). By creating an
              account or using the Service, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              The Service
            </h2>
            <p>
              Neighbo is a platform for discovering local restaurants and businesses based on
              shared values. Consumer accounts are free and will always remain free. We generate
              revenue through advertising and analytics subscriptions sold to businesses — never
              by charging consumers.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Certifications and community data
            </h2>
            <p>
              Business certifications on Neighbo reflect community-sourced information across
              three tiers: self-attestation by the business, community reports from users, and
              third-party verification. These certifications represent the community's
              understanding of a business's values at a point in time.
            </p>
            <p className="mt-3">
              Certifications are <span className="font-medium text-foreground">not</span> legal
              certifications, endorsements, or guarantees. Neighbo makes no warranty about the
              accuracy of any certification. If you believe a certification is inaccurate, you
              can submit a community report through the app.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Your account
            </h2>
            <p>
              You must be at least 13 years old to use the Service. You are responsible for
              maintaining the security of your account. You must notify us immediately if you
              suspect unauthorized access. You may not share your account with others or create
              multiple accounts to circumvent restrictions.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Submit false, misleading, or malicious reports about businesses</li>
              <li>Falsely claim ownership of a business you do not own or operate</li>
              <li>
                Harass, threaten, or intimidate other users or business owners through the platform
              </li>
              <li>
                Use automated tools to scrape, harvest, or extract data from the Service without
                prior written permission
              </li>
              <li>
                Attempt to reverse-engineer, decompile, or interfere with the Service or its
                underlying infrastructure
              </li>
              <li>
                Use the Service for any unlawful purpose or in violation of any applicable laws
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Business listings
            </h2>
            <p>
              Businesses may claim their listing on Neighbo to manage their values profile.
              By claiming a listing, you represent that you are an authorized owner or operator
              of that business. Providing false information to claim a listing may result in
              immediate removal and account termination.
            </p>
            <p className="mt-3">
              Business owners who purchase analytics or advertising products are subject to
              additional terms provided at time of purchase.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Content you submit
            </h2>
            <p>
              By submitting reports, certifications, or other content, you grant Neighbo a
              non-exclusive, royalty-free, worldwide license to use, display, and distribute
              that content as part of the Service. You retain ownership of your content.
              You are responsible for ensuring your submissions do not violate any laws or
              third-party rights.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Termination
            </h2>
            <p>
              We may suspend or terminate your account at any time if we believe you have
              violated these Terms, without prior notice. You may delete your account at any
              time by contacting support. Termination does not affect any rights or obligations
              that arose before the effective date.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Disclaimers
            </h2>
            <p>
              The Service is provided "as is" without warranties of any kind. We do not warrant
              that the Service will be error-free, uninterrupted, or that any information on the
              platform is accurate or complete. Your use of the Service is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, Neighbo and its affiliates will not be
              liable for any indirect, incidental, special, or consequential damages arising from
              your use of the Service, even if we have been advised of the possibility of such
              damages.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">
              Changes to these Terms
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes
              via the app or email. Continued use of the Service after changes take effect
              constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-foreground text-base mb-3">Contact</h2>
            <p>
              Questions about these Terms?{" "}
              <a
                href="mailto:hello@neighbo.app"
                className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                hello@neighbo.app
              </a>
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border/50 flex gap-4 text-xs text-muted-foreground">
          <Link to={"/privacy" as any} className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link to={"/support" as any} className="hover:text-foreground transition-colors">
            Support
          </Link>
        </div>
      </div>
    </div>
  )
}
