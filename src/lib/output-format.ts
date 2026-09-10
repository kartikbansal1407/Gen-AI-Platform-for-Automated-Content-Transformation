import type {
  OperatorControls,
  OutputType,
  SourceContent,
} from "@/agent/transform-types";

export function sourceText(source: SourceContent) {
  return [source.text, ...(source.documents ?? []), source.linkText]
    .filter(Boolean)
    .join("\n\n");
}

export function demoOutput(
  type: OutputType,
  source: SourceContent,
  controls: OperatorControls,
) {
  const text = sourceText(source).trim();
  const excerpt =
    (text.length >= 40
      ? text.slice(0, 600)
      : text
        ? `Source excerpt: ${text}. Additional source context is required before substantive analysis.`
        : "") ||
    "No readable source text is available. Supply a transcript or image description.";
  const points = (text.match(/[^.!?\n]+[.!?]?/g) ?? [excerpt])
    .map((p) => p.trim())
    .filter(Boolean);
  const point = (i: number) =>
    points[i]
      ? `Source excerpt: ${points[i].slice(0, 280)}`
      : "Source does not provide additional evidence; operator review required.";
  const warnings = [
    "Demo template: live AI is unavailable or returned invalid output. Review before use.",
    "Only source excerpts are included; requested tone, translation and length may require live generation.",
  ];
  const common = {
    warnings,
    sourceAttribution: source.linkUrl
      ? `Source: ${source.linkUrl}`
      : "Operator-provided source",
    claimSupport: text
      ? [
          {
            claim: excerpt,
            supported: true,
            sourceEvidence: text.slice(0, 600),
            flagIfWeak: false,
          },
        ]
      : [],
    confidence: 30,
    audience: controls.audience,
    language: controls.language,
  };
  const title = `${type.replaceAll("_", " ")}: ${excerpt.slice(0, 60)}`;
  switch (type) {
    case "linkedin_post":
      return {
        ...common,
        title,
        body: `${excerpt}\n\nReview the source and its context before drawing conclusions.`,
        hashtags: [],
        objective: controls.objective,
        voiceMatch: 30,
        recommendation: "Add verified context before publication.",
      };
    case "twitter_post":
      return {
        ...common,
        threadTitle: title.slice(0, 120),
        tweets:
          controls.detailLevel === "brief"
            ? [excerpt.slice(0, 280)]
            : Array.from(
                { length: 4 },
                (_, i) => `${i + 1}/4 ${point(i).slice(0, 270)}`,
              ),
        hashtags: [],
        altText: (source.images ?? []).map(
          (img) => img.altText ?? "Image requires operator description.",
        ),
        threadScore: 30,
        objective: controls.objective,
        voiceMatch: 30,
      };
    case "advisory":
      return {
        ...common,
        title,
        classification: "Unclassified",
        summary: excerpt,
        background: point(0),
        assessment:
          "Source evidence needs operator assessment before dissemination.",
        distribution: controls.audience,
        keyPoints: [point(0), point(1)],
        recommendations: [
          "Verify source claims and assign an accountable reviewer.",
        ],
      };
    case "infographic":
      return {
        ...common,
        title,
        headline: excerpt.slice(0, 150),
        keyStats: Array.from({ length: 5 }, (_, i) => ({
          label: `Source point ${i + 1}`,
          value: point(i),
          sourceSpan:
            points[i]?.slice(0, 300) ?? "Not supplied; leave unfilled.",
        })),
        sections: [
          { heading: "Source context", bullets: [point(0)] },
          {
            heading: "Review",
            bullets: ["Check citations before using this layout."],
          },
        ],
        imagePrompt: `Create a restrained editorial layout with space for verified copy about ${excerpt.slice(0, 100)}. Do not invent numbers.`,
        palette: "Navy, slate and white",
        layout:
          "Headline above five stacked copy blocks; document icons, source citations below each block, restrained navy emphasis.",
        callToAction: "Consult the original source and verify its context.",
      };
    case "executive_summary":
      return {
        ...common,
        title,
        tldr: excerpt.slice(0, 200),
        context: point(0),
        summary: excerpt,
        keyPoints: [point(0), point(1), point(2)],
        implications: [
          "Assess implications using the complete source; no additional findings inferred.",
        ],
        nextSteps: ["Confirm evidence and brief the responsible operator."],
      };
    case "video_package":
      return {
        ...common,
        title,
        script: `Opening: ${excerpt}\n\nClosing: Consult the source and verify its context.`,
        narrationText: excerpt,
        scenes: Array.from({ length: 6 }, (_, i) => ({
          title: [
            "Title",
            "Context",
            "Source detail",
            "Evidence",
            "Review",
            "Closing",
          ][i],
          description: point(i),
          durationSeconds: (controls.videoDuration ?? 60) / 6,
          transition: "Cut",
          visualPrompt:
            "Use a neutral document card with the verified source excerpt; no invented statistics.",
        })),
        tone: controls.tone,
      };
    case "presentation":
      return {
        ...common,
        title,
        slides: [
          "Title",
          "Agenda",
          "Context",
          "Source detail",
          "Evidence",
          "Implications",
          "Review",
          "Next steps",
        ].map((heading, i) => ({
          title: heading,
          bullets: [point(i)],
          speakerNotes: `Explain the source excerpt and flag gaps. ${point(i)}`,
          visualPrompt: "Simple text slide with source attribution.",
        })),
      };
  }
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.map((v) => `- ${String(v)}`).join("\n")
    : "";
}
export function formatOutput(
  type: OutputType,
  data: Record<string, unknown>,
): string {
  const title = `# ${String(data.title ?? data.threadTitle ?? type)}\n\n`;
  switch (type) {
    case "linkedin_post":
      return (
        title +
        String(data.body) +
        "\n\n" +
        (Array.isArray(data.hashtags) ? data.hashtags.join(" ") : "")
      );
    case "twitter_post":
      return (
        title +
        (data.tweets as string[]).join("\n\n") +
        "\n\n" +
        list(data.altText)
      );
    case "advisory":
      return (
        title +
        [
          "classification",
          "summary",
          "background",
          "assessment",
          "keyPoints",
          "recommendations",
          "distribution",
        ]
          .map(
            (key) =>
              `## ${key}\n\n${Array.isArray(data[key]) ? list(data[key]) : data[key]}`,
          )
          .join("\n\n")
      );
    case "executive_summary":
      return (
        title +
        ["tldr", "context", "summary", "keyPoints", "implications", "nextSteps"]
          .map(
            (key) =>
              `## ${key}\n\n${Array.isArray(data[key]) ? list(data[key]) : data[key]}`,
          )
          .join("\n\n")
      );
    case "infographic":
      return (
        title +
        `## Headline\n${data.headline}\n\n` +
        (
          data.keyStats as Array<{
            label: string;
            value: string;
            sourceSpan: string;
          }>
        )
          .map((p) => `### ${p.label}\n${p.value}\nSource: ${p.sourceSpan}`)
          .join("\n\n") +
        "\n\n" +
        (data.sections as Array<{ heading: string; bullets: string[] }>)
          .map((s) => `## ${s.heading}\n${list(s.bullets)}`)
          .join("\n\n") +
        `\n\n## Layout\n${data.layout}\n\n## Palette\n${data.palette}\n\n## Call to action\n${data.callToAction}`
      );
    case "video_package":
      return (
        title +
        `## Script\n${data.script}\n\n## Narration\n${data.narrationText}\n\n## Storyboard\n` +
        (data.scenes as Array<Record<string, unknown>>)
          .map(
            (s, i) =>
              `### ${i + 1}. ${s.title} (${s.durationSeconds}s)\n${s.description}\nVisual: ${s.visualPrompt ?? ""}\nTransition: ${s.transition}`,
          )
          .join("\n\n")
      );
    case "presentation":
      return (
        title +
        (
          data.slides as Array<{
            title: string;
            bullets: string[];
            speakerNotes: string;
          }>
        )
          .map(
            (s, i) =>
              `## ${i + 1}. ${s.title}\n${list(s.bullets)}\n\nSpeaker notes: ${s.speakerNotes}`,
          )
          .join("\n\n---\n\n")
      );
  }
}

