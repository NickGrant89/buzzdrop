/** Shared storefront copy — update here instead of hunting strings across the repo. */
export const SHIPPING_BADGE = "Worldwide shipping";
export const UK_FREE_SHIPPING = "Free shipping to the UK";
export const DELIVERY_ESTIMATE = "Usually arrives in 7–14 working days";
export const SUPPORT_EMAIL = "support@buzzdrop.co.uk";

export function shippingLine(countryCode = "GB"): string {
  return countryCode === "GB" ? UK_FREE_SHIPPING : SHIPPING_BADGE;
}
