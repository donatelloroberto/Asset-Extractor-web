import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { ALL_PROVIDERS, PROVIDERS, GXTAPES_PROVIDER, resolveProviderById, resolveProviderByCatalog, resolveMeta, resolveStreams, resolveCatalog } from "./provider-registry";
import { getCacheStats, clearAllCaches } from "./stremio/cache";
import { log } from "./logger";
import { rankStreams } from "./stremio/stream-ranker";

const startTime = Date.now();

function parseStremioExtra(extra: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of extra.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx !== -1) {
      result[decodeURIComponent(part.slice(0, eqIdx))] = decodeURIComponent(part.slice(eqIdx + 1));
    }
  }
  return result;
}

function getBaseUrl(req: any): string {
  // On Vercel/Render/any reverse proxy, req.protocol is the internal protocol (http).
  // x-forwarded-proto contains the real external protocol (https).
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ||
    req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
    req.get("host");
  return `${proto}://${host}`;
}

async function handleCatalog(catalogId: string, skip: number, search?: string, res?: any) {
  try {
    const provider = resolveProviderByCatalog(catalogId);
    const searchId = `${provider.prefix}-search`;
    let metas;
    if (catalogId === searchId && search) {
      metas = await provider.searchContent(search, skip);
    } else {
      metas = await provider.getCatalog(catalogId, skip);
    }
    return metas;
  } catch (err: any) {
    log(`Catalog error [${catalogId}]: ${err.message}`, "stremio");
    return [];
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    next();
  });

  // ─── Manifest endpoints (one per provider) ─────────────────────────────────
  app.get("/manifest.json", (_req, res) => res.json(GXTAPES_PROVIDER.buildManifest()));
  for (const p of PROVIDERS) {
    const prefix = p.prefix;
    app.get(`/${prefix}/manifest.json`, (_req, res) => res.json(p.buildManifest()));

    // ─── Per-provider Stremio routes ─────────────────────────────────────────
    app.get(`/${prefix}/catalog/:type/:id.json`, async (req, res) => {
      const { id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;
      log(`[${prefix}] catalog: ${id} skip=${skip}`, "stremio");
      res.json({ metas: await handleCatalog(id, skip, search) });
    });

    app.get(`/${prefix}/catalog/:type/:id/:extra.json`, async (req, res) => {
      const { id, extra } = req.params;
      const ep = parseStremioExtra(extra);
      const skip = parseInt(ep.skip || "0", 10);
      log(`[${prefix}] catalog+extra: ${id} skip=${skip}`, "stremio");
      res.json({ metas: await handleCatalog(id, skip, ep.search) });
    });

    app.get(`/${prefix}/meta/:type/:id.json`, async (req, res) => {
      const { id } = req.params;
      log(`[${prefix}] meta: ${id}`, "stremio");
      try {
        const meta = await p.getMeta(id);
        res.json({ meta: meta ?? null });
      } catch (err: any) {
        log(`[${prefix}] meta error: ${err.message}`, "stremio");
        res.json({ meta: null });
      }
    });

    app.get(`/${prefix}/stream/:type/:id.json`, async (req, res) => {
      const { id } = req.params;
      const baseUrl = getBaseUrl(req);
      log(`[${prefix}] stream: ${id}`, "stremio");
      try {
        const streams = await p.getStreams(id, baseUrl);
        res.json({ streams: rankStreams(streams) });
      } catch (err: any) {
        log(`[${prefix}] stream error: ${err.message}`, "stremio");
        res.json({ streams: [] });
      }
    });
  }

  // ─── Unified Stremio routes (root add-on) ──────────────────────────────────
  app.get("/catalog/:type/:id.json", async (req, res) => {
    const { id } = req.params;
    const skip = parseInt((req.query as any).skip || "0", 10);
    const search = (req.query as any).search as string | undefined;
    log(`Catalog: ${id} skip=${skip}`, "stremio");
    res.json({ metas: await handleCatalog(id, skip, search) });
  });

  app.get("/catalog/:type/:id/:extra.json", async (req, res) => {
    const { id, extra } = req.params;
    const ep = parseStremioExtra(extra);
    const skip = parseInt(ep.skip || "0", 10);
    log(`Catalog+extra: ${id} skip=${skip}`, "stremio");
    res.json({ metas: await handleCatalog(id, skip, ep.search) });
  });

  app.get("/meta/:type/:id.json", async (req, res) => {
    const { id } = req.params;
    log(`Meta: ${id}`, "stremio");
    try {
      const meta = await resolveMeta(id);
      res.json({ meta: meta ?? null });
    } catch (err: any) {
      log(`Meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/stream/:type/:id.json", async (req, res) => {
    const { id } = req.params;
    const baseUrl = getBaseUrl(req);
    log(`Stream: ${id}`, "stremio");
    try {
      const streams = await resolveStreams(id, baseUrl);
      res.json({ streams: rankStreams(streams) });
    } catch (err: any) {
      log(`Stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  // ─── Web API ────────────────────────────────────────────────────────────────
  app.get("/api/status", (_req, res) => {
    const cacheStats = getCacheStats();
    const totalCatalogs = ALL_PROVIDERS.reduce(
      (sum, p) => sum + p.buildManifest().catalogs.length, 0
    );
    res.json({
      name: "Stremio Add-ons",
      version: "1.0.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      catalogs: totalCatalogs,
      cacheStats,
      addons: ALL_PROVIDERS.map(p => {
        const m = p.buildManifest();
        return { name: m.name, version: m.version, catalogs: m.catalogs.length, manifestPath: p.manifestPath };
      }),
      endpoints: ALL_PROVIDERS.map(p => ({ path: p.manifestPath, description: `${p.buildManifest().name} manifest` })).concat([
        { path: "/catalog/movie/{catalogId}.json", description: "Browse catalogs" },
        { path: "/meta/movie/{id}.json", description: "Content metadata" },
        { path: "/stream/movie/{id}.json", description: "Stream links" },
        { path: "/api/search?q={query}", description: "Cross-provider search" },
        { path: "/api/stream-check", description: "Stream health check" },
      ]),
    });
  });

  app.get("/api/catalogs", (_req, res) => {
    const result: Record<string, any> = {};
    for (const p of ALL_PROVIDERS) {
      result[p.prefix] = p.buildManifest().catalogs;
    }
    res.json(result);
  });

  app.get("/api/catalog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;
      const items = await resolveCatalog(id, skip, search);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/meta/:id", async (req, res) => {
    try {
      const meta = await resolveMeta(req.params.id);
      res.json(meta);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Cross-provider search ──────────────────────────────────────────────────
  app.get("/api/search", async (req, res) => {
    try {
      const q = ((req.query as any).q as string || "").trim();
      if (!q || q.length < 2) return res.json([]);

      const limit = Math.min(parseInt((req.query as any).limit || "20", 10), 60);
      const providers = ((req.query as any).providers as string || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const targetProviders = providers.length > 0
        ? ALL_PROVIDERS.filter(p => providers.includes(p.prefix))
        : ALL_PROVIDERS;

      const results = await Promise.allSettled(
        targetProviders.map(p => p.searchContent(q, 0).then(items => items.map(i => ({ ...i, provider: p.prefix }))))
      );

      const combined = results
        .filter(r => r.status === "fulfilled")
        .flatMap(r => (r as PromiseFulfilledResult<any[]>).value)
        .slice(0, limit);

      res.json(combined);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Stream health check ────────────────────────────────────────────────────
  app.get("/api/stream-check", async (req, res) => {
    const url = (req.query as any).url as string;
    const referer = (req.query as any).referer as string || "";

    if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

    try {
      const response = await axios.head(url, {
        timeout: 8000,
        maxRedirects: 5,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...(referer ? { Referer: referer } : {}),
        },
        validateStatus: () => true,
      });

      const ok = response.status >= 200 && response.status < 400;
      const contentType = response.headers["content-type"] || "";
      const contentLength = parseInt(response.headers["content-length"] || "0", 10);

      res.json({
        ok,
        status: response.status,
        contentType,
        contentLength,
        isHls: contentType.includes("mpegurl") || url.includes(".m3u8"),
        isMp4: contentType.includes("mp4") || url.includes(".mp4"),
      });
    } catch (err: any) {
      res.json({ ok: false, error: err.message });
    }
  });

  // ─── Image proxy ────────────────────────────────────────────────────────────
  app.get("/api/imgproxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) return res.status(400).send("Missing url");

      const response = await axios.get(imageUrl, {
        responseType: "stream",
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/*,*/*",
          "Referer": new URL(imageUrl).origin + "/",
        },
      });

      const contentType = response.headers["content-type"] || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      response.data.pipe(res);
    } catch {
      res.status(404).send("Image not found");
    }
  });

  // ─── Proxy endpoints ────────────────────────────────────────────────────────
  app.get("/proxy/stream", async (req, res) => {
    try {
      const streamUrl = req.query.url as string;
      const referer = (req.query.referer as string) || "";

      if (!streamUrl) return res.status(400).json({ error: "Missing url parameter" });

      log(`Proxy stream: ${streamUrl}`, "stremio");

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
      };
      if (referer) headers["Referer"] = referer;
      const rangeHeader = req.headers.range;
      if (rangeHeader) headers["Range"] = rangeHeader;

      const response = await axios.get(streamUrl, {
        headers,
        responseType: "stream",
        timeout: 30000,
        maxRedirects: 5,
      });

      res.setHeader("Content-Type", response.headers["content-type"] || "video/mp4");
      if (response.headers["content-length"]) res.setHeader("Content-Length", response.headers["content-length"]);
      if (response.headers["content-range"]) res.setHeader("Content-Range", response.headers["content-range"]);
      if (response.headers["accept-ranges"]) res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);
      res.status(response.status);
      response.data.pipe(res);
      response.data.on("error", (err: any) => {
        log(`Proxy stream pipe error: ${err.message}`, "stremio");
        if (!res.headersSent) res.status(502).json({ error: "Stream error" });
      });
    } catch (err: any) {
      log(`Proxy stream error: ${err.message}`, "stremio");
      if (!res.headersSent) res.status(502).json({ error: "Failed to proxy stream" });
    }
  });

  app.get("/api/proxy/m3u8", async (req, res) => {
    const urlParam = req.query.url as string;
    const refParam = req.query.ref as string;
    if (!urlParam) return res.status(400).send("Missing url");

    let m3u8Url: string;
    let referer: string;
    try {
      m3u8Url = Buffer.from(urlParam, "base64url").toString("utf8");
      referer = refParam ? Buffer.from(refParam, "base64url").toString("utf8") : m3u8Url;
    } catch {
      return res.status(400).send("Invalid url encoding");
    }

    try {
      const response = await axios.get(m3u8Url, {
        responseType: "text",
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": referer,
          "Origin": new URL(referer).origin,
          "Accept": "*/*",
        },
        maxRedirects: 5,
      });

      const m3u8Text: string = response.data;
      const baseM3u8Url = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);
      const host = getBaseUrl(req);

      const rewritten = m3u8Text.split("\n").map((line: string) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/gi, (_match: string, uri: string) => {
            const absUri = uri.startsWith("http") ? uri : uri.startsWith("//") ? `https:${uri}` : `${baseM3u8Url}${uri}`;
            const params = new URLSearchParams({ url: absUri, referer: m3u8Url });
            return `URI="${host}/proxy/stream?${params.toString()}"`;
          });
        }
        const absUrl = trimmed.startsWith("http") ? trimmed : trimmed.startsWith("//") ? `https:${trimmed}` : `${baseM3u8Url}${trimmed}`;
        if (absUrl.includes(".m3u8")) {
          const encoded = Buffer.from(absUrl).toString("base64url");
          const refEncoded = Buffer.from(m3u8Url).toString("base64url");
          return `${host}/api/proxy/m3u8?url=${encoded}&ref=${refEncoded}`;
        }
        const params = new URLSearchParams({ url: absUrl, referer: m3u8Url });
        return `${host}/proxy/stream?${params.toString()}`;
      }).join("\n");

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache");
      res.send(rewritten);
    } catch (err: any) {
      log(`M3U8 proxy error: ${err.message}`, "stremio");
      res.status(502).send("Failed to fetch m3u8");
    }
  });

  app.get("/api/embed", async (req, res) => {
    const raw = req.query.url as string;
    if (!raw) return res.status(400).send("Missing url");

    let embedUrl: string;
    try {
      const decoded = Buffer.from(raw, "base64url").toString("utf8");
      embedUrl = decoded.startsWith("http") ? decoded : raw;
    } catch {
      embedUrl = raw;
    }

    const AD_BLOCK_DOMAINS = [
      "googlesyndication", "doubleclick", "adnxs", "adnxs.com",
      "popads", "popcash", "trafficjunky", "exoclick", "juicyads",
      "ero-advertising", "plugrush", "hilltopads", "propellerads",
      "adcash", "bidvertiser", "clickadu", "adsterra", "monetag",
      "mgid", "revcontent", "taboola", "outbrain", "pmulink",
      "rubiconproject", "pubmatic", "appnexus", "openx",
    ];

    const AD_BLOCK_CSS = `<style id="sf-adblock">
  ins.adsbygoogle,.adsbygoogle,[id^="google_ads"],[id^="aswift"],
  [class*="ad-banner"],[class*="ad-container"],[class*="adBox"],
  [id*="ad-banner"],[id*="ad-container"],[id*="adBox"],
  [class*="popup"],[class*="pop-up"],[class*="popunder"],
  [id*="popup"],[id*="pop-up"],[id*="popunder"],
  [class*="overlay"]:not(video *):not(.jw-overlays):not(.plyr__control),
  iframe[src*="googlesyndication"],iframe[src*="doubleclick"],
  iframe[src*="exoclick"],iframe[src*="juicyads"],
  a[href*="trafficjunky"],a[href*="exoclick"],
  .OUTBRAIN,.taboola-widget
  { display:none!important; visibility:hidden!important; pointer-events:none!important; }
</style>`;

    const AD_BLOCK_JS = `<script id="sf-adblock-js">
(function(){
  /* Anti-frame-busting: make top === self so frame-detection code is fooled */
  try {
    Object.defineProperty(window,'top',{get:function(){return window;},configurable:true});
    Object.defineProperty(window,'parent',{get:function(){return window;},configurable:true});
    Object.defineProperty(window,'frameElement',{get:function(){return null;},configurable:true});
  } catch(e){}

  window.open=function(){ return {focus:function(){},blur:function(){},closed:false,location:{href:''}}; };
  window.onbeforeunload=null;
  Object.defineProperty(window,'onbeforeunload',{set:function(){}});
  var _loc=window.location;
  try {
    Object.defineProperty(window,'location',{
      get:function(){ return _loc; },
      set:function(v){
        var s=String(v);
        var adDomains=${JSON.stringify(AD_BLOCK_DOMAINS)};
        var isAd=adDomains.some(function(d){ return s.indexOf(d)!==-1; });
        if(!isAd) _loc.href=s;
      }
    });
  } catch(e){}
  var adSelectors=['ins.adsbygoogle','.adsbygoogle','[id^="google_ads"],[id^="aswift"]',
    'iframe[src*="googlesyndication"]','iframe[src*="doubleclick"]',
    'iframe[src*="exoclick"]','iframe[src*="juicyads"]',
    '[class*="popunder"],[class*="pop-up-"]'];
  function removeAds(){ adSelectors.forEach(function(sel){ try{ document.querySelectorAll(sel).forEach(function(el){ el.remove(); }); }catch(e){} }); }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',removeAds); } else { removeAds(); }
  setInterval(removeAds,1500);
})();
</script>`;

    try {
      log(`Embed proxy: ${embedUrl}`, "stremio");

      const response = await axios.get(embedUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": new URL(embedUrl).origin + "/",
          "Sec-Fetch-Dest": "iframe",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "cross-site",
          "Upgrade-Insecure-Requests": "1",
        },
        maxRedirects: 5,
      });

      const contentType = response.headers["content-type"] || "text/html";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store");
      res.removeHeader("X-Frame-Options");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.removeHeader("Content-Security-Policy");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const body = Buffer.from(response.data as ArrayBuffer).toString("utf8");

      const isCfChallenge =
        body.includes("__cf_chl_opt") || body.includes("cf-browser-verification") ||
        body.includes("cf_chl_prog") || body.includes("challenge-platform") ||
        (response.headers["cf-mitigated"] === "challenge") ||
        (body.includes("Verifying") && body.includes("Cloudflare")) ||
        (response.status === 403 && !!response.headers["cf-ray"]);

      if (isCfChallenge) {
        log(`Cloudflare challenge, redirecting: ${embedUrl}`, "stremio");
        return res.redirect(302, embedUrl);
      }

      const embedOrigin = new URL(embedUrl).origin;
      let cleaned = body
        .replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, "")
        .replace(/<meta[^>]*content-security-policy[^>]*>/gi, "");

      for (const domain of AD_BLOCK_DOMAINS) {
        const re1 = new RegExp(`<script[^>]+src=["'][^"']*${domain.replace(".", "\\.")}[^"']*["'][^>]*>[\\s\\S]*?<\\/script>`, "gi");
        const re2 = new RegExp(`<script[^>]+src=["'][^"']*${domain.replace(".", "\\.")}[^"']*["'][^>]*\\/?>`, "gi");
        cleaned = cleaned.replace(re1, "<!-- sf-adblocked -->").replace(re2, "<!-- sf-adblocked />");
      }

      const injection = `<base href="${embedOrigin}/">${AD_BLOCK_CSS}${AD_BLOCK_JS}`;
      let final: string;
      if (cleaned.includes("<base ")) {
        final = cleaned.replace(/<head([^>]*)>/i, `<head$1>${AD_BLOCK_CSS}${AD_BLOCK_JS}`);
      } else {
        final = cleaned.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
      }
      if (!final.includes("<head")) final = AD_BLOCK_CSS + AD_BLOCK_JS + final;

      res.send(final);
    } catch (err: any) {
      log(`Embed proxy failed, redirecting: ${embedUrl}`, "stremio");
      res.redirect(302, embedUrl);
    }
  });

  app.post("/api/cache/clear", (_req, res) => {
    clearAllCaches();
    res.json({ success: true });
  });

  return httpServer;
}
