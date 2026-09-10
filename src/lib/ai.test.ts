import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAiCommandPlan, createAiDraft } from "./ai";

const ENV_KEYS = ["AI_PROVIDER", "GEMINI_API_KEY", "OPENAI_API_KEY", "GEMINI_MODEL", "OPENAI_MODEL"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("ai demo fallback", () => {
  it("returns a demo command plan without provider keys", async () => {
    const result = await createAiCommandPlan("Write about AI policy for researchers");
    expect(result.mode).toBe("demo");
    expect(result.plan.topic.length).toBeGreaterThan(0);
    expect(result.plan.recommendedActions.length).toBeGreaterThan(0);
  });

  it("returns a demo draft without provider keys", async () => {
    const result = await createAiDraft({
      platform: "LinkedIn",
      topic: "AI policy",
      audience: "researchers",
      objective: "Credibility",
    });
    expect(result.mode).toBe("demo");
    expect(result.draft.platform).toBe("LinkedIn");
    expect(result.draft.body.length).toBeGreaterThan(0);
  });
});
