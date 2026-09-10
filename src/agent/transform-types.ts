import { z } from "zod";
import type { Objective, Platform } from "@/shared/types";

// ---------------------------------------------------------------------------
// Core input types – Content Forge
// ---------------------------------------------------------------------------

export type OutputType =
  | "linkedin_post"
  | "twitter_post"
  | "advisory"
  | "infographic"
  | "executive_summary"
  | "video_package"
  | "presentation";

export const outputTypes: OutputType[] = [
  "linkedin_post",
  "twitter_post",
  "advisory",
  "infographic",
  "executive_summary",
  "video_package",
  "presentation",
];

export type ImageInput = {
  url?: string;
  base64?: string; // raw base64 without data: prefix
  mimeType?: string; // e.g. image/jpeg, image/png
  altText?: string;
  extractedFromLink?: boolean;
};

export type VideoInput = {
  url?: string;
  base64?: string;
  mimeType?: string; // e.g. video/mp4
  keyframes?: ImageInput[]; // handful of extracted frames for visual context
  durationSeconds?: number;
};

export type SourceContent = {
  text?: string; // free-form prompt, article body, report excerpt, etc.
  images?: ImageInput[]; // direct image uploads
  video?: VideoInput; // direct video upload
  linkUrl?: string; // fetched URL
  linkText?: string; // text extracted from link
  linkImages?: ImageInput[]; // images extracted from link
  documents?: string[]; // parsed document excerpts
  metadata?: Record<string, string>; // title, author, date, source org, etc.
};

export type OperatorControls = {
  audience: string; // target audience, e.g. "Young policy researchers"
  tone: string; // e.g. "analytical", "formal", "conversational"
  language: string; // e.g. "English", "Hindi", "Bilingual EN/HI"
  detailLevel: "brief" | "standard" | "detailed";
  objective: Objective | "Inform" | "Persuade" | "Alert" | "Mobilize" | "Brief"; // reuse Objective union from types.ts
  style: string; // e.g. "analytical", "narrative", "bullet-point"
  translateSource?: boolean;
  videoDuration?: 30 | 60 | 90;
  platform?: Platform; // hint for social outputs
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const operatorControlsSchema = z.object({
  audience: z.string().trim().min(2).max(180),
  tone: z.enum([
    "analytical",
    "formal",
    "conversational",
    "narrative",
    "assertive",
    "persuasive",
    "advisory",
    "playful",
  ]),
  language: z.enum([
    "English",
    "Hindi",
    "Hinglish",
    "Bilingual EN/HI",
    "Tamil",
    "Bengali",
  ]),
  detailLevel: z.enum(["brief", "standard", "detailed"]),
  objective: z.enum([
    "Reach",
    "Credibility",
    "Conversations",
    "Networking",
    "Opportunity",
    "Thought leadership",
    "Relationships",
    "Authority",
    "Followers",
    "Inform",
    "Persuade",
    "Alert",
    "Mobilize",
    "Brief",
  ]),
  style: z.enum([
    "professional",
    "journalistic",
    "technical",
    "narrative",
    "bullet-brief",
    "analytical",
    "bullet-point",
    "persuasive",
  ]),
  translateSource: z.boolean().optional(),
  videoDuration: z
    .union([z.literal(30), z.literal(60), z.literal(90)])
    .optional(),
  platform: z.enum(["LinkedIn", "X", "Reddit"]).optional(),
});

const base64Schema = z
  .string()
  .min(4)
  .max(14 * 1024 * 1024)
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
export const imageInputSchema = z
  .object({
    url: z.string().url().max(2000).optional(),
    base64: base64Schema.optional(),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
    altText: z.string().max(1000).optional(),
    extractedFromLink: z.boolean().optional(),
  })
  .refine(
    (v) => Boolean(v.url || (v.base64 && v.mimeType)),
    "Image contents required.",
  );
export const videoInputSchema = z
  .object({
    url: z.string().url().max(2000).optional(),
    base64: base64Schema.optional(),
    mimeType: z.enum(["video/mp4", "video/webm"]).optional(),
    keyframes: z.array(imageInputSchema).max(5).optional(),
    durationSeconds: z.number().positive().max(600).optional(),
  })
  .refine(
    (v) => Boolean(v.url || (v.base64 && v.mimeType)),
    "Video contents required.",
  );
export const sourceContentSchema = z
  .object({
    text: z.string().max(50000).optional(),
    images: z.array(imageInputSchema).max(5).optional(),
    video: videoInputSchema.optional(),
    linkUrl: z.string().url().max(2000).optional(),
    linkText: z.string().max(50000).optional(),
    linkImages: z.array(imageInputSchema).max(5).optional(),
    documents: z.array(z.string().max(50000)).max(10).optional(),
    metadata: z.record(z.string().max(100), z.string().max(2000)).optional(),
  })
  .refine(
    (v) =>
      Boolean(
        v.text?.trim() ||
        v.linkText?.trim() ||
        v.linkUrl ||
        v.documents?.some((d) => d.trim()) ||
        v.images?.length ||
        v.video,
      ),
    "Submit at least one source.",
  )
  .refine(
    (v) => (v.images?.length ?? 0) + (v.linkImages?.length ?? 0) <= 5,
    "Maximum five images per job.",
  );

// ---------------------------------------------------------------------------
// Per-output structured schemas (Zod + JSON Schema for provider constraints)
// ---------------------------------------------------------------------------

export const linkedinPostOutputSchema = z.object({
  title: z.string().min(3).max(180),
  body: z.string().min(20).max(4000),
  hashtags: z.array(z.string()).max(6).default([]),
  audience: z.string(),
  objective: operatorControlsSchema.shape.objective,
  voiceMatch: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  recommendation: z.string(),
  warnings: z.array(z.string()),
  sourceAttribution: z
    .string()
    .describe("Cite which source spans support key claims"),
  claimSupport: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      sourceEvidence: z.string(),
      flagIfWeak: z.boolean(),
    }),
  ),
});

