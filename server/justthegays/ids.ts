const PREFIX = "justthegays";

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
