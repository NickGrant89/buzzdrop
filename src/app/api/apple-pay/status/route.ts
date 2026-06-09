import { NextResponse } from "next/server";

/** Quick check that Apple Pay domain verification is configured. */
export async function GET() {
  const configured = Boolean(process.env.APPLE_PAY_DOMAIN_ASSOCIATION?.trim());
  return NextResponse.json({
    configured,
    verifyUrl:
      "https://www.buzzdrop.co.uk/.well-known/apple-developer-merchantid-domain-association",
    hint: configured
      ? "Domain file is set — verify domain in Stripe Dashboard (Live mode)"
      : "Add APPLE_PAY_DOMAIN_ASSOCIATION in Railway from Stripe → Apple Pay → Add domain",
  });
}
