import { fetchPage } from "./http.js";
import axios from "axios";
import https from "https";

const isDebug = () => process.env.DEBUG === "1";

export interface ExtractedStream {
  name: string;
  url?: string;
  externalUrl?: string;
  quality?: string;
  referer?: string;
}

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function extractVoeUniversal(url: string, referer?: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const hostname = new URL(url).hostname;
    const label = hostname.includes("vinovo") ? "Vinovo" : "VOE";

    const response = await axios.get(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
        ...(referer ? { Referer: referer } : {}),
      },
      httpsAgent: insecureAgent,
      maxRedirects: 10,
      timeout: 15000,
      validateStatus: () => true,
    });

    const html = typeof response.data === "string" ? response.data : String(response.data);

    const sourcesMatch = html.match(/const\s+sources\s*=\s*(\{[^}]+\})/);
    if (sourcesMatch) {
      const hlsMatch = sourcesMatch[1].match(/"hls"\s*:\s*"([^"]+)"/);
      if (hlsMatch) {
        streams.push({ name: label, url: hlsMatch[1], referer: url });
        if (isDebug()) console.log(`[${label}] Found HLS from sources: ${hlsMatch[1].substring(0, 60)}`);
        return streams;
      }
    }

    const b64HlsMatch = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/);
    if (b64HlsMatch) {
      try {
        const decoded = Buffer.from(b64HlsMatch[1], "base64").toString("utf-8");
        if (decoded.includes(".m3u8") || decoded.includes("http")) {
          streams.push({ name: label, url: decoded, referer: url });
          if (isDebug()) console.log(`[${label}] Found base64 HLS: ${decoded.substring(0, 60)}`);
          return streams;
        }
      } catch {}
    }

    const windowPlayerMatch = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
    if (windowPlayerMatch) {
      const redirectUrl = windowPlayerMatch[1];
      if (redirectUrl.includes(".m3u8") || redirectUrl.includes(".mp4")) {
        streams.push({ name: label, url: redirectUrl, referer: url });
        return streams;
      }
    }

    const promptMatch = html.match(/prompt\s*\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']\s*\)/);
    if (promptMatch) {
      const promptVal = promptMatch[1];
      if (promptVal.includes("http")) {
        streams.push({ name: label, url: promptVal, referer: url });
        return streams;
      }
    }

    const m3u8Urls = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g);
    if (m3u8Urls) {
      for (const m3u of m3u8Urls) {
        if (!m3u.includes("ddos-guard") && !m3u.includes("challenge")) {
          streams.push({ name: label, url: m3u, referer: url });
          return streams;
        }
      }
    }

    const mp4Urls = html.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/g);
    if (mp4Urls) {
      for (const mp4 of mp4Urls) {
        if (!mp4.includes("ddos-guard") && !mp4.includes("challenge")) {
          streams.push({ name: label, url: mp4, referer: url });
          return streams;
        }
      }
    }

    const allB64Matches = Array.from(html.matchAll(/["']([A-Za-z0-9+/]{40,}={0,2})["']/g));
    for (const m of allB64Matches) {
      try {
        const decoded = Buffer.from(m[1], "base64").toString("utf-8");
        if ((decoded.startsWith("http") || decoded.startsWith("//")) && (decoded.includes(".m3u8") || decoded.includes(".mp4"))) {
          const finalUrl = decoded.startsWith("//") ? `https:${decoded}` : decoded;
          streams.push({ name: label, url: finalUrl, referer: url });
          if (isDebug()) console.log(`[${label}] Found base64-encoded URL: ${finalUrl.substring(0, 60)}`);
          return streams;
        }
      } catch {}
    }

    const voeApiMatch = html.match(/['"](?:https?:)?\/\/[^'"]*(?:voe|vinovo)[^'"]*\/(?:engine|api)\/[^'"]+['"]/);
    if (voeApiMatch) {
      const apiUrl = voeApiMatch[0].replace(/^['"]/, "").replace(/['"]$/, "");
      const fullApiUrl = apiUrl.startsWith("//") ? `https:${apiUrl}` : apiUrl;
      try {
        const apiResp = await axios.get(fullApiUrl, {
          headers: { "User-Agent": UA, Referer: url },
          httpsAgent: insecureAgent,
          timeout: 10000,
          validateStatus: () => true,
        });
        const apiHtml = String(apiResp.data);
        const apiM3u8 = apiHtml.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
        if (apiM3u8) {
          streams.push({ name: label, url: apiM3u8[0], referer: url });
          return streams;
        }
      } catch {}
    }

    if (isDebug()) console.log(`[${label}] No video URL found in page (${html.length} chars, DDoS-Guard: ${html.includes("DDoS-Guard")})`);
  } catch (err: any) {
    if (isDebug()) console.error(`[VOE] Extraction error: ${err.message}`);
  }
  return streams;
}

export async function extractDoodUniversal(url: string, referer?: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const mainUrl = new URL(url).origin;
    const pathParts = new URL(url).pathname.split("/");
    const videoId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
    const embedUrl = url.includes("/e/") ? url : `${mainUrl}/e/${videoId}`;

    const response = await axios.get(embedUrl, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        ...(referer ? { Referer: referer } : {}),
      },
      httpsAgent: insecureAgent,
      maxRedirects: 10,
      timeout: 15000,
      validateStatus: () => true,
    });

    const html = typeof response.data === "string" ? response.data : String(response.data);

    const passMd5Match = html.match(/\/pass_md5\/[^'"*/\s]*/);
    if (passMd5Match) {
      const passMd5Path = passMd5Match[0];
      const token = passMd5Path.split("/").pop() || "";

      const md5Url = `${mainUrl}${passMd5Path}`;
      const md5Response = await axios.get(md5Url, {
        headers: {
          "User-Agent": UA,
          Referer: embedUrl,
          "X-Requested-With": "XMLHttpRequest",
        },
        httpsAgent: insecureAgent,
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const videoData = String(md5Response.data).trim();
      if (videoData.startsWith("http")) {
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
        if (isDebug()) console.log(`[DoodStream] Extracted: ${finalUrl.substring(0, 60)}`);
        return streams;
      }
    }

    if (html.includes("turnstile") || html.includes("captcha")) {
      if (isDebug()) console.log("[DoodStream] Turnstile CAPTCHA detected - trying alternate approach");

      const altDomains = ["d0000d.com", "d0o0d.com", "dood.wf", "dood.pm", "dood.yt", "dood.so", "dood.to", "dood.la", "dood.ws", "dood.sh"];
      for (const domain of altDomains) {
        try {
          const altUrl = `https://${domain}/e/${videoId}`;
          const altResp = await axios.get(altUrl, {
            headers: { "User-Agent": UA, Referer: referer || url },
            httpsAgent: insecureAgent,
            timeout: 8000,
            maxRedirects: 10,
            validateStatus: () => true,
          });
          const altHtml = String(altResp.data);
          const altPass = altHtml.match(/\/pass_md5\/[^'"*/\s]*/);
          if (altPass && !altHtml.includes("turnstile")) {
            const altToken = altPass[0].split("/").pop() || "";
            const altMd5Url = `https://${domain}${altPass[0]}`;
            const altMd5Resp = await axios.get(altMd5Url, {
              headers: { "User-Agent": UA, Referer: altUrl, "X-Requested-With": "XMLHttpRequest" },
              httpsAgent: insecureAgent,
              timeout: 8000,
              validateStatus: () => true,
            });
            const altVideoData = String(altMd5Resp.data).trim();
            if (altVideoData.startsWith("http")) {
              let rs = "";
              for (let i = 0; i < 10; i++) rs += "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36));
              streams.push({
                name: "DoodStream",
                url: `${altVideoData}${rs}?token=${altToken}&expiry=${Date.now()}`,
                referer: `https://${domain}`,
              });
              return streams;
            }
          }
        } catch {}
      }
    }

    if (isDebug()) console.log(`[DoodStream] Could not extract (page has captcha: ${html.includes("turnstile")})`);
  } catch (err: any) {
    if (isDebug()) console.error("[DoodStream] Extraction error:", err.message);
  }
  return streams;
}

export async function extractMixDrop(url: string, referer?: string): Promise<ExtractedStream[]> {
  const streams: ExtractedStream[] = [];
  try {
    const html = await fetchPage(url, { referer: referer || url });

    const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[dr]\)[\s\S]*?\.split\(['"]\|['"]\)\)\)/);
    if (evalMatch) {
      const unpacked = unpackMixdrop(evalMatch[0]);
      if (unpacked) {
        const urlMatch = unpacked.match(/(?:MDCore\.wurl|wurl)\s*=\s*"([^"]+)"/);
        if (urlMatch) {
          const videoUrl = urlMatch[1].startsWith("//") ? `https:${urlMatch[1]}` : urlMatch[1];
          streams.push({ name: "MixDrop", url: videoUrl, referer: url });
          return streams;
        }
        const srcMatch = unpacked.match(/https?:\/\/[^\s"']+\.(?:mp4|m3u8)[^\s"']*/);
        if (srcMatch) {
          streams.push({ name: "MixDrop", url: srcMatch[0], referer: url });
          return streams;
        }
      }
    }

    const srcMatch = html.match(/source\s+src=["'](https?:\/\/[^"']+)["']/);
    if (srcMatch) {
      streams.push({ name: "MixDrop", url: srcMatch[1], referer: url });
    }
  } catch (err: any) {
    if (isDebug()) console.error("[MixDrop] Extraction error:", err.message);
  }
  return streams;
}

function unpackMixdrop(packed: string): string | null {
  try {
    const bodyEnd = packed.indexOf("return p}(");
    if (bodyEnd === -1) return null;

    const argsStr = packed.substring(bodyEnd + "return p}(".length);
    let inStr = false;
    let strStart = -1;
    let strEnd = -1;
    for (let i = 0; i < argsStr.length; i++) {
      if (argsStr[i] === "'" && (i === 0 || argsStr[i - 1] !== "\\")) {
        if (!inStr) { inStr = true; strStart = i + 1; }
        else { strEnd = i; break; }
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

export function isProtectedHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname.includes("voe.sx") ||
           hostname.includes("vinovo") ||
           hostname.includes("doodstream") ||
           hostname.includes("dsvplay") ||
           hostname.includes("myvidplay") ||
           hostname.includes("d0o0d") ||
           hostname.includes("dood.");
  } catch {
    return false;
  }
}
