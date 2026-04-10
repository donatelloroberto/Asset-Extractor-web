import { fetchPage } from "./http";
import * as cheerio from "cheerio";

const isDebug = () => process.env.DEBUG === "1";

export interface ExtractedStream {
  name: string;
  url: string;
  quality?: string;
  referer?: string;
}

export async function extractStreams(pageUrl: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];

  try {
    const html = await fetchPage(pageUrl);
    const $ = cheerio.load(html);

    const iframes: string[] = [];
    $("#video-code iframe, .video-embed iframe, #player iframe").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("SRC");
      if (src) iframes.push(src);
    });

    const iframeSrcMatches = html.match(/<IFRAME[^>]*SRC="([^"]+)"/gi) || [];
    for (const m of iframeSrcMatches) {
      const srcMatch = m.match(/SRC="([^"]+)"/i);
      if (srcMatch && !iframes.includes(srcMatch[1])) {
        iframes.push(srcMatch[1]);
      }
    }

    if (isDebug()) console.log(`[Extractor] Found ${iframes.length} iframes on ${pageUrl}`);

    for (const src of iframes) {
      if (isDebug()) console.log(`[Extractor] Found iframe src: ${src}`);

      try {
        const extracted = await resolveEmbed(src);
        streams.push(...extracted);
      } catch (err: any) {
        if (isDebug()) console.error(`[Extractor] Failed to resolve ${src}:`, err.message);
      }
    }
  } catch (err: any) {
    if (isDebug()) console.error(`[Extractor] Failed to load page ${pageUrl}:`, err.message);
  }

  return streams;
}

async function resolveEmbed(embedUrl: string): Promise<ExtractedStream[]> {
  const url = embedUrl.startsWith("//") ? `https:${embedUrl}` : embedUrl;

  if (url.includes("74k.io")) {
    return extractGXtapes(url);
  }
  if (url.includes("88z.io")) {
    return extract88z(url);
  }
  if (url.includes("44x.io")) {
    return extract44x(url);
  }
  if (url.includes("vid.xtapes")) {
    return extractVID(url);
  }
  if (url.includes("dood") || url.includes("doodstream") || url.includes("d0o0d") || url.includes("ds2play") || url.includes("dsvplay") || url.includes("myvidplay")) {
    return extractDoodStream(url);
  }

  return extractGenericIframe(url);
}

