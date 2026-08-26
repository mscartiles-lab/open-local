import Layout from "@/components/layout/Layout";
import { Link } from "wouter";

const SITE = "openlocalapp.com";
const SUPPORT_EMAIL = "support@openlocalapp.com";
const COMPANY = "Open Local";
const EFFECTIVE_DATE = "June 11, 2026";

export default function Terms() {
  return (
    <Layout>
      <article className="max-w-3xl mx-auto px-4 py-12 prose-styles">
        <header className="mb-10 pb-6 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Legal</p>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            Effective date: {EFFECTIVE_DATE} · Site: {SITE}
          </p>
        </header>

        <Section title="1. Welcome">
          <p>
            These Terms of Service ("Terms") govern your use of the {COMPANY} website at {SITE},
            our mobile application, and any related services (collectively, the "Service"). By creating
            an account, listing a business, subscribing to a paid plan, or otherwise using the Service,
            you agree to these Terms. If you do not agree, do not use the Service.
          </p>
          <p>
            The Service is operated by {COMPANY}, a nationwide marketplace connecting shoppers with
            independently owned local businesses, vendors, makers, farms, and artisans. We are launching
            initially in Florida markets with a roadmap to expand across the United States.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old to create an account, list a business, or make a purchase.
            By using the Service, you represent that the information you provide is accurate and that you
            have the authority to bind any business you list to these Terms.
          </p>
        </Section>

        <Section title="3. Accounts">
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activity under your account. Notify us immediately at {SUPPORT_EMAIL} if you suspect
            unauthorized access. We may suspend or terminate accounts that violate these Terms or that we
            reasonably believe pose a risk to other users or the Service.
          </p>
        </Section>

        <Section title="4. Vendor and business listings">
          <p>
            Vendors and businesses are responsible for the accuracy of their listings, products,
            descriptions, photos, prices, hours of operation, and contact information. By submitting a
            listing you grant {COMPANY} a non-exclusive, royalty-free license to display, distribute,
            and promote that content on the Service and in marketing materials referencing the Service.
          </p>
          <p>
            We reserve the right to review, edit, reject, or remove any listing that we determine, at our
            sole discretion, violates these Terms, applicable law, or our content guidelines.
          </p>
        </Section>

        <Section title="5. Subscriptions and billing">
          <p>
            Paid plans on the Service are billed monthly through Stripe and renew automatically until
            cancelled. {COMPANY} offers three subscription tiers for vendors and businesses:
          </p>
          <ul>
            <li>
              <strong>Basic — $4.99/month.</strong> A pin on the map with a profile photo and business
              description. Ideal for getting discovered locally.
            </li>
            <li>
              <strong>Standard — $10.98/month.</strong> Everything in Basic, plus multiple photo and
              video uploads, product listings, and linked social media accounts.
            </li>
            <li>
              <strong>Premium — $24.20/month.</strong> Everything in Standard, plus up to three listings,
              products, batch drops, or pre-orders featured at the top of the discovery feed.
            </li>
          </ul>
          <ul>
            <li>
              <strong>Free trials.</strong> The first 100 vendor and business accounts on the platform
              receive a 60-day free trial. All accounts after the first 100 receive a 30-day free trial.
              Trials apply to any subscription tier.
            </li>
            <li>
              <strong>Renewals.</strong> Subscriptions renew automatically each month until cancelled. You
              authorize us and Stripe to charge your payment method for each renewal.
            </li>
            <li>
              <strong>Cancellation.</strong> You may cancel at any time from the Stripe billing portal.
              Cancellations take effect at the end of the current billing period; no partial-month
              refunds are issued.
            </li>
            <li>
              <strong>Refunds.</strong> Except where required by law, all fees are non-refundable.
            </li>
            <li>
              <strong>Taxes.</strong> Prices do not include applicable taxes; you are responsible for any
              taxes assessed on your subscription.
            </li>
          </ul>
        </Section>

        <Section title="6. À-la-carte features">
          <p>
            In addition to subscription tiers, vendors and businesses on any plan may purchase
            individual listing boosts for <strong>$5.99 per boost</strong>. A boost features a selected
            listing at the top of the discovery feed for 14 days. Boosts are non-refundable and
            non-transferable.
          </p>
        </Section>

        <Section title="7. Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Post false, misleading, illegal, infringing, or harmful content;</li>
            <li>Impersonate another person or business or claim affiliation you do not have;</li>
            <li>Scrape, mirror, or otherwise harvest data from the Service without our written consent;</li>
            <li>Interfere with the Service's operation, security, or other users' access;</li>
            <li>Use the Service to send unsolicited communications.</li>
          </ul>
        </Section>

        <Section title="8. Transactions">
          <p>
            {COMPANY} provides both a discovery platform and tools that enable direct transactions
            between shoppers and vendors or businesses on the Service, including purchases of products,
            pre-orders, and batch-drop reservations. When you transact through the Service:
          </p>
          <ul>
            <li>
              <strong>Vendor responsibility.</strong> Vendors and businesses are solely responsible for
              the accuracy of their listings, the quality, safety, and legality of products and services
              offered, and fulfillment of orders placed through the Service.
            </li>
            <li>
              <strong>Shopper responsibility.</strong> Shoppers are responsible for reviewing listing
              details, pickup or delivery terms, and any applicable policies before completing a purchase.
            </li>
            <li>
              <strong>Disputes.</strong> We encourage both parties to resolve disputes directly. {COMPANY}
              may, at its discretion, assist in mediation but is not obligated to adjudicate or
              financially guarantee any transaction.
            </li>
            <li>
              <strong>Payments.</strong> All payment processing is handled by Stripe. By transacting on
              the Service you agree to Stripe's terms of service.
            </li>
          </ul>
        </Section>

        <Section title="9. Intellectual property">
          <p>
            The Service, including its design, code, logo, branding, and original content, is owned by
            {" "}{COMPANY} and protected by intellectual property laws. You may not copy, modify, or
            redistribute any portion of the Service without our written permission, except as
            necessary to use the Service as intended.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind, express
            or implied, including merchantability, fitness for a particular purpose, and non-infringement.
            We do not warrant that the Service will be uninterrupted, error-free, or secure.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>
            To the fullest extent permitted by law, {COMPANY} and its affiliates will not be liable for
            any indirect, incidental, special, consequential, or punitive damages, or any loss of
            profits, revenue, data, or goodwill arising from your use of the Service. Our total
            aggregate liability for any claim related to the Service will not exceed the greater of
            (a) the amount you paid us in the twelve months preceding the claim, or (b) one hundred
            U.S. dollars ($100).
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify and hold harmless {COMPANY} from any claims, losses, or expenses
            (including reasonable attorneys' fees) arising from your use of the Service, your content,
            or your violation of these Terms.
          </p>
        </Section>

        <Section title="13. Termination">
          <p>
            You may stop using the Service at any time. We may suspend or terminate your access for any
            reason, including violation of these Terms. Sections that by their nature should survive
            termination — including ownership, disclaimers, limitations of liability, and dispute
            resolution — will survive.
          </p>
        </Section>

        <Section title="14. Governing law and disputes">
          <p>
            These Terms are governed by the laws of the State of Florida, without regard to conflict of
            laws principles. Any dispute arising from or relating to these Terms or the Service will be
            resolved exclusively in the state or federal courts located in Florida, and you consent to
            personal jurisdiction in those courts.
          </p>
        </Section>

        <Section title="15. Changes to these Terms">
          <p>
            We may update these Terms from time to time. Material changes will be communicated by
            posting an updated effective date at the top of this page or by emailing registered users.
            Continued use of the Service after changes take effect constitutes acceptance.
          </p>
        </Section>

        <Section title="16. Contact">
          <p>
            Questions about these Terms? Email us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <p>
            See also our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </article>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-serif font-bold text-foreground mb-3">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3 text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-foreground [&_strong]:font-semibold">
        {children}
      </div>
    </section>
  );
}