export function subtitles(narration: string, duration: number) {
  const words = narration.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 12)
    chunks.push(words.slice(i, i + 12).join(" "));
  const stamp = (seconds: number, separator: string) =>
    new Date(Math.round(seconds * 1000))
      .toISOString()
      .slice(11, 23)
      .replace(".", separator);
  const render = (separator: string) =>
    chunks
      .map(
        (chunk, i) =>
          `${i + 1}\n${stamp((duration * i) / chunks.length, separator)} --> ${stamp((duration * (i + 1)) / chunks.length, separator)}\n${chunk}`,
      )
      .join("\n\n") + "\n";
  return { srt: render(","), vtt: `WEBVTT\n\n${render(".")}` };
}

export function validateOutputClaims(
  data: Record<string, unknown>,
  source: SourceContent,
  controls: OperatorControls,
) {
  const warnings = [...((data.warnings as string[]) ?? [])];
  const corpus = sourceText(source);
  const claims = data.claimSupport as Array<{
    claim: string;
    supported: boolean;
    sourceEvidence: string;
    flagIfWeak: boolean;
  }>;
  let weak = false;
  for (const claim of claims ?? []) {
    if (!claim.sourceEvidence || !corpus.includes(claim.sourceEvidence)) {
      claim.supported = false;
      claim.flagIfWeak = true;
      weak = true;
    }
  }
  if (weak) {
    warnings.push(
      "Some source citations could not be matched; verify flagged claims.",
    );
    data.confidence = Math.min(Number(data.confidence ?? 50), 40);
  }
  const prose = JSON.stringify(
    Object.fromEntries(
      Object.entries(data).filter(
        ([key]) =>
          ![
            "warnings",
            "sourceAttribution",
            "claimSupport",
            "audience",
            "language",
          ].includes(key),
      ),
    ),
  );
  if (
    ["Hindi", "Hinglish", "Bilingual EN/HI"].includes(controls.language) &&
    !/[\u0900-\u097f]/.test(prose)
  )
    warnings.push(
      "Requested Hindi/Hinglish language could not be verified; review translation (Roman Hinglish may be valid).",
    );
  if (
    /\b(game.changer|delve|in today's fast.paced world|like and share|agree\?)\b/i.test(
      prose,
    )
  )
    warnings.push(
      "Review generic or engagement-bait wording before publication.",
    );
  if (Array.isArray(data.keyStats)) {
    for (const stat of data.keyStats as Array<{ sourceSpan: string }>) {
      if (!stat.sourceSpan || !corpus.includes(stat.sourceSpan)) {
        warnings.push(
          "Some infographic points lack matching source evidence; leave unsupported fields unfilled.",
        );
        break;
      }
    }
  }
  if (typeof data.body === "string") {
    const count = data.body.split(/\s+/).filter(Boolean).length;
    if (count < 280 || count > 600)
      warnings.push(
        "LinkedIn word target (280–600) not met; preserve source fidelity when editing.",
      );
  }
  if (Array.isArray(data.scenes)) {
    const total = (data.scenes as Array<{ durationSeconds: number }>).reduce(
      (sum, scene) => sum + scene.durationSeconds,
      0,
    );
    if (Math.abs(total - (controls.videoDuration ?? 60)) > 0.1)
      warnings.push(
        "Storyboard duration differs from the requested duration; review before recording.",
      );
  }
  data.warnings = warnings;
  return data;
}
