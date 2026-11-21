import type { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

import { redactAttributes, redactIds } from "@/lib/utils/trace-redaction";

type MutableAttributes = Record<string, unknown>;

/** Rewrites the attributes (of a span or of one of its events) in place. */
function scrub(attributes: object | undefined): void {
  if (!attributes) return;
  Object.assign(attributes, redactAttributes(attributes as MutableAttributes));
}

/**
 * Takes the pet id (and the query string of URLs) out of every span before
 * the exporter sees it. It has to run before the exporting processor, so it
 * goes first in `spanProcessors`.
 *
 * `onEnding` is the one that matters: the span is still writable there, so
 * the name can be changed too. `onEnd` repeats the attribute scrub as a
 * safety net, because `onEnding` is marked experimental in the SDK; the
 * attributes object is the same one the exporter reads later.
 */
export class RedactingSpanProcessor implements SpanProcessor {
  onStart(): void {}

  onEnding(span: Span): void {
    span.updateName(redactIds(span.name));
    scrub(span.attributes);
    for (const event of span.events) scrub(event.attributes);
  }

  onEnd(span: ReadableSpan): void {
    scrub(span.attributes);
    for (const event of span.events) scrub(event.attributes);
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
