import { cjAuthenticatedFetch } from "./client";
import { cjConfig } from "@/lib/config";
import { resolveShipping } from "./shipping";

export type UkShippingAddress = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  countryCode: string;
};

const CJ_COUNTRY_NAMES: Record<string, string> = {
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  IE: "Ireland",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  ES: "Spain",
  IT: "Italy",
  BE: "Belgium",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  CH: "Switzerland",
  AT: "Austria",
  SG: "Singapore",
  AE: "United Arab Emirates",
  IN: "India",
};

export type CjOrderItem = {
  vid: string;
  quantity: number;
  storeLineItemId: string;
};

export type CreateCjOrderInput = {
  orderNumber: string;
  shipping: UkShippingAddress;
  items: CjOrderItem[];
  remark?: string;
};

type CreateOrderResponse = {
  orderId?: string;
  orderNum?: string;
  cjOrderId?: string;
};

type OrderDetail = {
  orderId: string;
  orderNum: string;
  orderStatus: string;
  trackNumber?: string;
  trackingNumber?: string;
  cjTrackingNumber?: string;
};

export async function createCjOrder(input: CreateCjOrderInput): Promise<{
  cjOrderId: string;
  orderNum: string;
}> {
  const { shipping, items, orderNumber } = input;

  const countryCode = (shipping.countryCode || "GB").toUpperCase();

  const shippingMethod = await resolveShipping(
    items.map((i) => ({ vid: i.vid, quantity: i.quantity })),
    countryCode,
    shipping.postcode
  );

  const payload = {
    orderNumber,
    shippingZip: shipping.postcode.replace(/\s/g, ""),
    shippingCountry: CJ_COUNTRY_NAMES[countryCode] ?? countryCode,
    shippingCountryCode: countryCode,
    shippingProvince: shipping.county || shipping.city,
    shippingCity: shipping.city,
    shippingCounty: shipping.county ?? "",
    shippingPhone: shipping.phone,
    shippingCustomerName: shipping.name,
    shippingAddress: shipping.line1,
    shippingAddress2: shipping.line2 ?? "",
    email: shipping.email,
    remark: input.remark ?? `BuzzDrop order (${countryCode})`,
    logisticName: shippingMethod.logisticName,
    fromCountryCode: shippingMethod.fromCountryCode,
    platform: cjConfig.platform,
    payType: cjConfig.payType,
    shopLogisticsType: cjConfig.shopLogisticsType,
    orderFlow: 1,
    products: items.map((i) => ({
      vid: i.vid,
      quantity: i.quantity,
      storeLineItemId: i.storeLineItemId,
    })),
  };

  const res = await cjAuthenticatedFetch<CreateOrderResponse>(
    "/shopping/order/createOrderV3",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  const data = res.data;
  const cjOrderId = data.cjOrderId ?? data.orderId ?? data.orderNum ?? orderNumber;
  const orderNum = data.orderNum ?? cjOrderId;

  return { cjOrderId, orderNum };
}

export async function getCjOrderTracking(cjOrderId: string): Promise<string | null> {
  try {
    const res = await cjAuthenticatedFetch<OrderDetail>(
      `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(cjOrderId)}`
    );
    const d = res.data;
    return d.trackNumber ?? d.trackingNumber ?? d.cjTrackingNumber ?? null;
  } catch {
    return null;
  }
}

export async function listCjOrdersByStatus(status: string) {
  const params = new URLSearchParams({ pageNum: "1", pageSize: "20", status });
  const res = await cjAuthenticatedFetch<{ list: OrderDetail[] }>(
    `/shopping/order/list?${params}`
  );
  return res.data?.list ?? [];
}
