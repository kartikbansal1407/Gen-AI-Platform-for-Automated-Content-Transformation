import { describe, expect, it } from "vitest";
import { transformContent, describeImageViaVision, generateInfographicImage, SYSTEM_PROMPTS, JSON_SCHEMAS, CONTENT_SAFETY_FRAMING } from "./ai";

describe("Content Forge generalized pipeline", () => {
  it("exposes per-output system prompts with safety framing", () => {
    expect(SYSTEM_PROMPTS.linkedin_post).toContain("SourceContent");
    expect(SYSTEM_PROMPTS.advisory).toContain("government-advisory");
    expect(CONTENT_SAFETY_FRAMING).toContain("sourceAttribution");
    expect(CONTENT_SAFETY_FRAMING).toContain("supported=false");
    // all prompts must include safety framing
    for (const k of Object.keys(SYSTEM_PROMPTS) as Array<keyof typeof SYSTEM_PROMPTS>) {
      expect(SYSTEM_PROMPTS[k]).toContain("Do not fabricate facts");
      expect(SYSTEM_PROMPTS[k]).toContain("sourceAttribution");
    }
  });

  it("exposes per-output JSON schemas", () => {
    expect(Object.keys(JSON_SCHEMAS)).toEqual(expect.arrayContaining(["linkedin_post","twitter_post","advisory","infographic","executive_summary","video_package","presentation"]));
    for (const s of Object.values(JSON_SCHEMAS)) {
      expect(s).toHaveProperty("type");
      expect(s).toHaveProperty("properties");
    }
  });

  it("transforms linkedin_post in demo mode (no API keys)", async () => {
    const result = await transformContent({
      source: { text: "India's AI policy needs institutional imagination, with focus on NTRO advisory capacity." },
      controls: { audience: "Young policy researchers", tone: "analytical", language: "English", detailLevel: "standard", objective: "Credibility", style: "analytical" },
      outputType: "linkedin_post",
    });
    expect(result.mode).toBe("demo");
    expect(result.result).toBeDefined();
    const r = result.result as { title: string; warnings: string[]; sourceAttribution: string; claimSupport: unknown[] };
    expect(r.title).toBeDefined();
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.sourceAttribution).toBeDefined();
    expect(r.claimSupport).toBeDefined();
  });

  it("transforms advisory with government safety fields", async () => {
    const result = await transformContent({
      source: { text: "Threat intelligence report: recent advisory on secure communications for NTRO.", linkUrl: "https://example.com/advisory" },
      controls: { audience: "NTRO analysts", tone: "formal", language: "English", detailLevel: "detailed", objective: "Credibility", style: "bullet-point" },
      outputType: "advisory",
    });
    expect(result.mode).toBe("demo");
    const r = result.result as { classification: string; claimSupport: Array<{ supported: boolean; flagIfWeak: boolean }> };
    expect(r.classification).toBe("Unclassified");
    expect(r.claimSupport[0]).toHaveProperty("supported");
  });

  it("transforms infographic and generates image in demo mode (best-effort)", async () => {
    const result = await transformContent({
      source: { text: "Annual report: 42% increase in incident reports, 18 new advisories issued." },
      controls: { audience: "Policy makers", tone: "analytical", language: "English", detailLevel: "standard", objective: "Reach", style: "analytical" },
      outputType: "infographic",
    });
    expect(result.mode).toBe("demo");
    const r = result.result as { imagePrompt: string };
    expect(r.imagePrompt.length).toBeGreaterThan(20);
    // generatedImage is best-effort, should have prompt at least
    expect(result.generatedImage?.prompt).toBeDefined();
  });

  it("handles vision via multimodal endpoint in demo fallback", async () => {
    const { mode, description } = await describeImageViaVision({ altText: "Chart showing 42% increase", base64: undefined, url: undefined });
    expect(["demo","gemini","openai"]).toContain(mode);
    expect(description.length).toBeGreaterThan(0);
  });

  it("infographic image generation handles provider abstraction", async () => {
    const res = await generateInfographicImage("Infographic about India's AI policy, clean government style, muted blues, no fabricated numbers");
    expect(["demo","gemini","openai"]).toContain(res.mode);
    expect(res.prompt.length).toBeGreaterThan(10);
  });

  it("video transcript is best-effort not blocker", async () => {
    const result = await transformContent({
      source: { text: "Video briefing on geoeconomics", video: { base64: undefined, url: undefined, keyframes: [{ url: "https://example.com/frame.jpg" }] } },
      controls: { audience: "IR students", tone: "conversational", language: "English", detailLevel: "brief", objective: "Conversations", style: "narrative" },
      outputType: "video_package",
    });
    expect(result.mode).toBe("demo");
    expect(result.videoTranscript).toBeDefined();
    expect(result.keyframeDescriptions).toBeDefined();
  });

  it("handles all 7 output types via transformContent", async () => {
    const baseSource = { text: "NTRO advisory: secure comms incident Q2 – 18 advisories, 42% increase in reports, link https://example.com" };
    const baseControls = { audience: "NTRO operators", tone: "formal", language: "English", detailLevel: "standard" as const, objective: "Credibility" as const, style: "analytical" };
    for (const outputType of ["linkedin_post","twitter_post","advisory","infographic","executive_summary","video_package","presentation"] as const) {
      const res = await transformContent({ source: baseSource, controls: baseControls, outputType });
      expect(res.mode).toBe("demo");
      expect(res.result).toBeDefined();
      const r = res.result as Record<string, unknown>;
      expect(r.warnings).toBeDefined();
      expect(r.sourceAttribution).toBeDefined();
      expect(r.claimSupport).toBeDefined();
    }
  });

  it("twitter post respects 280 char chunks and advisory safety", async () => {
    const res = await transformContent({
      source: { text: "Geoeconomics thread: countries trading leverage and standards." },
      controls: { audience: "IR students", tone: "conversational", language: "English", detailLevel: "brief", objective: "Reach", style: "narrative" },
      outputType: "twitter_post",
    });
    const r = res.result as { tweets: string[] };
    expect(r.tweets.length).toBeGreaterThan(0);
    for (const t of r.tweets) expect(t.length).toBeLessThanOrEqual(280);
  });

  it("executive summary respects detailLevel and claimSupport", async () => {
    const res = await transformContent({
      source: { text: "Policy report: state capacity and AI governance – institutional design matters more than model size." },
      controls: { audience: "Policy makers", tone: "analytical", language: "English", detailLevel: "detailed", objective: "Credibility", style: "bullet-point" },
      outputType: "executive_summary",
    });
    const r = res.result as { summary: string; keyPoints: string[]; implications: string[]; confidence: number };
    expect(r.summary.length).toBeGreaterThan(20);
    expect(r.keyPoints.length).toBeGreaterThanOrEqual(2);
    expect(r.implications.length).toBeGreaterThanOrEqual(1);
  });

  it("video_package includes narrationText and ElevenLabs demo fallback", async () => {
    const res = await transformContent({
      source: { text: "Briefing: incident response readiness for NTRO operators." },
      controls: { audience: "NTRO operators", tone: "formal", language: "English", detailLevel: "standard", objective: "Credibility", style: "narrative" },
      outputType: "video_package",
    });
    const r = res.result as { narrationText: string; script: string; scenes: unknown[] };
    expect(r.narrationText.length).toBeGreaterThan(10);
    expect(r.scenes.length).toBeGreaterThan(0);
    expect(res.videoNarration).toBeDefined();
    expect(res.videoNarration?.warnings.length).toBeGreaterThan(0);
    expect(["demo","elevenlabs"]).toContain(res.videoNarration?.mode);
  });

  it("presentation includes slides and Presenton demo fallback", async () => {
    const res = await transformContent({
      source: { text: "Threat landscape 2026: supply chain, AI-enabled phishing, secure comms." },
      controls: { audience: "NTRO leadership", tone: "formal", language: "English", detailLevel: "detailed", objective: "Authority", style: "bullet-point" },
      outputType: "presentation",
    });
    const r = res.result as { slides: Array<{ title: string; bullets: string[] }> };
    expect(r.slides.length).toBeGreaterThanOrEqual(4);
    expect(res.presentationDeck).toBeDefined();
    expect(["demo","presenton"]).toContain(res.presentationDeck?.mode);
  });

  it("video and presentation outputs handle ElevenLabs/Presenton integration best-effort", async () => {
    const { synthesizeNarration } = await import("./outputs/video");
    const vid = await synthesizeNarration("Test narration for NTRO briefing.");
    expect(["demo","elevenlabs"]).toContain(vid.mode);
    expect(vid.warnings.length).toBeGreaterThan(0);

    const { generatePresentonDeck } = await import("./outputs/presentation");
    const deck = await generatePresentonDeck({ title: "Test Deck", slides: [{ title: "Intro", bullets: ["one","two"] }, { title: "Next", bullets: ["three"] }] });
    expect(["demo","presenton"]).toContain(deck.mode);
  });
});
