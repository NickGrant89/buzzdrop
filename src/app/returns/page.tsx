import type { Metadata } from "next";
import { LegalList, LegalPage } from "@/components/LegalPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Returns & Refunds",
  description: "BuzzDrop returns, refunds, and cancellation policy for UK customers.",
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Returns & Refunds"
      description="We want you to be happy with your order. This policy explains your rights under UK consumer law and how to return an item to BuzzDrop."
      sections={[
        {
          title: "Your statutory rights",
          content: (
            <>
              <p>
                Nothing in this policy affects your statutory rights under the Consumer
                Rights Act 2015 and the Consumer Contracts Regulations 2013.
              </p>
              <p>
                If goods are faulty, not as described, or not of satisfactory quality,
                you are entitled to a repair, replacement, or refund.
              </p>
            </>
          ),
        },
        {
          title: "14-day cancellation (change of mind)",
          content: (
            <>
              <p>
                When you buy online, you have 14 days from the day after you receive
                your order to cancel for any reason (Consumer Contracts Regulations).
              </p>
              <p>To cancel, email us at support@buzzdrop.co.uk with:</p>
              <LegalList
                items={[
                  "Your order number",
                  "Your name and email address used at checkout",
                  "The item(s) you wish to return",
                ]}
              />
              <p>
                You then have 14 days from telling us to send the item back. We will
                refund you within 14 days of receiving the returned goods (or evidence
                that you have sent them).
              </p>
            </>
          ),
        },
        {
          title: "Return conditions",
          content: (
            <>
              <p>For change-of-mind returns, items must be:</p>
              <LegalList
                items={[
                  "Unused and in the same condition you received them",
                  "In original packaging where possible, with tags attached",
                  "Returned with proof of purchase",
                ]}
              />
              <p>
                We cannot accept returns of sealed hygiene products once opened (unless
                faulty), personalised items, or perishable goods.
              </p>
            </>
          ),
        },
        {
          title: "Return shipping costs",
          content: (
            <>
              <p>
                If you cancel because you changed your mind, you pay the cost of
                returning the item unless we delivered it to you in error or it is
                faulty.
              </p>
              <p>
                If an item is faulty or not as described, we will refund the original
                delivery charge and the cost of return shipping where applicable.
              </p>
            </>
          ),
        },
        {
          title: "How to return an item",
          content: (
            <>
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Email{" "}
                  <a
                    href="mailto:support@buzzdrop.co.uk"
                    className="text-violet-400 hover:text-violet-300"
                  >
                    support@buzzdrop.co.uk
                  </a>{" "}
                  to request a return and receive return instructions.
                </li>
                <li>Pack the item securely to prevent damage in transit.</li>
                <li>
                  Send the item to the address we provide. We recommend using a tracked
                  service and keeping proof of postage.
                </li>
                <li>
                  Once we receive and inspect the return, we will email you about your
                  refund.
                </li>
              </ol>
            </>
          ),
        },
        {
          title: "Refunds",
          content: (
            <>
              <p>
                Refunds are issued to the original payment method. Please allow 5–10
                working days for the refund to appear on your statement after we process
                it (depending on your bank or card provider).
              </p>
              <p>
                We may deduct an amount for any diminished value if you handled goods
                beyond what is necessary to establish their nature, characteristics,
                and functioning.
              </p>
            </>
          ),
        },
        {
          title: "Faulty or damaged items",
          content: (
            <>
              <p>
                If your order arrives damaged, defective, or incorrect, contact us
                within 48 hours of delivery with your order number and photos of the
                issue. We will arrange a replacement or full refund, including delivery
                costs.
              </p>
            </>
          ),
        },
        {
          title: "Delivery times & lost parcels",
          content: (
            <>
              <p>
                UK delivery typically takes 5–15 working days depending on product and
                carrier. If your order has not arrived within 25 working days, contact
                us and we will investigate with our fulfillment partner.
              </p>
              <p>
                If a parcel is confirmed lost in transit, we will offer a replacement
                or full refund.
              </p>
            </>
          ),
        },
        {
          title: "Contact us",
          content: (
            <p>
              For returns, refunds, or order issues:{" "}
              <a
                href="mailto:support@buzzdrop.co.uk"
                className="text-violet-400 hover:text-violet-300"
              >
                support@buzzdrop.co.uk
              </a>
              . Please include your order number so we can help quickly.
            </p>
          ),
        },
      ]}
    />
  );
}
