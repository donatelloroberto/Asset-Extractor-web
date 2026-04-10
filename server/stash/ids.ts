const PREFIX = "stash";

export function encodeUrl(url: string): string {
  return Buffer.from(url).toString("base64url");
}

export function decodeUrl(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf-8");
}

export function makeId(sceneId: string): string {
  return `${PREFIX}:${sceneId}`;
}

export function extractSceneId(id: string): string {
  return id.replace(`${PREFIX}:`, "");
}
