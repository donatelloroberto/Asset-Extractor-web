import * as cheerio from "cheerio";
import { fetchPage } from "./http";
import { makeId, extractUrl } from "./ids";
import { getCached, setCached } from "./cache";
import { extractStreams } from "./extractors";
import { CATALOG_MAP } from "./manifest";
import type { StremioMeta, StremioStream, CatalogItem } from "../../shared/schema";

const BASE_URL = "https://gay.xtapes.tw";
const isDebug = () => process.env.DEBUG === "1";

function fixUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

export async function getCatalog(catalogId: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `catalog:${catalogId}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const catalogDef = CATALOG_MAP[catalogId];
  if (!catalogDef) return [];

  const page = Math.floor(skip / 24) + 1;
  let url: string;
  if (catalogDef.isQuery) {
    if (page > 1) {
      url = `${BASE_URL}/page/${page}${catalogDef.path}`;
    } else {
      url = `${BASE_URL}${catalogDef.path}`;
    }
  } else {
    if (page > 1) {
      url = `${BASE_URL}${catalogDef.path}page/${page}/`;
    } else {
      url = `${BASE_URL}${catalogDef.path}`;
    }
  }

  if (isDebug()) console.log(`[Provider] Fetching catalog: ${url}`);

  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const items: CatalogItem[] = [];

    $("ul.listing-tube li").each((_, el) => {
      const $el = $(el);
      const title = $el.find("img").attr("title") || $el.find("img").attr("alt") || "";
      const href = $el.find("a").attr("href");
      const poster = $el.find("img").attr("src");

      if (href && title) {
        const fullUrl = fixUrl(href);
        items.push({
          id: makeId(fullUrl),
          name: title.trim(),
          poster: poster ? fixUrl(poster) : undefined,
          type: "movie",
        });
      }
    });

    setCached("catalog", cacheKey, items);
    return items;
  } catch (err: any) {
    if (isDebug()) console.error(`[Provider] Catalog error:`, err.message);
    return [];
  }
}

export async function searchContent(query: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `search:${query}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const allItems: CatalogItem[] = [];
  const maxPages = 3;
  const startPage = Math.floor(skip / 24) + 1;

  for (let page = startPage; page < startPage + maxPages; page++) {
    try {
      const url = `${BASE_URL}/page/${page}/?s=${encodeURIComponent(query)}`;
      if (isDebug()) console.log(`[Provider] Search page ${page}: ${url}`);

      const html = await fetchPage(url);
      const $ = cheerio.load(html);

      let foundNew = false;
      $("ul.listing-tube li").each((_, el) => {
        const $el = $(el);
        const title = $el.find("img").attr("title") || $el.find("img").attr("alt") || "";
        const href = $el.find("a").attr("href");
        const poster = $el.find("img").attr("src");

        if (href && title) {
          const fullUrl = fixUrl(href);
          const item: CatalogItem = {
            id: makeId(fullUrl),
            name: title.trim(),
            poster: poster ? fixUrl(poster) : undefined,
            type: "movie",
          };
          if (!allItems.some(i => i.id === item.id)) {
            allItems.push(item);
            foundNew = true;
          }
        }
      });

      if (!foundNew) break;
    } catch (err: any) {
      if (isDebug()) console.error(`[Provider] Search error:`, err.message);
      break;
    }
  }

  setCached("catalog", cacheKey, allItems);
  return allItems;
}

export async function getMeta(id: string): Promise<StremioMeta | null> {
  const cacheKey = `meta:${id}`;
  const cached = getCached<StremioMeta>("meta", cacheKey);
  if (cached) return cached;

  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[Provider] Getting meta for: ${url}`);

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr("content")?.trim() || $("title").text().trim() || "Unknown";
    const poster = $('meta[property="og:image"]').attr("content")?.trim();
    const description = $('meta[property="og:description"]').attr("content")?.trim();

    const meta: StremioMeta = {
      id,
      type: "movie",
      name: title,
      poster: poster || undefined,
      posterShape: "landscape",
      background: poster || undefined,
      description: description || undefined,
    };

    setCached("meta", cacheKey, meta);
    return meta;
  } catch (err: any) {
    if (isDebug()) console.error(`[Provider] Meta error:`, err.message);
    return null;
  }
}

export async function getStreams(id: string): Promise<StremioStream[]> {
  const cacheKey = `stream:${id}`;
  const cached = getCached<StremioStream[]>("stream", cacheKey);
  if (cached) return cached;

  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[Provider] Getting streams for: ${url}`);

    const extracted = await extractStreams(url);
    const streams: StremioStream[] = extracted.map(s => {
      const hints: any = { notWebReady: true };
      if (s.referer) {
        hints.proxyHeaders = { request: { Referer: s.referer } };
      }
      return {
        name: s.name,
        title: s.quality ? `${s.name} - ${s.quality}` : s.name,
        url: s.url,
        behaviorHints: hints,
      };
    });

    if (streams.length > 0) {
      setCached("stream", cacheKey, streams);
    }
    return streams;
  } catch (err: any) {
    if (isDebug()) console.error(`[Provider] Stream error:`, err.message);
    return [];
  }
}
