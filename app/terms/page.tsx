import type { Metadata } from "next";
import { LegalDoc } from "@/components/LegalDoc";

export const metadata: Metadata = { title: "Terms of Service — UNSTUCK" };

// Kept in sync by hand with legal/terms-of-service.md, the source-of-record
// draft — that file is what gets sent out for compliance/attorney review,
// this page is what actually ships. Update both together.
export default function TermsPage() {
  return (
    <LegalDoc title="Terms of" titleOrange="Service" effectiveDate="August 16, 2025">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of UNSTUCK (the
        &quot;Course,&quot; &quot;Service&quot;), a digital course product made available at
        unstuck.stewards.loan (the &quot;Site&quot;), operated by Human to Human LLC
        (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;), located at 5055
        Sanctuary Drive, Westerville, OH 43082.
      </p>
      <p>
        By purchasing, accessing, or using the Service, you (&quot;you,&quot; &quot;User,&quot;
        &quot;Student&quot;) agree to be bound by these Terms. If you do not agree, do not purchase
        or use the Service.
      </p>

      <div>
        <h2>1. Description of the Service</h2>
        <p className="mt-2">
          UNSTUCK is a self-paced digital course consisting of video modules, downloadable
          resources, and bonus materials, delivered through a private, login-gated dashboard.
          Access is granted upon a one-time purchase of $47 USD (or such price as posted at time of
          purchase) and is intended for the individual purchaser&apos;s personal, non-commercial
          use.
        </p>
        <p className="mt-2">
          The Service is not a mortgage, financial, legal, or tax product. It does not constitute
          mortgage lending services, and purchasing the Course does not create a lender-borrower
          relationship, an attorney-client relationship, or any advisory relationship between you
          and the Company or any affiliated mortgage lender.
        </p>
      </div>

      <div>
        <h2>2. Eligibility</h2>
        <p className="mt-2">
          You must be at least 18 years old and capable of forming a binding contract to purchase
          or use the Service. By using the Service, you represent that you meet these requirements
          and that all information you provide (including your email address) is accurate.
        </p>
      </div>

      <div>
        <h2>3. Accounts and Access</h2>
        <ul className="mt-2">
          <li>
            Access is granted via a passwordless &quot;magic link&quot; sent to the email address
            used at purchase. You are responsible for maintaining access to that email account and
            for all activity that occurs through your account.
          </li>
          <li>
            One purchase grants access to one individual. Sharing your login access, redistributing
            course content, or allowing others to use your account is prohibited and may result in
            termination of access without refund.
          </li>
          <li>
            We reserve the right to verify purchase eligibility and to deny or revoke access where
            fraud, chargeback abuse, or a Terms violation is reasonably suspected.
          </li>
        </ul>
      </div>

      <div>
        <h2>4. Payment</h2>
        <p className="mt-2">
          Payments are processed by Stripe, Inc. (&quot;Stripe&quot;), a third-party payment
          processor. We do not store your full payment card number. By purchasing, you agree to
          Stripe&apos;s terms of service in addition to these Terms.
        </p>
      </div>

      <div>
        <h2>5. Refunds</h2>
        <p className="mt-2">
          All sales are final. We do not offer refunds once access to the Course has been granted,
          except where required by applicable law. Any exception to this policy is granted solely
          at the Company&apos;s discretion and does not create an ongoing right to future
          exceptions.
        </p>
      </div>

      <div>
        <h2>6. Intellectual Property</h2>
        <p className="mt-2">
          All course content — including video, text, graphics, downloadable resources, and the
          overall structure and design of the Service — is owned by the Company or its licensors
          and is protected by copyright and other intellectual property laws. You are granted a
          limited, non-exclusive, non-transferable, revocable license to access and view the
          content for your personal use only.
        </p>
        <p className="mt-2">
          You may not: copy, record, download, redistribute, publicly display, sell, sublicense, or
          create derivative works from the content; reverse-engineer or scrape the Site; or use the
          content for any commercial purpose without our prior written consent.
        </p>
      </div>

      <div>
        <h2>7. User Conduct</h2>
        <p className="mt-2">
          You agree not to: use the Service for any unlawful purpose; attempt to gain unauthorized
          access to any part of the Service, other users&apos; accounts, or our systems; interfere
          with the Service&apos;s normal operation; or upload or transmit any harmful code.
        </p>
      </div>

      <div>
        <h2>8. Educational Content Disclaimer — No Professional Advice</h2>
        <p className="mt-2">
          <strong>
            The Course is provided for general educational and informational purposes only.
          </strong>{" "}
          Content addressing topics such as home affordability, rental property management, tenant
          relations, real estate transactions, and tax considerations reflects general information
          and is <strong>not</strong> individualized financial, mortgage, legal, tax, investment, or
          real estate advice. Your specific situation may differ, and outcomes are not guaranteed.
        </p>
        <p className="mt-2">
          You should consult a licensed mortgage professional, attorney, tax advisor, or other
          qualified professional before making any financial or real estate decision based on
          Course content. Nothing in the Course, and no communication with us in connection with
          the Course (including a booked call), constitutes a mortgage loan commitment,
          pre-approval, or formal financial advice unless separately documented as such through the
          applicable licensed process.
        </p>
      </div>

      <div>
        <h2>9. Disclaimer of Warranties</h2>
        <p className="mt-2">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT
          WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT
          WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY
          RESULTS OR OUTCOMES DESCRIBED IN THE COURSE WILL BE ACHIEVED BY ANY PARTICULAR USER.
        </p>
      </div>

      <div>
        <h2>10. Limitation of Liability</h2>
        <p className="mt-2">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
        <p className="mt-2">
          (a) IN NO EVENT WILL THE COMPANY, ITS OWNERS, EMPLOYEES, CONTRACTORS, OR AFFILIATES BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
          DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATED
          TO YOUR USE OF (OR INABILITY TO USE) THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p className="mt-2">
          (b) THE COMPANY&apos;S TOTAL AGGREGATE LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING OUT
          OF OR RELATING TO THE SERVICE OR THESE TERMS SHALL NOT EXCEED THE TOTAL AMOUNT YOU
          ACTUALLY PAID TO THE COMPANY FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE EVENT
          GIVING RISE TO THE CLAIM.
        </p>
        <p className="mt-2">
          (c) Some jurisdictions do not allow the exclusion or limitation of certain damages, so
          some of the above limitations may not apply to you to the extent prohibited by applicable
          law.
        </p>
      </div>

      <div>
        <h2>11. Indemnification</h2>
        <p className="mt-2">
          You agree to defend, indemnify, and hold harmless the Company and its owners, employees,
          contractors, and affiliates from and against any claims, liabilities, damages, losses, and
          expenses (including reasonable attorneys&apos; fees) arising out of or in any way
          connected with: (a) your access to or use of the Service; (b) your violation of these
          Terms; (c) your violation of any third-party right, including intellectual property or
          privacy rights; or (d) any decision or action you take based on Course content. This
          obligation survives termination of your access to the Service.
        </p>
      </div>

      <div>
        <h2>12. Third-Party Services</h2>
        <p className="mt-2">
          The Service relies on third-party providers, including but not limited to Stripe
          (payments), Supabase (authentication and data storage), Resend (email delivery), Dubb
          (video hosting), and Calendly (call scheduling). We are not responsible for the acts,
          omissions, downtime, or policies of these third parties. Your use of any embedded
          third-party service is also subject to that provider&apos;s own terms and privacy policy.
        </p>
      </div>

      <div>
        <h2>13. Termination</h2>
        <p className="mt-2">
          We may suspend or terminate your access to the Service at any time, with or without
          notice, for conduct that violates these Terms or is otherwise harmful to the Company,
          other users, or third parties. Upon termination for cause, no refund will be issued.
        </p>
      </div>

      <div>
        <h2>14. Changes to These Terms</h2>
        <p className="mt-2">
          We may update these Terms from time to time. Material changes will be reflected by an
          updated &quot;Effective date&quot; above. Continued use of the Service after changes take
          effect constitutes acceptance of the revised Terms.
        </p>
      </div>

      <div>
        <h2>15. Governing Law and Venue</h2>
        <p className="mt-2">
          These Terms and any dispute arising out of or related to the Service shall be governed by
          the laws of the <strong>State of Ohio</strong>, without regard to its conflict-of-laws
          principles. You agree that any legal action or proceeding arising out of these Terms shall
          be brought exclusively in the state or federal courts located in Delaware County, Ohio,
          and you consent to the personal jurisdiction of such courts.
        </p>
      </div>

      <div>
        <h2>16. Severability</h2>
        <p className="mt-2">
          If any provision of these Terms is found unenforceable, that provision will be limited or
          eliminated to the minimum extent necessary, and the remaining provisions will remain in
          full force and effect.
        </p>
      </div>

      <div>
        <h2>17. Entire Agreement</h2>
        <p className="mt-2">
          These Terms, together with our Privacy Policy, constitute the entire agreement between you
          and the Company regarding the Service and supersede any prior agreements.
        </p>
      </div>

      <div>
        <h2>18. Contact</h2>
        <p className="mt-2">
          Questions about these Terms can be sent to{" "}
          <a href="mailto:ryan.miracle@ruoff.com">ryan.miracle@ruoff.com</a>.
        </p>
      </div>
    </LegalDoc>
  );
}
