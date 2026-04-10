export interface ResolvedStream {
  url: string;
  type: "mp4" | "m3u8" | "unknown";
  referer?: string;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function detectType(url: string): ResolvedStream["type"] {
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8") || lower.includes("/m3u8") || lower.includes("format=m3u8")) return "m3u8";
  if (lower.includes(".mp4") || lower.includes(".mkv")) return "mp4";
  return "unknown";
}

function detectTypeFromContentType(contentType: string | null): ResolvedStream["type"] {
  if (!contentType) return "unknown";
  const ct = contentType.toLowerCase();
  if (ct.includes("mpegurl") || ct.includes("m3u8") || ct.includes("x-mpegurl") || ct.includes("vnd.apple.mpegurl")) return "m3u8";
  if (ct.includes("mp4") || ct.includes("video/mp4") || ct.includes("octet-stream")) return "mp4";
  return "unknown";
}

function detectTypeFromContent(text: string): ResolvedStream["type"] {
  const trimmed = text.trim();
  if (trimmed.startsWith("#EXTM3U") || trimmed.includes("#EXT-X-")) return "m3u8";
  return "unknown";
}

function toAbsoluteUrl(sourceUrl: string, value: string): string {
  if (value.startsWith("http")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return new URL(value, sourceUrl).toString();
}

export async function resolveMedia(url: string, referer?: string, depth = 0): Promise<ResolvedStream> {
  if (depth > 2) return { url, type: detectType(url), referer };

  const directType = detectType(url);
  if (directType !== "unknown") {
    return { url, type: directType, referer };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(referer ? { Referer: referer } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { url, type: "unknown", referer };
    }

    const contentType = response.headers.get("content-type");
    const ctType = detectTypeFromContentType(contentType);
    if (ctType !== "unknown") {
      if (ctType === "m3u8") {
        return { url, type: "m3u8", referer: referer || url };
      }
      return { url, type: ctType, referer };
    }

    const html = await response.text();

    const contentBasedType = detectTypeFromContent(html);
    if (contentBasedType === "m3u8") {
      return { url, type: "m3u8", referer: referer || url };
    }

    const mediaRegexes = [
      /(?:file|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/i,
      /<source[^>]+src=["']([^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/i,
      /https?:\/\/[^\s"']+\.(?:m3u8|mp4|mkv)[^\s"']*/i,
    ];

    for (const regex of mediaRegexes) {
      const match = html.match(regex);
      if (match?.[1] || match?.[0]) {
        const candidate = (match[1] || match[0]).replace(/\\\//g, "/");
        const absolute = toAbsoluteUrl(url, candidate);
        return { url: absolute, type: detectType(absolute), referer: url };
      }
    }

    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch?.[1]) {
      const iframeUrl = toAbsoluteUrl(url, iframeMatch[1]);
      return resolveMedia(iframeUrl, url, depth + 1);
    }
  } catch {
    return { url, type: "unknown", referer };
  }

  return { url, type: "unknown", referer };
}
