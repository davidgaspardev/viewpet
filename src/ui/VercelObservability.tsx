"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { redactAnalyticsEvent } from "@/lib/utils/analytics-url";

/**
 * Vercel Web Analytics and Speed Insights. They only report on Vercel
 * deployments. `/tag/<id>` is a capability URL, so every event goes through
 * `redactAnalyticsEvent` before it leaves the browser. A client component
 * because `beforeSend` is a function, which a Server Component (the layout)
 * cannot pass down.
 */
export function VercelObservability() {
  return (
    <>
      <Analytics beforeSend={redactAnalyticsEvent} />
      <SpeedInsights beforeSend={redactAnalyticsEvent} />
    </>
  );
}
