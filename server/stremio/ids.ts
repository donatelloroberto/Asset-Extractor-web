import { createHash } from "crypto";

const PREFIX = "gxtapes";

export function encodeId(url: string): string {
  const hash = createHash("md5").update(url).digest("hex").slice(0, 12);
  return `${PREFIX}:${hash}`;
}

export function encodeUrl(url: string): string {
  return Buffer.from(url).toString("base64url");
}

export function decodeUrl(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf-8");
}

export function makeId(url: string): string {
  return `${PREFIX}:${encodeUrl(url)}`;
}

export function extractUrl(id: string): string {
  const encoded = id.replace(`${PREFIX}:`, "");
  return decodeUrl(encoded);
}
