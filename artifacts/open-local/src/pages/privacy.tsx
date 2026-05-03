import Layout from "@/components/layout/Layout";
import { Link } from "wouter";

const SITE = "openlocalapp.com";
const SUPPORT_EMAIL = "support@openlocalapp.com";
const COMPANY = "Open Local";
const EFFECTIVE_DATE = "May 2, 2026";

export default function Privacy() {
  return (
    <Layout>
      <article className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10 pb-6 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Legal</p>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Effective date: {EFFECTIVE_DATE} · Site: {SITE}
          </p>
        </header>

        <Section title="1. Overview">
          <p>
            This Privacy Policy explains what information {COMPANY} ("we", "us") collects when you use
            {SITE}, our mobile application, and related services (the "Service"), how we use that
            information, and your choices. By using the Service, you agree to this Policy.
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>We collect the following categories of information:</p>
          <ul>
            <li>
              <strong>Account information.</strong> When you sign up, we collect your username, email
              address, account role (shopper or vendor), ZIP code, state, and an avatar style/seed.
            </li>
            <li>
              <strong>Business listing information.</strong> If you list a business, we collect business
              name, type, description, address, contact email, phone number, website, social handles,
              and approximate location coordinates.
            </li>
            <li>
              <strong>Payment information.</strong> Subscriptions are processed by Stripe. We do not
              store full credit-card numbers; Stripe provides us with a customer ID, subscription ID,
              and billing status only.
            </li>
            <li>
              <strong>Usage information.</strong> We log activity such as searches, page views, and
              interactions with listings to improve discovery and detect abuse.
            </li>
            <li>
              <strong>Device and location.</strong> If you grant browser or app permission, we use your
              approximate location (ZIP code) to show nearby listings. You can revoke this at any time.
            </li>
            <li>
              <strong>Cookies and similar technologies.</strong> We use cookies and local storage to
              keep you signed in and remember preferences.
            </li>
          </ul>
        </Section>

        <Section title="3. How we use information">
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and improve the Service;</li>
            <li>Show you relevant nearby vendors, products, and businesses;</li>
            <li>Process subscription payments through Stripe;</li>
            <li>Communicate with you about your account, listings, and important Service updates;</li>
            <li>Detect, prevent, and respond to fraud, abuse, and security issues;</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="4. How we share information">
          <p>We share information only as follows:</p>
          <ul>
            <li>
              <strong>Service providers.</strong> We share data with vendors that help us run the
              Service — primarily Stripe (payment processing), our cloud hosting provider, and analytics
              tools — under contracts that limit their use of the data.
            </li>
            <li>
              <strong>Public listings.</strong> Information you submit as a public business listing
              (name, type, address, contact email, photos, etc.) is displayed publicly on the map and
              directory.
            </li>
            <li>
              <strong>Legal requirements.</strong> We may disclose information when required by law,
              subpoena, or to protect the rights, property, or safety of {COMPANY}, our users, or others.
            </li>
            <li>
              <strong>Business transfers.</strong> If {COMPANY} is acquired or merged, your information
              may be transferred as part of that transaction. We will provide notice before your data
              becomes subject to a different privacy policy.
            </li>
          </ul>
          <p>We do not sell your personal information.</p>
        </Section>

        <Section title="5. Data retention">
          <p>
            We retain account and listing information for as long as your account is active. After you
            delete your account, we will delete or anonymize your personal data within a reasonable
            period, except where we are required to retain it for tax, legal, fraud prevention, or
            backup purposes.
          </p>
        </Section>

        <Section title="6. Your choices and rights">
          <p>You have the following choices:</p>
          <ul>
            <li>
              <strong>Access and correction.</strong> You can view and update most account details from
              your profile. To request a copy of your data or correct inaccurate information, email{" "}
              {SUPPORT_EMAIL}.
            </li>
            <li>
              <strong>Deletion.</strong> Email {SUPPORT_EMAIL} to request deletion of your account and
              personal data.
            </li>
            <li>
              <strong>Marketing.</strong> You can unsubscribe from marketing emails using the link in
              any such email; account-related notices cannot be opted out of while your account is open.
            </li>
            <li>
              <strong>Location.</strong> You can disable location permissions in your browser or device
              settings at any time.
            </li>
            <li>
              <strong>State-specific rights.</strong> Residents of California, Virginia, Colorado, and
              other states with comprehensive privacy laws may have additional rights, including the
              right to know what we collect and to opt out of certain processing. Contact us to
              exercise these rights.
            </li>
          </ul>
        </Section>

        <Section title="7. Children's privacy">
          <p>
            The Service is not directed to children under 13 (or under 16 in jurisdictions that require
            it), and we do not knowingly collect personal information from children. If you believe a
            child has provided us with personal information, please contact us and we will delete it.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use industry-standard technical and organizational measures to protect your information,
            including HTTPS encryption in transit, hashed session tokens, and access controls.
            No system is perfectly secure; we cannot guarantee absolute security and encourage you to
            use a strong, unique password.
          </p>
        </Section>

        <Section title="9. International users">
          <p>
            The Service is hosted in the United States. If you use the Service from outside the U.S.,
            you consent to the transfer and processing of your information in the United States, which
            may have data-protection laws different from your country.
          </p>
        </Section>

        <Section title="10. Third-party links">
          <p>
            Listings and pages on the Service may link to third-party websites (such as a vendor's own
            shop or social media). We are not responsible for the privacy practices of those sites; we
            encourage you to review their policies.
          </p>
        </Section>

        <Section title="11. Changes to this Policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated
            by updating the effective date at the top of this page or by emailing registered users.
            Continued use of the Service after changes take effect constitutes acceptance.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions or requests related to your privacy? Email us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          <p>
            See also our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
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