export const twitterPostOutputSchema = z.object({
  tweets: z.array(z.string().min(10).max(280)).min(1).max(8),
  threadTitle: z.string().max(120),
  altText: z.array(z.string()).max(5),
  threadScore: z.number().min(0).max(100),
  hashtags: z.array(z.string()).max(4).default([]),
  audience: z.string(),
  objective: operatorControlsSchema.shape.objective,
  voiceMatch: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  warnings: z.array(z.string()),
  sourceAttribution: z.string(),
  claimSupport: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      sourceEvidence: z.string(),
      flagIfWeak: z.boolean(),
    }),
  ),
});

export const advisoryOutputSchema = z.object({
  title: z.string().min(5).max(200),
  background: z.string().min(10),
  assessment: z.string().min(10),
  distribution: z.string().min(2),
  classification: z.enum([
    "Unclassified",
    "Confidential",
    "Restricted",
    "Internal",
  ]),
  summary: z.string().min(20).max(2000),
  keyPoints: z.array(z.string()).min(2).max(8),
  recommendations: z.array(z.string()).min(1).max(6),
  audience: z.string(),
  language: z.string(),
  warnings: z.array(z.string()),
  sourceAttribution: z.string(),
  claimSupport: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      sourceEvidence: z.string(),
      flagIfWeak: z.boolean(),
    }),
  ),
  confidence: z.number().min(0).max(100),
});

export const infographicOutputSchema = z.object({
  title: z.string().min(5).max(180),
  headline: z.string().min(5).max(200),
  keyStats: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        sourceSpan: z
          .string()
          .describe("Exact source text that supports this stat"),
      }),
    )
    .min(5)
    .max(7),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        bullets: z.array(z.string()).min(1).max(4),
      }),
    )
    .min(2)
    .max(5),
  layout: z.string().min(10),
  callToAction: z.string().min(5),
  imagePrompt: z
    .string()
    .min(20)
    .max(600)
    .describe("Prompt for infographic image generation"),
  palette: z.string().describe("Color palette description"),
  warnings: z.array(z.string()),
  sourceAttribution: z.string(),
  claimSupport: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      sourceEvidence: z.string(),
      flagIfWeak: z.boolean(),
    }),
  ),
});

export const executiveSummaryOutputSchema = z.object({
  title: z.string().min(5).max(180),
  tldr: z.string().min(10),
  context: z.string().min(10),
  nextSteps: z.array(z.string()).min(1),
  summary: z.string().min(40).max(6000),
  keyPoints: z.array(z.string()).min(3).max(5),
  implications: z.array(z.string()).min(1).max(5),
  audience: z.string(),
  language: z.string(),
  confidence: z.number().min(0).max(100),
  warnings: z.array(z.string()),
  sourceAttribution: z.string(),
  claimSupport: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      sourceEvidence: z.string(),
      flagIfWeak: z.boolean(),
    }),
  ),
});

export const videoPackageOutputSchema = z.object({
  title: z.string().min(5).max(180),
  script: z.string().min(40).max(3000),
  narrationText: z.string().min(20).max(2000),
  scenes: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        durationSeconds: z.number().min(1).max(30),
        transition: z.string().min(2),
        visualPrompt: z.string().optional(),
      }),
    )
    .min(6)
    .max(8),
  tone: z.string(),
  warnings: z.array(z.string()),
  sourceAttribution: z.string(),
  claimSupport: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      sourceEvidence: z.string(),
      flagIfWeak: z.boolean(),
    }),
  ),
});

export const presentationOutputSchema = z.object({
  title: z.string().min(5).max(180),
  slides: z
    .array(
      z.object({
        title: z.string(),
        bullets: z.array(z.string()).min(1).max(5),
        speakerNotes: z.string().min(5),
        visualPrompt: z.string().optional(),
      }),
    )
    .min(8)
    .max(12),
  audience: z.string(),
  language: z.string(),
  warnings: z.array(z.string()),
  sourceAttribution: z.string(),
  claimSupport: z.array(
    z.object({
      claim: z.string(),
      supported: z.boolean(),
      sourceEvidence: z.string(),
      flagIfWeak: z.boolean(),
    }),
  ),
});

// Map for generic handling
export const perOutputZodSchemas: Record<OutputType, z.ZodTypeAny> = {
  linkedin_post: linkedinPostOutputSchema,
  twitter_post: twitterPostOutputSchema,
  advisory: advisoryOutputSchema,
  infographic: infographicOutputSchema,
  executive_summary: executiveSummaryOutputSchema,
  video_package: videoPackageOutputSchema,
  presentation: presentationOutputSchema,
};
