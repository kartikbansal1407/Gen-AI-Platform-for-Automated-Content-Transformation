import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "contentforge_session";
declare global {
  var forgeSessionSecret: string | undefined;
}
const localSecret = (globalThis.forgeSessionSecret ??=
  randomBytes(32).toString("hex"));
function secret() {
  return (
    process.env.CONTENT_FORGE_ACCESS_CODE ||
    process.env.ORBITA_ACCESS_CODE ||
    localSecret
  );
}
export function createSession() {
  const expires = String(Date.now() + 30 * 86400000);
  return `${expires}.${createHmac("sha256", secret()).update(expires).digest("hex")}`;
}
export async function isAuthenticated() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const [expires, signature, extra] = value.split(".");
  if (
    !expires ||
    !signature ||
    extra !== undefined ||
    !Number.isFinite(Number(expires)) ||
    Number(expires) <= Date.now()
  )
    return false;
  const expected = createHmac("sha256", secret()).update(expires).digest("hex");
  return (
    /^[a-f0-9]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
export function isValidAccessCode(code: string) {
  const configured =
    process.env.CONTENT_FORGE_ACCESS_CODE || process.env.ORBITA_ACCESS_CODE;
  if (!configured)
    return process.env.NODE_ENV !== "production" && code.trim().length >= 1;
  const given = Buffer.from(code);
  const expected = Buffer.from(configured);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
