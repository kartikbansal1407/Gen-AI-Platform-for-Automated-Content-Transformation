// @vitest-environment node
import { expect, it, vi } from "vitest";
import { demoOutput } from "@/lib/output-format";
const mocks = vi.hoisted(() => ({
  enrich: vi.fn(),
  summary: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("../ai", () => ({
  enrichSourceContent: mocks.enrich,
  summarizeSource: mocks.summary,
  transformContent: mocks.generate,
}));
import { transform } from "./index";
it("enriches once, shares context, honors overrides, and isolates a failed output", async () => {
  const source = {
    text: "Confirmed evidence: 18 advisories were issued to analysts.",
  };
  const controls = {
    audience: "Analysts",
    tone: "formal",
    language: "English",
    detailLevel: "standard" as const,
    objective: "Inform" as const,
    style: "technical",
  };
  mocks.enrich.mockResolvedValue({
    enriched: source,
    visionDescriptions: [],
    videoTranscript: "",
    keyframeDescriptions: [],
  });
  mocks.summary.mockResolvedValue("18 advisories issued.");
  mocks.generate.mockImplementation(async (input) => {
    if (input.outputType === "twitter_post") throw new Error("provider failed");
    return {
      mode: "demo",
      result: demoOutput(input.outputType, input.source, input.controls),
    };
  });
  const events: unknown[] = [];
  const result = await transform(
    source,
    controls,
    ["advisory", "twitter_post"],
    {
      overrides: { advisory: { audience: "Leadership" } },
      onEvent: (e) => events.push(e),
    },
  );
  expect(mocks.enrich).toHaveBeenCalledTimes(1);
  expect(mocks.summary).toHaveBeenCalledTimes(1);
  expect(result.status).toBe("partial");
  expect(result.artefacts).toHaveLength(1);
  expect(result.failedOutputs).toEqual(["twitter_post"]);
  expect(mocks.generate).toHaveBeenCalledWith(
    expect.objectContaining({
      sourceSummary: "18 advisories issued.",
      prepared: true,
      controls: expect.objectContaining({ audience: "Leadership" }),
    }),
  );
  expect(events).toHaveLength(2);
});
