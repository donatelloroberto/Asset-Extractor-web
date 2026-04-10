import { fetchPage } from "../stremio/http";
import * as cheerio from "cheerio";

const isDebug = () => process.env.DEBUG === "1";

export interface ExtractedStream {
  name: string;
  url?: string;
  externalUrl?: string;
  quality?: string;
  referer?: string;
}

function getHostLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("voe") || hostname.includes("jilliandescribecompany") || hostname.includes("markstylecompany") || hostname.includes("primaryclassaliede")) return "VOE";
    if (hostname.includes("dood") || hostname.includes("ds2video") || hostname.includes("d0o0d") || hostname.includes("d-s.io") || hostname.includes("vide0.net") || hostname.includes("myvidplay") || hostname.includes("dsvplay")) return "DoodStream";
    if (hostname.includes("streamtape") || hostname.includes("tapepops")) return "StreamTape";
    if (hostname.includes("filemoon")) return "FileMoon";
    if (hostname.includes("mixdrop")) return "MixDrop";
    return hostname;
  } catch {
    return "Unknown";
  }
}

export async function extractGaycock4uStreams(pageUrl: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];

  try {
    const html = await fetchPage(pageUrl, { referer: "https://gaycock4u.com/" });
    const $ = cheerio.load(html);

    const iframeSrcs: string[] = [];
    $("iframe[src], iframe[data-src], iframe[data-lazy-src]").each((_, el) => {
      const src = $(el).attr("data-lazy-src") || $(el).attr("data-src") || $(el).attr("src");
      if (src && src !== "about:blank") {
        const normalized = src.startsWith("//") ? `https:${src}` : src;
        if (normalized.startsWith("http")) {
          iframeSrcs.push(normalized);
        }
      }
    });
    if (iframeSrcs.length === 0) {
      $("noscript").each((_, el) => {
        const nhtml = $(el).html();
        if (nhtml) {
          const n$ = cheerio.load(nhtml);
          n$("iframe[src]").each((_, iel) => {
            const src = n$(iel).attr("src");
            if (src && src !== "about:blank" && src.startsWith("http")) {
              iframeSrcs.push(src);
            }
          });
        }
      });
    }
    if (iframeSrcs.length === 0) {
      const metaEmbed = $('meta[itemprop="embedURL"]').attr("content");
      if (metaEmbed) {
        iframeSrcs.push(metaEmbed);
      }
    }

    if (iframeSrcs.length === 0) {
      if (isDebug()) console.log(`[Gaycock4U] No iframes found on ${pageUrl}`);
      return streams;
    }

    for (const iframeSrc of iframeSrcs) {
      if (isDebug()) console.log(`[Gaycock4U] Found iframe: ${iframeSrc}`);
      try {
        const resolved = await resolveEmbed(iframeSrc, pageUrl);
        if (resolved.length > 0) {
          streams.push(...resolved);
        } else {
          streams.push({ name: `${getHostLabel(iframeSrc)} (Browser)`, externalUrl: iframeSrc });
        }
      } catch (err: any) {
        if (isDebug()) console.error(`[Gaycock4U] Embed ${iframeSrc} failed: ${err.message}`);
        streams.push({ name: `${getHostLabel(iframeSrc)} (Browser)`, externalUrl: iframeSrc });
      }
    }
  } catch (err: any) {
    if (isDebug()) console.error(`[Gaycock4U] Page extraction error: ${err.message}`);
  }

  const unique = new Map<string, ExtractedStream>();
  for (const s of streams) {
    const key = s.url || s.externalUrl || s.name;
    if (!unique.has(key)) {
      unique.set(key, s);
    }
  }

  return Array.from(unique.values());
}

async function resolveEmbed(embedUrl: string, referer: string): Promise<ExtractedStream[]> {
  const url = embedUrl.startsWith("//") ? `https:${embedUrl}` : embedUrl;
  const hostname = new URL(url).hostname;

  if (hostname.includes("voe") || hostname.includes("jilliandescribecompany") || hostname.includes("markstylecompany") || hostname.includes("primaryclassaliede")) {
    return extractVoe(url, referer);
  }
  if (hostname.includes("doodstream") || hostname.includes("ds2video") || hostname.includes("d0o0d") || hostname.includes("d-s.io") || hostname.includes("vide0.net") || hostname.includes("dood.") || hostname.includes("myvidplay") || hostname.includes("dsvplay")) {
    return extractDood(url, referer);
  }
  if (hostname.includes("streamtape") || hostname.includes("tapepops")) {
    return extractStreamtape(url);
  }
  if (hostname.includes("filemoon")) {
    return extractFilemoon(url);
  }

  return extractGeneric(url);
}

async function extractVoe(url: string, referer?: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url, { referer: referer || url });

    const sourcesMatch = html.match(/const\s+sources\s*=\s*(\{[^}]+\})/);
    if (sourcesMatch) {
      const hlsMatch = sourcesMatch[1].match(/"hls"\s*:\s*"([^"]+)"/);
      if (hlsMatch) {
        streams.push({
          name: "VOE",
          url: hlsMatch[1],
          referer: url,
        });
      }
    }

    if (streams.length === 0) {
      const hlsFallback = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
      if (hlsFallback) {
        streams.push({ name: "VOE", url: hlsFallback[0], referer: url });
      }
    }

    if (streams.length === 0) {
      const mp4Match = html.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/);
      if (mp4Match) {
        streams.push({ name: "VOE", url: mp4Match[0], referer: url });
      }
    }
  } catch (err: any) {
    if (isDebug()) console.error(`[Voe] Extraction error: ${err.message}`);
  }
  return streams;
}

