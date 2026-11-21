import { describe, expect, test } from "bun:test";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";

import { RedactingSpanProcessor } from "../tracing/redacting-span-processor";
import { redactAttributeValue, redactAttributes, redactIds } from "../utils/trace-redaction";

const ID = "nuxw4d83wraa";

describe("redactIds", () => {
  test("replaces the segment after /tag, valid id or not", () => {
    expect(redactIds(`GET /tag/${ID}`)).toBe("GET /tag/[id]");
    expect(redactIds("GET /tag/abc")).toBe("GET /tag/[id]");
    expect(redactIds("GET /tag/[id]")).toBe("GET /tag/[id]");
  });

  test("replaces an id-shaped token anywhere, in any case", () => {
    expect(redactIds(`/${ID}`)).toBe("/[id]");
    expect(redactIds(`/${ID.slice(0, 10)}`)).toBe("/[id]");
    expect(redactIds(`/${ID.toUpperCase()}`)).toBe("/[id]");
    expect(redactIds(`pets/${ID}.jpg`)).toBe("pets/[id].jpg");
    expect(redactIds(`Error: pet ${ID} not found`)).toBe("Error: pet [id] not found");
  });

  test("leaves text without ids alone", () => {
    for (const text of ["GET /", "GET /privacy", "render route (app) /tag/[id]", "tag", "abcdefghjkmnpq"]) {
      expect(redactIds(text)).toBe(text);
    }
  });
});

describe("redactAttributeValue", () => {
  test("cuts the query string and fragment of URL attributes", () => {
    expect(redactAttributeValue("http.target", `/tag/${ID}?lang=en#x`)).toBe("/tag/[id]");
    expect(redactAttributeValue("http.url", `https://viewpet.info/tag/${ID}?a=b`)).toBe("https://viewpet.info/tag/[id]");
    expect(redactAttributeValue("url.query", `id=${ID}`)).toBe("");
  });

  test("redacts ids in any other string, and in arrays of strings", () => {
    expect(redactAttributeValue("exception.message", `no pet ${ID}`)).toBe("no pet [id]");
    expect(redactAttributeValue("x", [ID, "ok"])).toEqual(["[id]", "ok"]);
  });

  test("leaves numbers and booleans alone", () => {
    expect(redactAttributeValue("http.status_code", 200)).toBe(200);
    expect(redactAttributeValue("flag", true)).toBe(true);
  });
});

describe("redactAttributes", () => {
  test("returns only what changes", () => {
    expect(redactAttributes({ "http.target": `/tag/${ID}`, "http.method": "GET", "http.status_code": 200 })).toEqual({
      "http.target": "/tag/[id]",
    });
    expect(redactAttributes({ "http.method": "GET" })).toEqual({});
  });
});

describe("RedactingSpanProcessor", () => {
  test("what the exporter receives has no id, in the name, attributes or events", () => {
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({
      spanProcessors: [new RedactingSpanProcessor(), new SimpleSpanProcessor(exporter)],
    });
    const span = provider.getTracer("test").startSpan(`GET /tag/${ID}`, {
      attributes: { "http.target": `/tag/${ID}?x=1`, "http.method": "GET", "next.route": "/tag/[id]" },
    });
    span.addEvent("exception", { "exception.message": `pet ${ID} failed` });
    span.end();

    const [finished] = exporter.getFinishedSpans();
    expect(finished.name).toBe("GET /tag/[id]");
    expect(finished.attributes["http.target"]).toBe("/tag/[id]");
    expect(finished.attributes["http.method"]).toBe("GET");
    expect(finished.events[0].attributes?.["exception.message"]).toBe("pet [id] failed");
    expect(JSON.stringify([finished.name, finished.attributes, finished.events])).not.toContain(ID);
  });
});
