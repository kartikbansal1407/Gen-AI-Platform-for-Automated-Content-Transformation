import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { safeFetch } from "@/lib/safe-fetch";
import type { ImageInput, SourceContent } from "./transform-types";

export type IngestedLink = {
  url: string;
  text: string;
  images: ImageInput[];
  title?: string;
  fetchedAt: string;
};

export async function fetchLinkContent(url: string): Promise<IngestedLink> {
  const response = await safeFetch(url);
  if (
    !["text/html", "application/xhtml+xml", "text/plain"].includes(
      response.contentType,
    )
  )
    throw new Error("URL must return HTML or plain text.");
  if (response.contentType === "text/plain")
    return {
      url: response.url,
      text: response.bytes.toString("utf8").slice(0, 50000),
      images: [],
      fetchedAt: new Date().toISOString(),
    };
  const dom = new JSDOM(response.bytes.toString("utf8"), { url: response.url });
  try {
    const document = dom.window.document;
    document
      .querySelectorAll("script,style,noscript,iframe,form")
      .forEach((el) => el.remove());
    const images: ImageInput[] = Array.from(
      document.querySelectorAll("img[src]"),
    )
      .slice(0, 5)
      .flatMap((img) => {
        try {
          const imageUrl = new URL(img.getAttribute("src")!, response.url);
          if (!["http:", "https:"].includes(imageUrl.protocol)) return [];
          return [
            {
              url: imageUrl.href,
              altText: (img.getAttribute("alt") ?? "").slice(0, 200),
              extractedFromLink: true,
            },
          ];
        } catch {
          return [];
        }
      });
    const title = document.title.slice(0, 300);
    const article = new Readability(
      document.cloneNode(true) as Document,
    ).parse();
    const text = (article?.textContent ?? document.body.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50000);
    if (!text)
      throw new Error(
        "No readable text found. Paste the source text manually.",
      );
    return {
      url: response.url,
      text,
      images,
      title,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    dom.window.close();
  }
}

export async function fetchAndEnrichSourceWithLink(
  source: SourceContent,
): Promise<SourceContent> {
  if (!source.linkUrl || source.linkText) return source;
  const link = await fetchLinkContent(source.linkUrl);
  return {
    ...source,
    linkText: link.text,
    linkImages: link.images.slice(
      0,
      Math.max(0, 5 - (source.images?.length ?? 0)),
    ),
    metadata: {
      ...source.metadata,
      linkTitle: link.title ?? "",
      linkFetchedAt: link.fetchedAt,
    },
  };
}

export function parseDocumentExcerpts(
  documents: string[] | undefined,
): string[] {
  return (documents ?? []).map((doc) => doc.slice(0, 50000));
}