async function extractGXtapes(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url, { referer: "https://gay.xtapes.tw/" });

    const evalBlock = findEvalBlock(html);
    if (!evalBlock) {
      if (isDebug()) console.log("[GXtapes] No packed script found");
      return streams;
    }

    const unpacked = unpack(evalBlock);
    if (!unpacked) {
      if (isDebug()) console.log("[GXtapes] Unpack failed");
      return streams;
    }

    if (isDebug()) console.log("[GXtapes] Unpacked length:", unpacked.length);

    const linksMatch = unpacked.match(/var\s+links\s*=\s*\{([^}]+)\}/);
    if (linksMatch) {
      try {
        const linksContent = linksMatch[1];
        const urlPairs = Array.from(linksContent.matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g));
        for (const pair of urlPairs) {
          const quality = pair[1];
          let streamUrl = pair[2];
          if (!streamUrl.startsWith("http")) {
            const urlObj = new URL(url);
            streamUrl = `${urlObj.protocol}//${urlObj.host}${streamUrl.startsWith("/") ? "" : "/"}${streamUrl}`;
          }
          streams.push({
            name: `GXtapes ${quality}`,
            url: streamUrl,
            quality,
            referer: url,
          });
        }
      } catch (e: any) {
        if (isDebug()) console.error("[GXtapes] Links parse error:", e.message);
      }
    }

    if (streams.length === 0) {
      const hlsUrls = unpacked.match(/https?:\/\/[^\s"'\\}]+\.m3u8[^\s"'\\}]*/g);
      if (hlsUrls) {
        const seen = new Set<string>();
        for (const hlsUrl of hlsUrls) {
          if (!seen.has(hlsUrl)) {
            seen.add(hlsUrl);
            streams.push({
              name: "GXtapes HLS",
              url: hlsUrl,
              referer: url,
            });
          }
        }
      }
    }

    if (streams.length === 0) {
      const mp4Urls = unpacked.match(/https?:\/\/[^\s"'\\}]+\.mp4[^\s"'\\}]*/g);
      if (mp4Urls) {
        for (const mp4Url of mp4Urls) {
          streams.push({
            name: "GXtapes MP4",
            url: mp4Url,
            referer: url,
          });
        }
      }
    }

    if (streams.length === 0) {
      const fileMatch = unpacked.match(/file\s*:\s*"([^"]+)"/);
      if (fileMatch) {
        let fileUrl = fileMatch[1];
        if (!fileUrl.startsWith("http")) {
          const urlObj = new URL(url);
          fileUrl = `${urlObj.protocol}//${urlObj.host}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
        }
        streams.push({
          name: "GXtapes",
          url: fileUrl,
          referer: url,
        });
      }
    }

    if (isDebug()) console.log(`[GXtapes] Found ${streams.length} streams`);
  } catch (err: any) {
    if (isDebug()) console.error("[GXtapes] Extraction error:", err.message);
  }
  return streams;
}

async function extract88z(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url, { referer: "https://gay.xtapes.tw/" });

    const evalBlock = findEvalBlock(html);
    if (evalBlock) {
      const unpacked = unpack(evalBlock);
      if (unpacked) {
        const hlsUrls = unpacked.match(/https?:\/\/[^\s"'\\}]+\.m3u8[^\s"'\\}]*/g);
        if (hlsUrls) {
          for (const hlsUrl of hlsUrls) {
            streams.push({
              name: "88z.io HLS",
              url: hlsUrl,
              referer: url,
            });
          }
        }
        const fileMatch = unpacked.match(/file\s*:\s*["']([^"']+)["']/);
        if (fileMatch && streams.length === 0) {
          streams.push({
            name: "88z.io",
            url: fileMatch[1],
            referer: url,
          });
        }
      }
    }

    if (streams.length === 0) {
      const srcMatch = html.match(/src:\s*['"]([^'"]+)['"]/);
      if (srcMatch) {
        streams.push({
          name: "88z.io",
          url: srcMatch[1],
          referer: url,
        });
      }
    }
  } catch (err: any) {
    if (isDebug()) console.error("[88z.io] Extraction error:", err.message);
  }
  return streams;
}

async function extract44x(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url, { referer: "https://gay.xtapes.tw/" });

    const evalBlock = findEvalBlock(html);
    if (evalBlock) {
      const unpacked = unpack(evalBlock);
      if (unpacked) {
        const hlsUrls = unpacked.match(/https?:\/\/[^\s"'\\}]+\.m3u8[^\s"'\\}]*/g);
        if (hlsUrls) {
          for (const hlsUrl of hlsUrls) {
            streams.push({
              name: "44x.io HLS",
              url: hlsUrl,
              referer: url,
            });
          }
        }
      }
    }

    if (streams.length === 0) {
      const srcMatch = html.match(/src:\s*['"]([^'"]+)['"]/);
      if (srcMatch) {
        streams.push({
          name: "44x.io",
          url: srcMatch[1],
          referer: url,
        });
      }
    }
  } catch (err: any) {
    if (isDebug()) console.error("[44x.io] Extraction error:", err.message);
  }
  return streams;
}

async function extractVID(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url, { referer: "https://gay.xtapes.tw/" });
    const srcMatch = html.match(/src:\s*['"]([^'"]+)['"]/);
    if (srcMatch) {
      streams.push({
        name: "VID Xtapes",
        url: srcMatch[1],
        referer: url,
      });
    }
  } catch (err: any) {
    if (isDebug()) console.error("[VID] Extraction error:", err.message);
  }
  return streams;
}

async function extractDoodStream(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const mainUrl = new URL(url).origin;
    const html = await fetchPage(url);

    const passMd5Match = html.match(/\/pass_md5\/[^'"*/]*/);
    if (!passMd5Match) return streams;

    const passMd5Path = passMd5Match[0];
    const token = passMd5Path.split("/").pop() || "";
    const slug = url.split("/").pop() || "";

    const md5Url = `${mainUrl}${passMd5Path}`;
    const videoData = await fetchPage(md5Url, {
      referer: `${mainUrl}/${slug}`,
    });

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomStr = "";
    for (let i = 0; i < 10; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const finalUrl = `${videoData}${randomStr}?token=${token}&expiry=${Date.now()}`;

    const qualityMatch = html.match(/<title>.*?(\d{3,4}p).*?<\/title>/);
    const quality = qualityMatch ? qualityMatch[1] : undefined;

    streams.push({
      name: `DoodStream${quality ? ` ${quality}` : ""}`,
      url: finalUrl,
      quality,
      referer: mainUrl,
    });
  } catch (err: any) {
    if (isDebug()) console.error("[DoodStream] Extraction error:", err.message);
  }
  return streams;
}

async function extractGenericIframe(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url);

    const srcMatch = html.match(/src:\s*['"]([^'"]+)['"]/);
    if (srcMatch) {
      streams.push({
        name: new URL(url).hostname,
        url: srcMatch[1],
        referer: url,
      });
      return streams;
    }

    const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
    if (fileMatch) {
      streams.push({
        name: new URL(url).hostname,
        url: fileMatch[1],
        referer: url,
      });
    }
  } catch (err: any) {
    if (isDebug()) console.error("[Generic] Extraction error:", err.message);
  }
  return streams;
}

function findEvalBlock(html: string): string | null {
  const evalStart = html.indexOf("eval(function(p,a,c,k,e,d)");
  if (evalStart === -1) {
    const altStart = html.indexOf("eval(function(p,a,c,k,e,r)");
    if (altStart === -1) return null;
    return findEvalBlockFrom(html, altStart);
  }
  return findEvalBlockFrom(html, evalStart);
}

function findEvalBlockFrom(html: string, evalStart: number): string | null {
  let depth = 0;
  for (let i = evalStart; i < html.length; i++) {
    if (html[i] === "(") depth++;
    if (html[i] === ")") {
      depth--;
      if (depth === 0) {
        return html.substring(evalStart, i + 1);
      }
    }
  }
  return null;
}

function unpack(packed: string): string | null {
  try {
    const bodyEnd = packed.indexOf("return p}(");
    if (bodyEnd === -1) {
      if (isDebug()) console.log("[Unpack] Could not find function body end");
      return null;
    }

    const argsStr = packed.substring(bodyEnd + "return p}(".length);

    let inStr = false;
    let strStart = -1;
    let strEnd = -1;
    for (let i = 0; i < argsStr.length; i++) {
      if (argsStr[i] === "'" && (i === 0 || argsStr[i - 1] !== "\\")) {
        if (!inStr) {
          inStr = true;
          strStart = i + 1;
        } else {
          strEnd = i;
          break;
        }
      }
    }

    if (strEnd <= 0) {
      if (isDebug()) console.log("[Unpack] Could not find encoded string boundaries");
      return null;
    }

    const p = argsStr.substring(strStart, strEnd);
    const rest = argsStr.substring(strEnd + 1);

    const partsMatch = rest.match(/^\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\s*\.split\(\s*'([^']*)'\s*\)/);
    if (!partsMatch) {
      if (isDebug()) console.log("[Unpack] Could not parse base/count/dict");
      return null;
    }

    const a = parseInt(partsMatch[1]);
    const c = parseInt(partsMatch[2]);
    const k = partsMatch[3].split(partsMatch[4]);

    let result = p;
    for (let i = c - 1; i >= 0; i--) {
      if (k[i]) {
        const token = i.toString(a);
        result = result.replace(new RegExp(`\\b${token}\\b`, "g"), k[i]);
      }
    }
    return result;
  } catch (e: any) {
    if (isDebug()) console.error("[Unpack] Error:", e.message);
    return null;
  }
}
