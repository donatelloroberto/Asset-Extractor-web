import * as cheerio from "cheerio";
import { fetchPage } from "../stremio/http";
import { makeId, extractUrl } from "./ids";
import { getCached, setCached } from "../stremio/cache";
import { extractBesthdgaypornStreams } from "./extractors";
import { BESTHDGAYPORN_CATALOG_MAP } from "./manifest";
import { mapStreamsForStremio } from "../stremio/stream-mapper";
import type { StremioMeta, StremioStream, CatalogItem } from "../../shared/schema";

const BASE_URL = "https://besthdgayporn.com";
const isDebug = () => process.env.DEBUG === "1";

function fixUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function parseItems($: cheerio.CheerioAPI): CatalogItem[] {
  const items: CatalogItem[] = [];
  $("div.aiovg-item-video").each((_, el) => {
    const $el = $(el);
    const title = $el.find("a.aiovg-link-title").text().trim()
      || $el.find(".aiovg-link-title").text().trim();
    const href = $el.find("a.aiovg-responsive-container").attr("href")
      || $el.find("a.aiovg-link-title").attr("href")
      || $el.find("a").first().attr("href");
    const $img = $el.find("img.aiovg-responsive-element, img").first();
    // aiovg plugin uses lazy loading with data-src
    const poster =
      $img.attr("data-lazy-src") ||
      $img.attr("data-src") ||
      $img.attr("src");

    if (href && title) {
      const fullUrl = fixUrl(href);
      items.push({
        id: makeId(fullUrl),
        name: title,
        poster: poster && !poster.startsWith("data:") ? fixUrl(poster) : undefined,
        type: "movie",
      });
    }
  });
  return items;
}

export async function getBesthdgaypornCatalog(catalogId: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `besthdgayporn-catalog:${catalogId}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const catalogDef = BESTHDGAYPORN_CATALOG_MAP[catalogId];
  if (!catalogDef) return [];

  const page = Math.floor(skip / 24) + 1;
  let url: string;

  if (catalogDef.path === "/") {
    if (page > 1) {
      url = `${BASE_URL}/page/${page}/`;
    } else {
      url = `${BASE_URL}/`;
    }
  } else {
    if (page > 1) {
      url = `${BASE_URL}${catalogDef.path}page/${page}/`;
    } else {
      url = `${BASE_URL}${catalogDef.path}`;
    }
  }

  if (isDebug()) console.log(`[BestHDgayporn] Fetching catalog: ${url}`);

  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const items = parseItems($);

    setCached("catalog", cacheKey, items);
    return items;
  } catch (err: any) {
    if (isDebug()) console.error(`[BestHDgayporn] Catalog error:`, err.message);
    return [];
  }
}

export async function searchBesthdgaypornContent(query: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `besthdgayporn-search:${query}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const allItems: CatalogItem[] = [];
  const maxPages = 3;
  const startPage = Math.floor(skip / 24) + 1;

  for (let page = startPage; page < startPage + maxPages; page++) {
    try {
      const url = page === 1
        ? `${BASE_URL}/?s=${encodeURIComponent(query)}`
        : `${BASE_URL}/page/${page}/?s=${encodeURIComponent(query)}`;
      if (isDebug()) console.log(`[BestHDgayporn] Search page ${page}: ${url}`);

      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      const items = parseItems($);

      if (items.length === 0) break;

      for (const item of items) {
        if (!allItems.some(i => i.id === item.id)) {
          allItems.push(item);
        }
      }
    } catch (err: any) {
      if (isDebug()) console.error(`[BestHDgayporn] Search error:`, err.message);
      break;
    }
  }

  setCached("catalog", cacheKey, allItems);
  return allItems;
}

export async function getBesthdgaypornMeta(id: string): Promise<StremioMeta | null> {
  const cacheKey = `besthdgayporn-meta:${id}`;
  const cached = getCached<StremioMeta>("meta", cacheKey);
  if (cached) return cached;

  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[BestHDgayporn] Getting meta for: ${url}`);

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr("content")?.trim()
      || $("title").text().trim()
      || "Unknown";
    const poster = $('meta[property="og:image"]').attr("content")?.trim();
    const description = $('meta[property="og:description"]').attr("content")?.trim();

    const meta: StremioMeta = {
      id,
      type: "movie",
      name: title,
      poster: poster || undefined,
      posterShape: "poster",
      background: poster || undefined,
      description: description || undefined,
    };

    setCached("meta", cacheKey, meta);
    return meta;
  } catch (err: any) {
    if (isDebug()) console.error(`[BestHDgayporn] Meta error:`, err.message);
    return null;
  }
}

export async function getBesthdgaypornStreams(id: string, baseUrl?: string): Promise<StremioStream[]> {
  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[BestHDgayporn] Getting streams for: ${url}`);

    const extracted = await extractBesthdgaypornStreams(url);
    const streams = await mapStreamsForStremio(extracted, baseUrl);
    return streams;
  } catch (err: any) {
    if (isDebug()) console.error(`[BestHDgayporn] Stream error:`, err.message);
    return [];
  }
}
