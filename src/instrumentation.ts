import { registerOTel } from "@vercel/otel";

import { RedactingSpanProcessor } from "@/lib/tracing/redacting-span-processor";

/**
 * Request tracing (OpenTelemetry through `@vercel/otel`). Next calls this
 * once when the server starts, in both the Node.js and the Edge runtime.
 *
 * The redacting processor goes before "auto" (the processor that exports to
 * Vercel) so spans are scrubbed of pet ids first: `/tag/<hashId>` is a
 * capability URL and must not reach a third-party backend.
 */
export function register() {
  registerOTel({
    serviceName: "viewpet",
    spanProcessors: [new RedactingSpanProcessor(), "auto"],
  });
}
