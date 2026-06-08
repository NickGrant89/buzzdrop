import type { Metadata } from "next";
import { LegalList, LegalPage } from "@/components/LegalPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "How BuzzDrop collects, uses, and protects your personal data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="BuzzDrop (“we”, “us”) operates buzzdrop.co.uk. This policy explains how we handle your personal information when you shop with us, in line with UK GDPR and the Data Protection Act 2018."
      sections={[
        {
          title: "Who we are",
          content: (
            <>
              <p>
                BuzzDrop is an online retailer based in the United Kingdom. For data
                protection purposes, BuzzDrop is the data controller responsible for
                your personal information.
              </p>
              <p>
                Contact:{" "}
                <a
                  href="mailto:support@buzzdrop.co.uk"
                  className="text-violet-400 hover:text-violet-300"
                >
                  support@buzzdrop.co.uk
                </a>
              </p>
            </>
          ),
        },
        {
          title: "Information we collect",
          content: (
            <>
              <p>When you place an order or contact us, we may collect:</p>
              <LegalList
                items={[
                  "Name and delivery address",
                  "Email address and phone number",
                  "Order details (products, quantities, prices)",
                  "Payment information — processed securely by our payment provider; we do not store full card details",
                  "Technical data such as IP address and browser type when you visit our site",
                ]}
              />
            </>
          ),
        },
        {
          title: "How we use your information",
          content: (
            <>
              <p>We use your data to:</p>
              <LegalList
                items={[
                  "Process and fulfil your orders",
                  "Send order confirmations and delivery updates",
                  "Handle returns, refunds, and customer support",
                  "Prevent fraud and keep our website secure",
                  "Comply with legal and tax obligations",
                ]}
              />
              <p>
                Our lawful bases include performing our contract with you, legitimate
                interests (running our business), and legal obligation where applicable.
              </p>
            </>
          ),
        },
        {
          title: "Sharing your information",
          content: (
            <>
              <p>We share data only when needed to run our service:</p>
              <LegalList
                items={[
                  "Payment processors (e.g. Stripe) to take payment",
                  "Fulfillment partners (including CJ Dropshipping) to pick, pack, and ship your order",
                  "Delivery carriers for tracking and delivery",
                  "IT providers that host our website and systems",
                ]}
              />
              <p>We do not sell your personal data to third parties.</p>
            </>
          ),
        },
        {
          title: "International transfers",
          content: (
            <p>
              Some partners (such as fulfillment providers) may process data outside
              the UK. Where this happens, we ensure appropriate safeguards are in place
              as required by UK data protection law.
            </p>
          ),
        },
        {
          title: "How long we keep data",
          content: (
            <p>
              We keep order and account information for as long as needed to fulfil
              orders, handle returns, and meet legal requirements (typically up to 6
              years for financial records). Marketing data is kept until you opt out or
              ask us to delete it.
            </p>
          ),
        },
        {
          title: "Cookies",
          content: (
            <>
              <p>
                We use essential cookies to run the site (for example, keeping items in
                your cart). We may use analytics cookies to understand how visitors use
                our store. You can control non-essential cookies through your browser
                settings.
              </p>
            </>
          ),
        },
        {
          title: "Your rights",
          content: (
            <>
              <p>Under UK GDPR, you have the right to:</p>
              <LegalList
                items={[
                  "Access the personal data we hold about you",
                  "Correct inaccurate data",
                  "Request deletion in certain circumstances",
                  "Object to or restrict processing in certain circumstances",
                  "Data portability where applicable",
                  "Withdraw consent where processing is based on consent",
                  "Lodge a complaint with the ICO (ico.org.uk)",
                ]}
              />
              <p>
                To exercise these rights, email{" "}
                <a
                  href="mailto:support@buzzdrop.co.uk"
                  className="text-violet-400 hover:text-violet-300"
                >
                  support@buzzdrop.co.uk
                </a>
                . We will respond within one month.
              </p>
            </>
          ),
        },
        {
          title: "Changes to this policy",
          content: (
            <p>
              We may update this policy from time to time. The “Last updated” date at
              the top will change when we do. Continued use of the site after changes
              means you accept the updated policy.
            </p>
          ),
        },
      ]}
    />
  );
}
