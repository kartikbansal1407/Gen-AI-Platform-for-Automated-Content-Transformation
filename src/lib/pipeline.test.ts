// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { parseDocument } from "@/agent/ingest/parse";
import { isPublicAddress, resolvePublicUrl } from "./safe-fetch";
import {
  sourceContentSchema,
  operatorControlsSchema,
  perOutputZodSchemas,
  outputTypes,
} from "@/agent/transform-types";
import { demoOutput, subtitles } from "./output-format";
import { transform } from "@/agent/transform";
import { POST } from "@/app/api/transform/route";
import { POST as ingest } from "@/app/api/ingest/route";
import { buildJobZip } from "./exports";
import { validateMedia } from "./ingest-request";
const controls = {
  audience: "NTRO analysts",
  tone: "formal",
  language: "English",
  detailLevel: "standard" as const,
  objective: "Inform" as const,
  style: "technical",
};
const source = {
  text: "The team issued 18 advisories. Incidents increased by 42 percent. Analysts will review source evidence.",
};
describe("source boundaries", () => {
  it("extracts an actual PDF with page and word metadata", async () => {
    const bytes = await readFile("e2e/fixtures/incident-report.pdf");
    const doc = await parseDocument({
      filename: "report.pdf",
      mimeType: "application/pdf",
      base64: bytes.toString("base64"),
      size: bytes.length,
    });
    expect(doc.text).toContain("18 advisories");
    expect(doc.pages).toBe(1);
    expect(doc.wordCount).toBeGreaterThan(20);
  });
  it("extracts DOCX content and rejects binary-as-text fallbacks", async () => {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    );
    zip.file(
      "word/document.xml",
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Verified report text</w:t></w:r></w:p></w:body></w:document>',
    );
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    const result = await parseDocument({
      filename: "report.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      base64: bytes.toString("base64"),
      size: bytes.length,
    });
    expect(result.text).toContain("Verified report text");
    await expect(
      parseDocument({
        filename: "bad.pdf",
        mimeType: "application/pdf",
        base64: "dGVzdA==",
        size: 4,
      }),
    ).rejects.toThrow("signature");
  });
  it("rejects empty sources, too many images, and mismatched media", () => {
    expect(sourceContentSchema.safeParse({ text: " " }).success).toBe(false);
    expect(
      sourceContentSchema.safeParse({
        images: Array.from({ length: 6 }, () => ({
          url: "https://example.com/a.png",
        })),
      }).success,
    ).toBe(false);
    expect(() =>
      validateMedia(Buffer.from("fake image"), "image/png"),
    ).toThrow();
  });
  it.each([
    "127.0.0.1",
    "10.2.3.4",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("blocks nonpublic address %s", (address) =>
    expect(isPublicAddress(address)).toBe(false),
  );
  it("blocks private URLs, credentials and unusual schemes", async () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    for (const url of [
      "http://127.0.0.1/",
      "http://[::1]/",
      "file:///etc/passwd",
      "https://user:pass@example.com",
    ]) {
      await expect(resolvePublicUrl(url)).rejects.toThrow();
    }
  });
  it("accepts multipart PDF plus prompt through the ingest route", async () => {
    const bytes = await readFile("e2e/fixtures/incident-report.pdf");
    const form = new FormData();
    form.set(
      "files",
      new File([bytes], "report.pdf", { type: "application/pdf" }),
    );
    form.set("prompt", "Prepare a briefing");
    const res = await ingest(
      new Request("http://localhost/api/ingest", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preview).toContain("18 advisories");
    expect(json.preview).toContain("Prepare a briefing");
  });
});
describe("deliverable contracts", () => {
  it.each(outputTypes)(
    "validates %s demo output, including very short sources",
    (type) => {
      expect(
        perOutputZodSchemas[type].safeParse(demoOutput(type, source, controls))
          .success,
      ).toBe(true);
      expect(
        perOutputZodSchemas[type].safeParse(
          demoOutput(type, { text: "AI" }, controls),
        ).success,
      ).toBe(true);
    },
  );
  it("accepts SIH objectives and translation controls", () => {
    for (const objective of [
      "Inform",
      "Persuade",
      "Alert",
      "Mobilize",
      "Brief",
    ])
      expect(
        operatorControlsSchema.safeParse({
          ...controls,
          objective,
          translateSource: true,
          videoDuration: 90,
        }).success,
      ).toBe(true);
  });
  it("builds all outputs and preserves attachments and full package sections", async () => {
    const result = await transform(source, controls, outputTypes);
    expect(result.status).toBe("done");
    expect(result.artefacts).toHaveLength(7);
    expect(
      result.artefacts.find((a) => a.type === "video_package")?.metadata,
    ).toHaveProperty("srt");
    expect(
      result.artefacts.find((a) => a.type === "video_package")?.metadata,
    ).toHaveProperty("videoNarration");
    expect(
      result.artefacts.find((a) => a.type === "presentation")?.body,
    ).toContain("Speaker notes");
    expect(result.artefacts.find((a) => a.type === "advisory")?.body).toContain(
      "background",
    );
  });
  it("creates subtitles ending at the selected duration", () => {
    const result = subtitles("This is a narration with a few words.", 30);
    expect(result.srt).toContain("00:00:30,000");
    expect(result.vtt).toMatch(/^WEBVTT/);
  });
  it("streams three outputs and produces a real ZIP", async () => {
    const res = await POST(
      new Request("http://localhost/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          source,
          controls,
          outputTypes: ["linkedin_post", "advisory", "executive_summary"],
          overrides: {},
        }),
      }),
    );
    expect(res.status).toBe(200);
    const events = (await res.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.filter((e) => e.event === "artefact")).toHaveLength(3);
    const job = events.at(-1).job;
    expect(job.status).toBe("done");
    const zip = await JSZip.loadAsync(await buildJobZip(job));
    expect(zip.file("advisory/advisory.md")).not.toBeNull();
  });
  it("rejects duplicate output requests before generation", async () => {
    const res = await POST(
      new Request("http://localhost/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          controls,
          outputTypes: ["advisory", "advisory"],
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
  it("requires auth when a configured access code is present", async () => {
    vi.stubEnv("CONTENT_FORGE_ACCESS_CODE", "test-secret");
    const auth = await import("@/backend/auth");
    expect(auth.isValidAccessCode("wrong")).toBe(false);
    expect(auth.isValidAccessCode("test-secret")).toBe(true);
    expect(auth.createSession()).not.toBe("demo-session");
  });
});
