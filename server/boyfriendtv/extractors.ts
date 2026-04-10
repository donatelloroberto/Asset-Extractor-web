import { fetchPage } from "../stremio/http";

const isDebug = () => process.env.DEBUG === "1";

export interface ExtractedStream {
  name: string;
  url?: string;
  externalUrl?: string;
  quality?: string;
  referer?: string;
}

export async function extractBoyfriendtvStreams(pageUrl: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];

  try {
    const html = await fetchPage(pageUrl, { referer: "https://www.boyfriendtv.com/" });

    const sourcesMatch = html.match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/);
    if (!sourcesMatch) {
      if (isDebug()) console.log(`[BoyfriendTV] No sources found on ${pageUrl}`);
      return streams;
    }

    try {
      const sourcesJson = JSON.parse(sourcesMatch[1]);

      for (const source of sourcesJson) {
        if (source.src) {
          const desc = source.desc || "Unknown";
          streams.push({
            name: `BoyfriendTV [${desc}]`,
            url: source.src,
            quality: desc,
            referer: "https://www.boyfriendtv.com/",
          });
        }
      }
    } catch (parseErr: any) {
      if (isDebug()) console.error(`[BoyfriendTV] JSON parse error: ${parseErr.message}`);
    }
  } catch (err: any) {
    if (isDebug()) console.error(`[BoyfriendTV] Extraction error: ${err.message}`);
  }

  return streams;
}
