import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = { title: "Privacy Policy — UNSTUCK" };

// Kept in sync by hand with legal/privacy-policy.md, the source-of-record
// draft — that file is what gets sent out for compliance/attorney review,
// this page is what actually ships. Update both together.
export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy" titleOrange="Policy" effectiveDate="August 16, 2025">
      <p>
        This Privacy Policy explains how Human to Human LLC (&quot;Company,&quot; &quot;we,&quot;
        &quot;us,&quot; &quot;our&quot;) collects, uses, discloses, and protects information in
        connection with UNSTUCK, our digital course product at unstuck.stewards.loan (the
        &quot;Service&quot;).
      </p>

      <div>
        <h2>1. Information We Collect</h2>
        <p className="mt-2">
          <strong>Information you provide directly:</strong>
        </p>
        <ul className="mt-2">
          <li>Email address (required to create your account and receive your login link)</li>
          <li>Name (if provided)</li>
          <li>
            Payment information, collected and processed directly by Stripe — we receive
            confirmation of payment and a transaction reference, not your full card number
          </li>
          <li>
            Any information you submit through a support email or the call-booking flow (Calendly)
          </li>
        </ul>
        <p className="mt-3">
          <strong>Information collected automatically:</strong>
        </p>
        <ul className="mt-2">
          <li>Course progress (which modules you&apos;ve started or completed, watch-time indicators)</li>
          <li>Login session data (via Supabase Auth, to keep you signed in)</li>
          <li>
            Basic technical data (IP address, browser type, timestamps) generated through normal web
            server and hosting logs (Vercel)
          </li>
        </ul>
        <p className="mt-3">
          We do not knowingly collect any special categories of sensitive personal data (e.g.,
          health, biometric, or precise geolocation data).
        </p>
      </div>

      <div>
        <h2>2. How We Use Information</h2>
        <p className="mt-2">We use the information above to:</p>
        <ul className="mt-2">
          <li>Provide access to the Course and track your progress through it</li>
          <li>
            Send transactional email (login links, purchase receipts, and — if you go quiet
            mid-course — an occasional &quot;come back&quot; reminder email)
          </li>
          <li>Provide customer support</li>
          <li>Maintain the security and integrity of the Service</li>
          <li>Comply with tax, accounting, and legal obligations related to your purchase</li>
        </ul>
        <p className="mt-3">
          We do not sell your personal information, and we do not use it for third-party
          advertising.
        </p>
      </div>

      <div>
        <h2>3. Legal Basis for Processing (GDPR)</h2>
        <p className="mt-2">
          If you are located in the European Economic Area or United Kingdom, our legal bases for
          processing your information are: performance of a contract (delivering the Course you
          purchased), consent (for the optional &quot;come back&quot; reminder email, which you can
          opt out of by contacting us), and legitimate interest (maintaining security and improving
          the Service).
        </p>
      </div>

      <div>
        <h2>4. How We Share Information</h2>
        <p className="mt-2">
          We share information only with the service providers that operate the Service on our
          behalf, each acting as our data processor:
        </p>
        <table className="mt-3">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Stripe</td>
              <td>Payment processing</td>
            </tr>
            <tr>
              <td>Supabase</td>
              <td>Account authentication and application database</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Transactional email delivery</td>
            </tr>
            <tr>
              <td>Dubb</td>
              <td>Video hosting for course content</td>
            </tr>
            <tr>
              <td>Calendly</td>
              <td>Call scheduling (only if you choose to book a call)</td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>Application hosting and server logs</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3">
          We do not sell, rent, or trade your personal information to third parties for their own
          marketing purposes. We may disclose information if required by law, subpoena, or other
          legal process, or to protect the rights, property, or safety of the Company or others.
        </p>
      </div>

      <div>
        <h2>5. Data Retention</h2>
        <ul className="mt-2">
          <li>
            <strong>Account and progress data</strong>: retained for as long as your account remains
            active (i.e., indefinitely from purchase, since access does not expire), unless you
            request deletion under Section 6.
          </li>
          <li>
            <strong>Payment and order records</strong>: retained for 7 years after the transaction,
            as required for tax and accounting purposes, even if you request account deletion — this
            data is held by Stripe and referenced in our own order records for financial
            recordkeeping only.
          </li>
          <li>
            <strong>Abandoned-checkout data</strong> (started but never completed a purchase):
            retained for 90 days, then deleted, unless you separately have an active account.
          </li>
          <li>
            <strong>Support email correspondence</strong>: retained for as long as reasonably
            necessary to resolve and document the inquiry, generally no more than 2 years.
          </li>
        </ul>
      </div>

      <div>
        <h2>6. Your Rights and How to Delete Your Data</h2>
        <p className="mt-2">
          Regardless of your location, you may contact us at{" "}
          <a href="mailto:ryan.miracle@ruoff.com">ryan.miracle@ruoff.com</a> to:
        </p>
        <ul className="mt-2">
          <li>
            <strong>Access</strong> the personal information we hold about you
          </li>
          <li>
            <strong>Correct</strong> inaccurate information
          </li>
          <li>
            <strong>Delete</strong> your account and associated personal information (&quot;right to
            erasure&quot; / &quot;right to be forgotten&quot;)
          </li>
          <li>
            <strong>Export</strong> your data in a portable format
          </li>
          <li>
            <strong>Object to or restrict</strong> certain processing (e.g., opt out of the
            &quot;come back&quot; reminder email)
          </li>
          <li>
            <strong>Withdraw consent</strong> at any time, where processing is based on consent
          </li>
        </ul>
        <p className="mt-3">
          <strong>How deletion works in practice:</strong> when you request deletion, we will remove
          your student account, login credentials, and course-progress records within 30 days. We
          will retain the underlying transaction record (email, purchase date, amount) only as
          required for tax/accounting law, per Section 5 — this is the one category we cannot delete
          on request, since we&apos;re legally required to keep it.
        </p>
        <p className="mt-3">
          If you are a California resident, you have equivalent rights under the CCPA/CPRA,
          including the right to know what personal information is collected and the right to
          non-discrimination for exercising your privacy rights. We do not sell personal
          information, so there is nothing to opt out of in that respect.
        </p>
      </div>

      <div>
        <h2>7. Cookies and Session Data</h2>
        <p className="mt-2">
          We use essential cookies only, required to keep you logged in (managed by Supabase Auth)
          and, if you visit our embedded checkout widget, to process your purchase (managed by
          Stripe). We do not use third-party advertising or cross-site tracking cookies. Embedded
          third-party content (such as Dubb video players or the Calendly booking widget) may set
          their own cookies under their own privacy policies, which we do not control.
        </p>
      </div>

      <div>
        <h2>8. Children&apos;s Privacy</h2>
        <p className="mt-2">
          The Service is not directed to, and not intended for use by, anyone under 18 years old. We
          do not knowingly collect personal information from children. If you believe a child has
          provided us information, contact us at{" "}
          <a href="mailto:ryan.miracle@ruoff.com">ryan.miracle@ruoff.com</a> and we will delete it.
        </p>
      </div>

      <div>
        <h2>9. Data Security</h2>
        <p className="mt-2">
          We use reasonable administrative, technical, and physical safeguards to protect your
          information, including encrypted connections (HTTPS) and access controls limiting data
          access to what each system needs. No method of transmission or storage is 100% secure, and
          we cannot guarantee absolute security.
        </p>
      </div>

      <div>
        <h2>10. International Users</h2>
        <p className="mt-2">
          Our Service is hosted and operated from the United States. If you access the Service from
          outside the United States, your information will be transferred to, stored, and processed
          in the United States, which may have data protection laws different from those of your
          country.
        </p>
      </div>

      <div>
        <h2>11. Changes to This Policy</h2>
        <p className="mt-2">
          We may update this Privacy Policy from time to time. Material changes will be reflected by
          an updated &quot;Effective date&quot; above. Continued use of the Service after changes
          take effect constitutes acceptance of the revised policy.
        </p>
      </div>

      <div>
        <h2>12. Contact Us</h2>
        <p className="mt-2">
          Questions, requests, or complaints about this Privacy Policy or your data can be sent to{" "}
          <a href="mailto:ryan.miracle@ruoff.com">ryan.miracle@ruoff.com</a>.
        </p>
      </div>
    </LegalDoc>
  );
}
