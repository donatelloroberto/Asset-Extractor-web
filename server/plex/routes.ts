import type { Express, Request, Response } from "express";
import archiver from "archiver";
import axios from "axios";
import { log } from "../logger.js";

import { CATALOG_MAP } from "../stremio/manifest.js";
import { getCatalog, getMeta, getStreams } from "../stremio/provider.js";
import { NURGAY_CATALOG_MAP } from "../nurgay/manifest.js";
import { getNurgayCatalog, getNurgayMeta, getNurgayStreams } from "../nurgay/provider.js";
import { FXGGXT_CATALOG_MAP } from "../fxggxt/manifest.js";
import { getFxggxtCatalog, getFxggxtMeta, getFxggxtStreams } from "../fxggxt/provider.js";
import { JUSTTHEGAYS_CATALOG_MAP } from "../justthegays/manifest.js";
import { getJustthegaysCatalog, getJustthegaysMeta, getJustthegaysStreams } from "../justthegays/provider.js";
import { BESTHDGAYPORN_CATALOG_MAP } from "../besthdgayporn/manifest.js";
import { getBesthdgaypornCatalog, getBesthdgaypornMeta, getBesthdgaypornStreams } from "../besthdgayporn/provider.js";
import { BOYFRIENDTV_CATALOG_MAP } from "../boyfriendtv/manifest.js";
import { getBoyfriendtvCatalog, getBoyfriendtvMeta, getBoyfriendtvStreams } from "../boyfriendtv/provider.js";
import { GAYCOCK4U_CATALOG_MAP } from "../gaycock4u/manifest.js";
import { getGaycock4uCatalog, getGaycock4uMeta, getGaycock4uStreams } from "../gaycock4u/provider.js";
import { GAYSTREAM_CATALOG_MAP } from "../gaystream/manifest.js";
import { getGaystreamCatalog, getGaystreamMeta, getGaystreamStreams } from "../gaystream/provider.js";

import type { CatalogItem, StremioStream, StremioMeta } from "../../shared/schema.js";

interface AddonProvider {
  name: string;
  prefix: string;
  catalogMap: Record<string, { path: string; name: string; isQuery?: boolean }>;
  getCatalog: (catalogId: string, skip?: number) => Promise<CatalogItem[]>;
  getMeta: (id: string) => Promise<StremioMeta | null>;
  getStreams: (id: string, baseUrl?: string) => Promise<StremioStream[]>;
}

const ADDON_REGISTRY: Record<string, AddonProvider> = {
  gxtapes: {
    name: "GXtapes",
    prefix: "gxtapes:",
    catalogMap: CATALOG_MAP,
    getCatalog,
    getMeta,
    getStreams,
  },
  nurgay: {
    name: "Nurgay",
    prefix: "nurgay:",
    catalogMap: NURGAY_CATALOG_MAP,
    getCatalog: getNurgayCatalog,
    getMeta: getNurgayMeta,
    getStreams: getNurgayStreams,
  },
  fxggxt: {
    name: "Fxggxt",
    prefix: "fxggxt:",
    catalogMap: FXGGXT_CATALOG_MAP,
    getCatalog: getFxggxtCatalog,
    getMeta: getFxggxtMeta,
    getStreams: getFxggxtStreams,
  },
  justthegays: {
    name: "JustTheGays",
    prefix: "justthegays:",
    catalogMap: JUSTTHEGAYS_CATALOG_MAP,
    getCatalog: getJustthegaysCatalog,
    getMeta: getJustthegaysMeta,
    getStreams: getJustthegaysStreams,
  },
  besthdgayporn: {
    name: "BestHDgayporn",
    prefix: "besthdgayporn:",
    catalogMap: BESTHDGAYPORN_CATALOG_MAP,
    getCatalog: getBesthdgaypornCatalog,
    getMeta: getBesthdgaypornMeta,
    getStreams: getBesthdgaypornStreams,
  },
  boyfriendtv: {
    name: "BoyfriendTV",
    prefix: "boyfriendtv:",
    catalogMap: BOYFRIENDTV_CATALOG_MAP,
    getCatalog: getBoyfriendtvCatalog,
    getMeta: getBoyfriendtvMeta,
    getStreams: getBoyfriendtvStreams,
  },
  gaycock4u: {
    name: "Gaycock4U",
    prefix: "gaycock4u:",
    catalogMap: GAYCOCK4U_CATALOG_MAP,
    getCatalog: getGaycock4uCatalog,
    getMeta: getGaycock4uMeta,
    getStreams: getGaycock4uStreams,
  },
  gaystream: {
    name: "GayStream",
    prefix: "gaystream:",
    catalogMap: GAYSTREAM_CATALOG_MAP,
    getCatalog: getGaystreamCatalog,
    getMeta: getGaystreamMeta,
    getStreams: getGaystreamStreams,
  },
};

