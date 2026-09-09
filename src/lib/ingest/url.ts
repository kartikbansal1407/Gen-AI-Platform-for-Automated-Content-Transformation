export type UrlFetchResult = {
  url: string;
  title?: string;
  text: string;
  images: string[];
  warning?: string;
};

const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "::ffff:"];

function isBlockedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    if (blockedHosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h))) return true;
    if (u.hostname.startsWith("10.") || u.hostname.startsWith("192.168.") || u.hostname.startsWith("172.")) return true;
    return false;
  } catch {
    return true;
  }
}

export async function fetchUrlContent(url: string): Promise<UrlFetchResult> {
  if (isBlockedUrl(url)) throw new Error("URL blocked by SSRF guard");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ContentForge/1.0 (+SIH PS26154)" },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : undefined;
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40000);
    const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 5);
    return { url, title, text, images: imgMatches };
  } finally {
    clearTimeout(timeout);
  }
}
