// @vitest-environment node
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mocks.generate };
  },
}));
import { transformContent } from "./ai";
import { perOutputZodSchemas } from "./transform-types";
import { generatePresentonDeck } from "./outputs/presentation";
import { synthesizeNarration } from "./outputs/video";
it("rejects invalid live provider output and returns a validated fallback", async () => {
  vi.stubEnv("AI_PROVIDER", "gemini");
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_API_KEY", "");
  mocks.generate.mockResolvedValue({
    text: JSON.stringify({ title: "Broken", summary: 4 }),
  });
  const result = await transformContent({
    source: {
      text: "Analysts issued 18 advisories after verifying the source.",
    },
    controls: {
      audience: "Analysts",
      tone: "formal",
      language: "English",
      detailLevel: "brief",
      objective: "Inform",
      style: "technical",
    },
    outputType: "advisory",
  });
  expect(result.mode).toBe("demo");
  expect(perOutputZodSchemas.advisory.safeParse(result.result).success).toBe(
    true,
  );
  expect(mocks.generate).toHaveBeenCalledWith(
    expect.objectContaining({
      config: expect.objectContaining({ maxOutputTokens: 5000 }),
    }),
  );
});
it("uses the documented Presenton endpoint and does not treat empty JSON as a deck", async () => {
  vi.stubEnv("PRESENTON_API_URL", "http://localhost:5000");
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json({ path: "/static/deck.pptx" }))
    .mockResolvedValueOnce(Response.json({ status: "pending" }));
  const payload = {
    title: "Briefing",
    slides: [
      {
        title: "Evidence",
        bullets: ["18 advisories"],
        speakerNotes: "Quote the source.",
      },
    ],
  };
  const result = await generatePresentonDeck(payload);
  expect(result.downloadUrl).toBe("http://localhost:5000/static/deck.pptx");
  expect(String(fetch.mock.calls[0][0])).toBe(
    "http://localhost:5000/api/v1/ppt/presentation/generate",
  );
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({
    web_search: false,
    export_as: "pptx",
  });
  const missing = await generatePresentonDeck(payload);
  expect(missing.mode).toBe("demo");
  expect(missing.warnings.length).toBeGreaterThan(0);
});
it("retains ElevenLabs audio and degrades provider errors to text warnings", async () => {
  vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(new Uint8Array([73, 68, 51]), {
        headers: { "Content-Type": "audio/mpeg" },
      }),
    )
    .mockResolvedValueOnce(new Response("failure", { status: 429 }));
  expect(
    (await synthesizeNarration("Verified source narration.")).audioBase64,
  ).toBe("SUQz");
  const failed = await synthesizeNarration("Verified source narration.");
  expect(failed.mode).toBe("demo");
  expect(failed.warnings[0]).toContain("429");
});