function getRequestBaseUrl(req: Request): string {
  const protoHeader = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const hostHeader = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const protocol = protoHeader || req.protocol || "http";
  const host = hostHeader || req.get("host");
  return `${protocol}://${host}`;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 200) || "Untitled";
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateNfo(title: string, poster?: string, description?: string): string {
  let nfo = `<?xml version="1.0" encoding="UTF-8"?>\n<movie>\n`;
  nfo += `  <title>${escXml(title)}</title>\n`;
  if (description) nfo += `  <plot>${escXml(description)}</plot>\n`;
  if (poster) nfo += `  <thumb aspect="poster">${escXml(poster)}</thumb>\n`;
  nfo += `</movie>\n`;
  return nfo;
}

function streamScore(s: StremioStream): number {
  if (!s.url) return 0;
  if (s.url.includes("/api/player")) return 0;
  const isProxy = s.url.includes("/proxy/stream") || s.url.includes("/api/proxy/m3u8");
  const isWebReady = !s.behaviorHints?.notWebReady;
  if (isWebReady && !isProxy) return 4;
  if (!isWebReady && !isProxy) return 3;
  if (isWebReady && isProxy) return 2;
  return 1;
}

function selectBestStream(streams: StremioStream[]): StremioStream | null {
  const playable = streams
    .filter((s) => s.url && !s.url.includes("/api/player"))
    .sort((a, b) => streamScore(b) - streamScore(a));
  return playable.length > 0 ? playable[0] : null;
}

