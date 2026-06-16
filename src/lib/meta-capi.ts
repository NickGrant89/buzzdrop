import { createHash } from "crypto";
import { getSiteUrl } from "./seo";

export type MetaCapiEventName = "ViewContent" | "InitiateCheckout" | "Purchase";

export type MetaCapiUserData = {
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  firstName?: string;
  lastName?: string;
  postcode?: string;
  country?: string;
};

export type MetaCapiCustomData = {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  numItems?: number;
  orderId?: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return phone.replace(/\D/g, "").replace(/^/, "+").slice(0, 16);
  if (digits.startsWith("44")) return `+${digits}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  return `+44${digits}`;
}

function hashUserData(user: MetaCapiUserData): Record<string, string | string[]> {
  const hashed: Record<string, string | string[]> = {};

  if (user.email) hashed.em = [sha256(user.email)];
  if (user.phone) {
    const normalized = normalizePhoneE164(user.phone).replace(/\D/g, "");
    hashed.ph = [sha256(normalized)];
  }
  if (user.firstName) hashed.fn = [sha256(user.firstName)];
  if (user.lastName) hashed.ln = [sha256(user.lastName)];
  if (user.postcode) hashed.zp = [sha256(user.postcode.replace(/\s/g, ""))];
  if (user.country) hashed.country = [sha256(user.country)];
  if (user.ip) hashed.client_ip_address = user.ip;
  if (user.userAgent) hashed.client_user_agent = user.userAgent;
  if (user.fbp) hashed.fbp = user.fbp;
  if (user.fbc) hashed.fbc = user.fbc;

  return hashed;
}

export function parseMetaCookies(cookieHeader: string | null): { fbp?: string; fbc?: string } {
  if (!cookieHeader) return {};

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    })
  );

  return {
    fbp: cookies._fbp || undefined,
    fbc: cookies._fbc || undefined,
  };
}

export function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

export function isMetaCapiConfigured(): boolean {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";
  return pixelId.length > 0 && token.length > 0;
}

export async function sendMetaCapiEvent(
  eventName: MetaCapiEventName,
  options: {
    eventId: string;
    eventSourceUrl?: string;
    userData?: MetaCapiUserData;
    customData?: MetaCapiCustomData;
  }
): Promise<boolean> {
  if (!isMetaCapiConfigured()) return false;

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID!.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN!.trim();
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();

  const customData: Record<string, unknown> = {};
  if (options.customData?.value != null) customData.value = options.customData.value;
  if (options.customData?.currency) customData.currency = options.customData.currency;
  if (options.customData?.contentIds?.length) {
    customData.content_ids = options.customData.contentIds;
    customData.content_type = "product";
  }
  if (options.customData?.contentName) customData.content_name = options.customData.contentName;
  if (options.customData?.numItems != null) customData.num_items = options.customData.numItems;
  if (options.customData?.orderId) customData.order_id = options.customData.orderId;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: options.eventId,
        action_source: "website",
        event_source_url: options.eventSourceUrl ?? getSiteUrl(),
        user_data: options.userData ? hashUserData(options.userData) : {},
        custom_data: customData,
      },
    ],
    access_token: accessToken,
  };

  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Meta CAPI]", eventName, res.status, text.slice(0, 300));
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Meta CAPI]", eventName, err);
    return false;
  }
}

export function splitName(fullName: string): { firstName?: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
