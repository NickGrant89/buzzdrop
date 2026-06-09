"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { StoreLayout } from "@/components/StoreLayout";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

type CheckoutPayload = {
  clientSecret: string;
  orderId: string;
  email: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  total: number;
};

function PaymentForm({ checkout }: { checkout: CheckoutPayload }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const returnUrl = `${window.location.origin}/order/success?order_id=${checkout.orderId}`;

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: checkout.email,
        payment_method_data: {
          billing_details: {
            name: checkout.name,
            email: checkout.email,
            phone: checkout.phone,
            address: {
              line1: checkout.line1,
              line2: checkout.line2 || undefined,
              city: checkout.city,
              state: checkout.county || undefined,
              postal_code: checkout.postcode,
              country: "GB",
            },
          },
        },
      },
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <ExpressCheckoutElement
        options={{
          paymentMethods: {
            applePay: "always",
            googlePay: "never",
            link: "never",
          },
          paymentMethodOrder: ["apple_pay", "card"],
        }}
        onConfirm={async () => {
          if (!stripe || !elements) return;

          setLoading(true);
          setError("");

          const { error: confirmError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/order/success?order_id=${checkout.orderId}`,
              receipt_email: checkout.email,
            },
          });

          if (confirmError) {
            setError(confirmError.message ?? "Payment failed");
            setLoading(false);
          }
        }}
      />

      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["apple_pay", "card"],
          wallets: { applePay: "auto", googlePay: "never" },
        }}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl bg-violet-600 px-6 py-3.5 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Processing…" : `Pay ${formatPrice(checkout.total)}`}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("stripe_checkout");
    if (!raw) {
      router.replace("/cart");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as CheckoutPayload;
      if (!parsed.clientSecret || !parsed.orderId) {
        router.replace("/cart");
        return;
      }
      setCheckout(parsed);
    } catch {
      router.replace("/cart");
    }
  }, [router]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Secure payment</h1>
          <Link href="/cart" className="text-sm text-zinc-400 hover:text-zinc-300">
            Back to cart
          </Link>
        </div>

        {!checkout ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-white">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: checkout.clientSecret,
                appearance: { theme: "stripe" },
                locale: "en-GB",
              }}
            >
              <PaymentForm checkout={checkout} />
            </Elements>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