export function registerPlexRoutes(app: Express) {
  app.get("/plex/configure", (req: Request, res: Response) => {
    const baseUrl = getRequestBaseUrl(req);
    const addonList = Object.entries(ADDON_REGISTRY)
      .map(
        ([key, a]) =>
          `<label class="addon-item"><input type="checkbox" name="addons" value="${key}" checked> ${a.name} <span class="count">${Object.keys(a.catalogMap).length} catalogs</span></label>`,
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plex Bridge - Configuration</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;min-height:100vh;display:flex;justify-content:center;padding:20px}
.container{max-width:640px;width:100%;padding:32px 0}
h1{font-size:28px;margin-bottom:8px;color:#fff}
h2{font-size:18px;margin-top:32px;margin-bottom:12px;color:#e5a00d;border-bottom:1px solid #333;padding-bottom:8px}
p{color:#999;font-size:14px;margin-bottom:16px;line-height:1.6}
.card{background:#1a1a1a;border-radius:12px;padding:24px;border:1px solid #333;margin-bottom:20px}
label.addon-item{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background .15s;font-size:14px}
label.addon-item:hover{background:#222}
label.addon-item input{accent-color:#e5a00d}
.count{color:#666;font-size:12px;margin-left:auto}
input[type="text"]{width:100%;padding:10px 14px;border:1px solid #444;border-radius:8px;background:#0a0a0a;color:#fff;font-size:14px;margin-bottom:12px;outline:none}
input[type="text"]:focus{border-color:#e5a00d}
button{padding:12px 24px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
.btn-primary{background:#e5a00d;color:#000}
.btn-primary:hover{background:#cc8e00}
.btn-primary:disabled{background:#555;color:#888;cursor:wait}
.btn-secondary{background:#333;color:#ccc;margin-left:8px}
.btn-secondary:hover{background:#444}
.actions{display:flex;gap:8px;margin-top:16px}
.step{display:flex;gap:12px;margin-bottom:16px;padding:12px;background:#111;border-radius:8px;border:1px solid #222}
.step-num{background:#e5a00d;color:#000;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0}
.step-content{flex:1}
.step-content h3{font-size:14px;color:#fff;margin-bottom:4px}
.step-content p{font-size:13px;margin-bottom:0}
code{background:#222;padding:2px 6px;border-radius:4px;font-size:12px;color:#e5a00d}
.progress{display:none;margin-top:12px;padding:12px;background:#111;border-radius:8px;border:1px solid #333}
.progress-bar{height:4px;background:#333;border-radius:2px;overflow:hidden;margin-top:8px}
.progress-fill{height:100%;background:#e5a00d;width:0%;transition:width .3s}
.arch-section{margin-top:24px;padding:16px;background:#111;border:1px solid #333;border-radius:8px}
.arch-section h3{color:#e5a00d;font-size:14px;margin-bottom:8px}
.arch-section p{font-size:13px;color:#888}
.flow{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:12px 0}
.flow span{background:#1a1a1a;padding:4px 10px;border-radius:4px;font-size:12px;border:1px solid #333}
.flow .arrow{background:none;border:none;color:#e5a00d;font-weight:bold}
</style>
</head><body>
<div class="container">
<h1>Plex Bridge</h1>
<p>Stream your Stremio add-on catalogs directly in Plex Media Player. No downloads, no storage — streams are resolved on-demand.</p>

<h2>Architecture</h2>
<div class="arch-section">
<h3>How It Works</h3>
<p>This bridge generates <code>.strm</code> files (containing stream URLs) and <code>.nfo</code> metadata files that Plex can read natively. When you play a title in Plex, it calls back to this server to resolve the stream in real-time.</p>
<div class="flow">
<span>Plex opens .strm</span><span class="arrow">&rarr;</span>
<span>Server resolves stream</span><span class="arrow">&rarr;</span>
<span>Picks best source</span><span class="arrow">&rarr;</span>
<span>Redirects to stream</span><span class="arrow">&rarr;</span>
<span>Plex plays video</span>
</div>
<p style="margin-top:8px">Uses STRM + NFO approach (virtual filesystem). No Plex plugin required. Works with any Plex installation.</p>
</div>

<h2>Configuration</h2>
<div class="card">
<label style="display:block;font-size:14px;font-weight:500;margin-bottom:6px;color:#ccc">Server URL</label>
<input type="text" id="serverUrl" value="${baseUrl}" placeholder="https://your-deployed-server.com">
<p style="font-size:12px;color:#666;margin-top:-8px">The public URL of this server. If deploying on Vercel/Netlify, use your deployment URL.</p>

<label style="display:block;font-size:14px;font-weight:500;margin-bottom:8px;margin-top:16px;color:#ccc">Select Add-ons</label>
<div id="addonList">
${addonList}
</div>

<div class="actions">
<label class="addon-item" style="margin-bottom:12px"><input type="checkbox" id="includePosters" checked> Include poster images <span class="count">recommended for Plex</span></label>
<button class="btn-primary" id="exportBtn" onclick="exportLibrary()">Download Library (.zip)</button>
<button class="btn-secondary" onclick="copyStreamUrl()">Copy Stream Test URL</button>
</div>

<div class="progress" id="progress">
<span id="progressText">Preparing library...</span>
<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
</div>
</div>

<h2>Setup Guide</h2>
<div class="step"><div class="step-num">1</div><div class="step-content"><h3>Download the Library</h3><p>Select your add-ons above and click "Download Library". This generates a ZIP with <code>.strm</code>, <code>.nfo</code>, and <code>poster.jpg</code> files. Poster download may take a few minutes for large libraries.</p></div></div>
<div class="step"><div class="step-num">2</div><div class="step-content"><h3>Extract to a Folder</h3><p>Extract the ZIP to a folder on the machine running Plex Media Server. Example: <code>/media/stremio-library/</code></p></div></div>
<div class="step"><div class="step-num">3</div><div class="step-content"><h3>Add Library in Plex</h3><p>Open Plex &rarr; Settings &rarr; Libraries &rarr; Add Library. Choose "Other Videos" or "Movies". Point it to your extracted folder.</p></div></div>
<div class="step"><div class="step-num">4</div><div class="step-content"><h3>Configure Metadata Agent</h3><p>In the library's Advanced settings, set the scanner to "Plex Video Files Scanner" and agent to "Personal Media". Enable "Local Media Assets" so Plex reads the <code>.nfo</code> files for titles and posters.</p></div></div>
<div class="step"><div class="step-num">5</div><div class="step-content"><h3>Browse and Play</h3><p>Plex will scan the library and show all titles with posters. Click any title and hit Play — the stream is resolved live from this server.</p></div></div>

<h2>Stream Resolution Endpoint</h2>
<div class="card">
<p>Each <code>.strm</code> file points to: <code>{server}/plex/stream/{addon}/{encodedId}</code></p>
<p>When Plex opens this URL, the server:</p>
<p>1. Resolves available streams from the source site<br>
2. Picks the best quality direct stream (MP4 &gt; HLS &gt; proxy)<br>
3. Redirects Plex to the playable URL</p>
<p style="margin-top:8px;color:#e5a00d;font-size:12px">Streams are never cached or stored. URLs are resolved fresh each time for maximum reliability.</p>
</div>

<h2>API Endpoints</h2>
<div class="card">
<p><code>GET /plex/configure</code> — This page</p>
<p><code>GET /plex/stream/:addon/:id</code> — Stream resolver (resolves &amp; redirects)</p>
<p><code>GET /plex/export?addons=gxtapes,nurgay&amp;server=URL</code> — Download STRM/NFO library ZIP</p>
<p><code>GET /plex/api/library?addons=gxtapes,nurgay</code> — JSON catalog for custom sync scripts</p>
</div>

<h2>Refreshing Content</h2>
<div class="card">
<p>Catalogs are dynamic — new content appears daily. To update your Plex library:</p>
<p>1. Re-download the library ZIP from this page<br>
2. Extract to the same folder (overwrite existing files)<br>
3. Plex will automatically detect changes on its next scan</p>
<p style="margin-top:8px;font-size:12px;color:#666">Tip: The ZIP is built in your browser — no server timeout limits. Each addon is fetched separately so even large catalogs work reliably.</p>
</div>
</div>

<script>
function getSelectedAddons(){
  return Array.from(document.querySelectorAll('input[name="addons"]:checked')).map(el=>el.value);
}
function escXml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function sanitize(n){return n.replace(/[<>:"/\\\\|?*\\x00-\\x1f]/g,'').replace(/\\s+/g,' ').trim().substring(0,200)||'Untitled';}
function makeNfo(title,posterUrl){
  let n='<?xml version="1.0" encoding="UTF-8"?>\\n<movie>\\n';
  n+='  <title>'+escXml(title)+'</title>\\n';
  if(posterUrl)n+='  <thumb aspect="poster">'+escXml(posterUrl)+'</thumb>\\n';
  n+='</movie>\\n';
  return n;
}

async function fetchPosterBlob(url){
  try{const r=await fetch(url);if(!r.ok)return null;return await r.blob();}catch{return null;}
}

async function exportLibrary(){
  const addons=getSelectedAddons();
  if(!addons.length){alert('Select at least one add-on');return;}
  const server=document.getElementById('serverUrl').value.replace(/\\/+$/,'');
  if(!server){alert('Enter a server URL');return;}
  const withPosters=document.getElementById('includePosters').checked;
  const btn=document.getElementById('exportBtn');
  const prog=document.getElementById('progress');
  const pText=document.getElementById('progressText');
  const pFill=document.getElementById('progressFill');
  btn.disabled=true;btn.textContent='Generating...';
  prog.style.display='block';
  pFill.style.width='0%';

  if(typeof JSZip==='undefined'){alert('JSZip library failed to load. Check your internet connection and try again.');btn.disabled=false;btn.textContent='Download Library (.zip)';prog.style.display='none';return;}
  try{
    const zip=new JSZip();
    let totalItems=0,totalPosters=0;
    const skipped=[];

    for(let ai=0;ai<addons.length;ai++){
      const addonKey=addons[ai];
      const pct=Math.round((ai/addons.length)*90);
      pFill.style.width=pct+'%';
      pText.textContent='Fetching '+addonKey+' ('+(ai+1)+'/'+addons.length+')...';

      let data;
      try{
        const r=await fetch(server+'/plex/api/library/'+addonKey);
        if(!r.ok){skipped.push(addonKey);pText.textContent=addonKey+' failed ('+r.status+'), continuing...';continue;}
        data=await r.json();
      }catch(e){skipped.push(addonKey);pText.textContent=addonKey+' failed: '+e.message+', continuing...';continue;}

      const items=data.items||[];
      pText.textContent='Building '+data.name+': '+items.length+' items'+(withPosters?' + posters':'')+'...';

      for(let i=0;i<items.length;i++){
        const item=items[i];
        const idPart=item.id.replace(addonKey+':','');
        const safe=sanitize(item.name);
        const folder=data.name+'/'+safe;

        zip.file(folder+'/'+safe+'.strm',server+'/plex/stream/'+addonKey+'/'+idPart);
        const posterProxy=server+'/plex/poster/'+addonKey+'/'+idPart;
        zip.file(folder+'/'+safe+'.nfo',makeNfo(item.name,posterProxy));
        totalItems++;
      }

      if(withPosters&&items.length>0){
        pText.textContent='Downloading posters for '+data.name+'...';
        const PBATCH=15;
        for(let pi=0;pi<items.length;pi+=PBATCH){
          const batch=items.slice(pi,pi+PBATCH);
          const blobs=await Promise.all(batch.map(it=>{
            if(!it.poster)return Promise.resolve(null);
            const idPart=it.id.replace(addonKey+':','');
            return fetchPosterBlob(server+'/plex/poster/'+addonKey+'/'+idPart);
          }));
          for(let bi=0;bi<batch.length;bi++){
            if(blobs[bi]){
              const safe=sanitize(batch[bi].name);
              zip.file(data.name+'/'+safe+'/poster.jpg',blobs[bi]);
              totalPosters++;
            }
          }
          const subPct=Math.round((ai/addons.length)*90+((pi+PBATCH)/items.length)*(90/addons.length));
          pFill.style.width=Math.min(subPct,95)+'%';
        }
      }
    }

    pText.textContent='Compressing ZIP ('+totalItems+' items, '+totalPosters+' posters)...';
    pFill.style.width='95%';
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='plex-stremio-library.zip';
    a.click();
    pFill.style.width='100%';
    let msg='Done! '+totalItems+' items, '+totalPosters+' posters. Extract to your Plex media folder.';
    if(skipped.length)msg+=' (Skipped: '+skipped.join(', ')+')';
    pText.textContent=msg;
  }catch(e){
    alert('Export failed: '+e.message);
    prog.style.display='none';
  }
  btn.disabled=false;btn.textContent='Download Library (.zip)';
}

function copyStreamUrl(){
  const server=document.getElementById('serverUrl').value.replace(/\\/+$/,'');
  navigator.clipboard.writeText(server+'/plex/stream/gxtapes/test');
  alert('Stream resolver URL pattern copied.');
}
</script>
</body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

  app.get("/plex/stream/:addon/:encodedId", async (req: Request, res: Response) => {
    const addon = req.params.addon as string;
    const encodedId = req.params.encodedId as string;
    const addonDef = ADDON_REGISTRY[addon];
    if (!addonDef) {
      return res.status(404).json({ error: "Unknown addon: " + addon });
    }

    const fullId = `${addon}:${encodedId}`;
    const baseUrl = getRequestBaseUrl(req);
    log(`Plex stream request: ${addon}/${encodedId}`, "plex");

    try {
      const streams = await addonDef.getStreams(fullId, baseUrl);
      const best = selectBestStream(streams);

      if (!best || !best.url) {
        log(`Plex stream: no playable stream found for ${fullId}`, "plex");
        return res.status(404).json({ error: "No playable stream found" });
      }

      log(`Plex stream: redirecting to ${best.url.substring(0, 80)}...`, "plex");
      res.redirect(302, best.url);
    } catch (err: any) {
      log(`Plex stream error: ${err.message}`, "plex");
      res.status(500).json({ error: "Stream resolution failed" });
    }
  });

  app.get("/plex/api/addons", (_req: Request, res: Response) => {
    const addons = Object.entries(ADDON_REGISTRY).map(([key, a]) => ({
      key,
      name: a.name,
      catalogs: Object.keys(a.catalogMap).length,
    }));
    res.json({ addons });
  });

  app.get("/plex/api/library/:addon", async (req: Request, res: Response) => {
    const addonKey = req.params.addon as string;
    const addonDef = ADDON_REGISTRY[addonKey];
    if (!addonDef) {
      return res.status(404).json({ error: "Unknown addon" });
    }

    const catalogIds = Object.keys(addonDef.catalogMap);
    const PARALLEL = 8;
    const seen = new Set<string>();
    const allItems: CatalogItem[] = [];

    for (let i = 0; i < catalogIds.length; i += PARALLEL) {
      const batch = catalogIds.slice(i, i + PARALLEL);
      const results = await Promise.allSettled(
        batch.map((cid) => addonDef.getCatalog(cid, 0)),
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const item of result.value) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              allItems.push(item);
            }
          }
        }
      }
    }

    res.json({ name: addonDef.name, prefix: addonKey, items: allItems });
  });

  app.get("/plex/poster/:addon/:encodedId", async (req: Request, res: Response) => {
    const addon = req.params.addon as string;
    const encodedId = req.params.encodedId as string;
    const addonDef = ADDON_REGISTRY[addon];
    if (!addonDef) return res.status(404).send("Unknown addon");

    const fullId = `${addon}:${encodedId}`;
    try {
      const meta = await addonDef.getMeta(fullId);
      const posterUrl = meta?.poster || meta?.background;
      if (!posterUrl) return res.status(404).send("No poster");

      const imgResp = await axios.get(posterUrl, {
        responseType: "stream",
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });
      const ct = imgResp.headers["content-type"] || "image/jpeg";
      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");
      imgResp.data.pipe(res);
    } catch {
      res.status(502).send("Poster fetch failed");
    }
  });

  app.get("/plex/export", async (req: Request, res: Response) => {
    const addonKeys = (req.query.addons as string || Object.keys(ADDON_REGISTRY).join(","))
      .split(",")
      .filter((k) => k in ADDON_REGISTRY);
    const serverUrl = (req.query.server as string || getRequestBaseUrl(req)).replace(/\/+$/, "");
    const includePosters = req.query.posters !== "false";

    if (addonKeys.length === 0) {
      return res.status(400).json({ error: "No valid addons specified" });
    }

    log(`Plex export: generating library for ${addonKeys.join(", ")} (posters: ${includePosters})`, "plex");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="plex-stremio-library.zip"');

    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(res);

    archive.on("error", (err: Error) => {
      log(`Plex export error: ${err.message}`, "plex");
    });

    async function downloadPoster(url: string): Promise<Buffer | null> {
      try {
        const resp = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 6000,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          maxContentLength: 2 * 1024 * 1024,
        });
        return Buffer.from(resp.data);
      } catch {
        return null;
      }
    }

    const globalSeen = new Set<string>();
    let totalItems = 0;
    let posterCount = 0;

    for (const addonKey of addonKeys) {
      const addon = ADDON_REGISTRY[addonKey];
      const catalogIds = Object.keys(addon.catalogMap);

      const CATALOG_BATCH = 5;
      for (let ci = 0; ci < catalogIds.length; ci += CATALOG_BATCH) {
        const catalogBatch = catalogIds.slice(ci, ci + CATALOG_BATCH);
        const catalogResults = await Promise.allSettled(
          catalogBatch.map((cid) => addon.getCatalog(cid, 0)),
        );

        const batchItems: CatalogItem[] = [];
        for (const result of catalogResults) {
          if (result.status === "fulfilled") {
            for (const item of result.value) {
              if (!globalSeen.has(item.id)) {
                globalSeen.add(item.id);
                batchItems.push(item);
              }
            }
          }
        }

        let posters: (Buffer | null)[] = [];
        if (includePosters && batchItems.length > 0) {
          posters = await Promise.all(
            batchItems.map((item) =>
              item.poster ? downloadPoster(item.poster) : Promise.resolve(null),
            ),
          );
        }

        for (let j = 0; j < batchItems.length; j++) {
          const item = batchItems[j];
          const idPart = item.id.replace(`${addonKey}:`, "");
          const safeName = sanitizeFilename(item.name);
          const folderPath = `${addon.name}/${safeName}`;

          archive.append(`${serverUrl}/plex/stream/${addonKey}/${idPart}`, {
            name: `${folderPath}/${safeName}.strm`,
          });

          const posterProxyUrl = `${serverUrl}/plex/poster/${addonKey}/${idPart}`;
          archive.append(generateNfo(item.name, posterProxyUrl, undefined), {
            name: `${folderPath}/${safeName}.nfo`,
          });

          if (posters[j]) {
            archive.append(posters[j]!, { name: `${folderPath}/poster.jpg` });
            posterCount++;
          }

          totalItems++;
        }
      }

      log(`Plex export: ${addon.name} done (${totalItems} items so far)`, "plex");
    }

    await archive.finalize();
    log(`Plex export: completed — ${totalItems} items, ${posterCount} posters`, "plex");
  });
}
