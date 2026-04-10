import { fetchPage } from "../stremio/http";
import * as cheerio from "cheerio";
import type { ExtractedStream } from "../fxggxt/extractors";

const isDebug = () => process.env.DEBUG === "1";

const VIDEO_URL_REGEX = /https?:\/\/[^\s'"]+?\.(?:mp4|m3u8|webm)(\?[^'"\s<>]*)?/g;

function getStreamLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("aucdn.net")) return "CDN";
    return "Direct";
  } catch {
    return "Direct";
  }
}

function extractVideoUrls(text: string): string[] {
  const matches = text.match(VIDEO_URL_REGEX);
  if (!matches) return [];
  return matches.map(m => m.replace(/['">\s]+$/, ""));
}

export async function extractJustthegaysStreams(pageUrl: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  const seenUrls = new Set<string>();

  function addStream(url: string) {
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    streams.push({
      name: getStreamLabel(url),
      url,
      referer: pageUrl,
    });
  }

  try {
    const html = await fetchPage(pageUrl, { referer: "https://justthegays.com/" });
    const $ = cheerio.load(html);

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html() || "";
        const urls = extractVideoUrls(text);
        for (const u of urls) addStream(u);
      } catch {}
    });

    $("video source, video[src], video[data-src]").each((_, el) => {
      const $el = $(el);
      const src = $el.attr("src") || $el.attr("data-src");
      if (src && /\.(mp4|m3u8|webm)/.test(src)) {
        const fullUrl = src.startsWith("http") ? src : (src.startsWith("//") ? `https:${src}` : `https://justthegays.com${src}`);
        addStream(fullUrl);
      }
    });
    $("source[src], source[data-src]").each((_, el) => {
      const $el = $(el);
      const src = $el.attr("src") || $el.attr("data-src");
      if (src && /\.(mp4|m3u8|webm)/.test(src)) {
        const fullUrl = src.startsWith("http") ? src : (src.startsWith("//") ? `https:${src}` : `https://justthegays.com${src}`);
        addStream(fullUrl);
      }
    });

    const iframeSrcs: string[] = [];
    $("iframe[src]").each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        const fullSrc = src.startsWith("//") ? `https:${src}` : src;
        if (fullSrc.startsWith("http")) {
          iframeSrcs.push(fullSrc);
        }
      }
    });

    for (const iframeSrc of iframeSrcs) {
      try {
        const iframeHtml = await fetchPage(iframeSrc, { referer: pageUrl });
        const urls = extractVideoUrls(iframeHtml);
        for (const u of urls) addStream(u);
      } catch (err: any) {
        if (isDebug()) console.error(`[Justthegays] iframe fetch error for ${iframeSrc}: ${err.message}`);
      }
    }

    if (streams.length === 0) {
      const urls = extractVideoUrls(html);
      for (const u of urls) addStream(u);
    }
  } catch (err: any) {
    if (isDebug()) console.error(`[Justthegays] Page extraction error: ${err.message}`);
  }

  return streams;
}
