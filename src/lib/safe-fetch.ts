import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import ipaddr from "ipaddr.js";

export function isPublicAddress(address: string): boolean {
  try {
    return (
      ipaddr.process(address.replace(/^\[|\]$/g, "")).range() === "unicast"
    );
  } catch {
    return false;
  }
}

export async function resolvePublicUrl(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  ) {
    throw new Error("Only public HTTP(S) URLs on standard ports are allowed.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const allowlist = (process.env.INGEST_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length && !allowlist.includes(host.toLowerCase()))
    throw new Error("URL hostname is not allowed.");
  const addresses = ipaddr.isValid(host)
    ? [{ address: host, family: ipaddr.parse(host).kind() === "ipv4" ? 4 : 6 }]
    : await lookup(host, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicAddress(address))
  )
    throw new Error("Private or reserved URL blocked.");
  return { url, address: addresses[0] };
}

// Pin the validated DNS result to the connection, including on redirects, to prevent rebinding.
export async function safeFetch(
  value: string,
  maxBytes = 2 * 1024 * 1024,
): Promise<{ bytes: Buffer; contentType: string; url: string }> {
  const signal = AbortSignal.timeout(8000);
  let current = value;
  for (let redirects = 0; redirects <= 3; redirects++) {
    const { url, address } = await Promise.race([
      resolvePublicUrl(current),
      new Promise<never>((_, reject) =>
        signal.addEventListener(
          "abort",
          () => reject(new Error("URL fetch timed out.")),
          { once: true },
        ),
      ),
    ]);
    signal.throwIfAborted();
    const result = await new Promise<{
      bytes: Buffer;
      contentType: string;
      location?: string;
    }>((resolve, reject) => {
      const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          signal,
          family: address.family,
          headers: {
            "User-Agent": "ContentForge/1.0",
            Accept: "text/html,text/plain,image/*,video/mp4,video/webm",
          },
          lookup: (_hostname, _options, callback) =>
            callback(null, address.address, address.family),
        },
        (res) => {
          if (
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode)
          ) {
            res.resume();
            if (!res.headers.location)
              return reject(new Error("Redirect missing location."));
            try {
              return resolve({
                bytes: Buffer.alloc(0),
                contentType: "",
                location: new URL(res.headers.location, url).href,
              });
            } catch {
              return reject(new Error("Invalid redirect location."));
            }
          }
          if (
            !res.statusCode ||
            res.statusCode < 200 ||
            res.statusCode >= 300
          ) {
            res.resume();
            return reject(
              new Error(`Source request failed (${res.statusCode}).`),
            );
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > maxBytes) {
              res.destroy();
              reject(new Error("Source exceeds download size limit."));
            } else chunks.push(chunk);
          });
          res.on("error", reject);
          res.on("end", () =>
            resolve({
              bytes: Buffer.concat(chunks),
              contentType: (res.headers["content-type"] ?? "")
                .split(";")[0]
                .trim(),
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
    if (result.location) {
      current = result.location;
      continue;
    }
    return { ...result, url: url.href };
  }
  throw new Error("Too many redirects.");
}