async function extractDood(url: string, referer?: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const mainUrl = new URL(url).origin;
    const pathParts = new URL(url).pathname.split("/");
    const videoId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

    const embedUrl = url.includes("/e/") ? url : `${mainUrl}/e/${videoId}`;

    const html = await fetchPage(embedUrl, { referer: referer || url });

    const passMd5Match = html.match(/\/pass_md5\/[^'"*/]*/);
    if (!passMd5Match) {
      if (isDebug()) console.error("[Dood] pass_md5 pattern not found");
      return streams;
    }

    const passMd5Path = passMd5Match[0];
    const token = passMd5Path.split("/").pop() || "";

    const md5Url = `${mainUrl}${passMd5Path}`;
    const videoData = await fetchPage(md5Url, { referer: embedUrl });

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomStr = "";
    for (let i = 0; i < 10; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const finalUrl = `${videoData}${randomStr}?token=${token}&expiry=${Date.now()}`;

    const qualityMatch = html.match(/<title>.*?(\d{3,4})[pP].*?<\/title>/);
    const quality = qualityMatch ? `${qualityMatch[1]}p` : undefined;

    streams.push({
      name: `DoodStream${quality ? ` ${quality}` : ""}`,
      url: finalUrl,
      quality,
      referer: mainUrl,
    });
  } catch (err: any) {
    if (isDebug()) console.error("[Dood] Extraction error:", err.message);
  }
  return streams;
}

async function extractStreamtape(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url);

    const tokenMatch = html.match(/document\.getElementById\('(?:robotlink|ideoooolink)'\)\.innerHTML\s*=\s*["'](\/\/[^"']+)["']\s*\+\s*\('([^']+)'\)/);
    if (tokenMatch) {
      const baseUrl = `https:${tokenMatch[1]}`;
      const tokenPart = tokenMatch[2];
      const tokenEndMatch = html.match(new RegExp(`'${tokenPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\)\\s*\\+\\s*'([^']*)'`));
      const fullUrl = baseUrl + tokenPart + (tokenEndMatch ? tokenEndMatch[1] : "");
      streams.push({ name: "StreamTape", url: fullUrl, referer: url });
    }

    if (streams.length === 0) {
      const altMatch = html.match(/document\.getElementById\('(?:robotlink|ideoooolink)'\)\.innerHTML\s*=\s*[^+]+\+\s*['"]([^'"]+)['"]/);
      if (altMatch) {
        const partialUrl = altMatch[1];
        if (partialUrl.startsWith("//")) {
          streams.push({ name: "StreamTape", url: `https:${partialUrl}`, referer: url });
        }
      }
    }
  } catch (err: any) {
    if (isDebug()) console.error("[StreamTape] Extraction error:", err.message);
  }
  return streams;
}

async function extractFilemoon(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url);

    const evalBlock = findEvalBlock(html);
    if (evalBlock) {
      const unpacked = unpack(evalBlock);
      if (unpacked) {
        const hlsUrls = unpacked.match(/https?:\/\/[^\s"'\\}]+\.m3u8[^\s"'\\}]*/g);
        if (hlsUrls) {
          for (const hlsUrl of hlsUrls) {
            streams.push({ name: "FileMoon", url: hlsUrl, referer: url });
          }
        }
        if (streams.length === 0) {
          const fileMatch = unpacked.match(/file\s*:\s*["']([^"']+)["']/);
          if (fileMatch) {
            streams.push({ name: "FileMoon", url: fileMatch[1], referer: url });
          }
        }
      }
    }

    if (streams.length === 0) {
      const srcMatch = html.match(/file\s*:\s*["'](https?:\/\/[^"']+)["']/);
      if (srcMatch) {
        streams.push({ name: "FileMoon", url: srcMatch[1], referer: url });
      }
    }
  } catch (err: any) {
    if (isDebug()) console.error("[FileMoon] Extraction error:", err.message);
  }
  return streams;
}

async function extractGeneric(url: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url);
    const hostname = new URL(url).hostname;

    const fileMatch = html.match(/file\s*:\s*["'](https?:\/\/[^"']+)["']/);
    if (fileMatch) {
      streams.push({ name: hostname, url: fileMatch[1], referer: url });
      return streams;
    }

    const srcMatch = html.match(/src:\s*["'](https?:\/\/[^"']+)["']/);
    if (srcMatch) {
      streams.push({ name: hostname, url: srcMatch[1], referer: url });
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
    if (bodyEnd === -1) return null;

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

    if (strEnd <= 0) return null;

    const p = argsStr.substring(strStart, strEnd);
    const rest = argsStr.substring(strEnd + 1);

    const partsMatch = rest.match(/^\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([^']*)'\s*\.split\(\s*'([^']*)'\s*\)/);
    if (!partsMatch) return null;

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
  } catch {
    return null;
  }
}
