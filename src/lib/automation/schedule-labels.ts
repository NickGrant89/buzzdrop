/** Human-readable labels for automation schedules shown in admin. */
export function describeProductSyncCron(cron: string): string {
  const c = cron.trim();
  if (c === "0 3 * * *") return "Daily at 03:00";
  if (c === "0 */6 * * *") return "Every 6 hours";
  if (c === "0 */12 * * *") return "Every 12 hours";
  if (c === "0 0 * * *") return "Daily at midnight";
  return cron;
}

export const automationScheduleLabels = {
  productSync: (cron: string) => describeProductSyncCron(cron),
  priceStock: "Every 2 hours",
  fulfillment: "Every 5 minutes",
  social: "10:00 & 18:00 daily",
  catalogPrune: "Daily at 05:00",
  tiktokShop: "Daily at 04:00",
};
