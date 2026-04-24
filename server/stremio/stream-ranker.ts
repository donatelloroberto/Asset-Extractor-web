import type { StremioStream } from "../../shared/schema";

const QUALITY_SCORE: Record<string, number> = {
  "2160p": 100, "4k": 100, "uhd": 100,
  "1080p": 80, "fhd": 80,
  "720p": 60, "hd": 60,
  "480p": 40, "sd": 40,
  "360p": 20,
  "240p": 10,
};

function qualityScore(stream: StremioStream): number {
  const text = `${stream.name ?? ""} ${stream.title ?? ""}`.toLowerCase();
  for (const [key, score] of Object.entries(QUALITY_SCORE)) {
    if (text.includes(key)) return score;
  }
  return 30;
}

function sourceScore(stream: StremioStream): number {
  const text = `${stream.name ?? ""} ${stream.title ?? ""}`.toLowerCase();
  if (text.includes("hls") || text.includes("m3u8")) return 5;
  if (text.includes("mp4")) return 4;
  if (text.includes("doodstream") || text.includes("dood")) return 2;
  return 3;
}

export function rankStreams(streams: StremioStream[]): StremioStream[] {
  if (!streams || streams.length <= 1) return streams;
  return [...streams].sort((a, b) => {
    const qa = qualityScore(a);
    const qb = qualityScore(b);
    if (qb !== qa) return qb - qa;
    return sourceScore(b) - sourceScore(a);
  });
}
