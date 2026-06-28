export const SHIP_COUNTRIES = [
  { code: "GB", label: "United Kingdom", postcodeLabel: "Postcode", postcodePlaceholder: "SW1A 1AA" },
  { code: "US", label: "United States", postcodeLabel: "ZIP code", postcodePlaceholder: "75001" },
  { code: "CA", label: "Canada", postcodeLabel: "Postal code", postcodePlaceholder: "M5H 2N2" },
  { code: "AU", label: "Australia", postcodeLabel: "Postcode", postcodePlaceholder: "2000" },
  { code: "NZ", label: "New Zealand", postcodeLabel: "Postcode", postcodePlaceholder: "1010" },
  { code: "IE", label: "Ireland", postcodeLabel: "Eircode", postcodePlaceholder: "D02 X285" },
  { code: "DE", label: "Germany", postcodeLabel: "Postcode", postcodePlaceholder: "10115" },
  { code: "FR", label: "France", postcodeLabel: "Postcode", postcodePlaceholder: "75001" },
  { code: "NL", label: "Netherlands", postcodeLabel: "Postcode", postcodePlaceholder: "1012" },
  { code: "ES", label: "Spain", postcodeLabel: "Postcode", postcodePlaceholder: "28001" },
  { code: "IT", label: "Italy", postcodeLabel: "Postcode", postcodePlaceholder: "00118" },
  { code: "BE", label: "Belgium", postcodeLabel: "Postcode", postcodePlaceholder: "1000" },
  { code: "SE", label: "Sweden", postcodeLabel: "Postcode", postcodePlaceholder: "11122" },
  { code: "NO", label: "Norway", postcodeLabel: "Postcode", postcodePlaceholder: "0150" },
  { code: "DK", label: "Denmark", postcodeLabel: "Postcode", postcodePlaceholder: "1050" },
  { code: "CH", label: "Switzerland", postcodeLabel: "Postcode", postcodePlaceholder: "8001" },
  { code: "AT", label: "Austria", postcodeLabel: "Postcode", postcodePlaceholder: "1010" },
  { code: "SG", label: "Singapore", postcodeLabel: "Postal code", postcodePlaceholder: "018956" },
  { code: "AE", label: "United Arab Emirates", postcodeLabel: "Area code", postcodePlaceholder: "00000" },
  { code: "IN", label: "India", postcodeLabel: "PIN code", postcodePlaceholder: "110001" },
] as const;

export type ShipCountryCode = (typeof SHIP_COUNTRIES)[number]["code"];

export function countryLabel(code: string): string {
  return SHIP_COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

export function countryConfig(code: string) {
  return SHIP_COUNTRIES.find((c) => c.code === code) ?? SHIP_COUNTRIES[0];
}
