import * as cheerio from "cheerio";
import { fetchPage } from "../stremio/http";
import { makeId, extractUrl } from "./ids";
import { getCached, setCached } from "../stremio/cache";
import { extractBoyfriendtvStreams } from "./extractors";
import { BOYFRIENDTV_CATALOG_MAP } from "./manifest";
import { mapStreamsForStremio } from "../stremio/stream-mapper";
import type { StremioMeta, StremioStream, CatalogItem } from "../../shared/schema";

const BASE_URL = "https://www.boyfriendtv.com";
const isDebug = () => process.env.DEBUG === "1";

function fixUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function parseItems($: cheerio.CheerioAPI): CatalogItem[] {
  const items: CatalogItem[] = [];
  $("ul.media-listing-grid.main-listing-grid-offset li").each((_, el) => {
    const $el = $(el);
    const title = $el.find("p.titlevideospot a").text().trim();
    const href = $el.find("a").first().attr("href");
    const $img = $el.find("img");
    // BoyfriendTV uses lazy loading — actual URL is in data-thumb or data-src
    const poster =
      $img.attr("data-thumb") ||
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

export async function getBoyfriendtvCatalog(catalogId: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `boyfriendtv-catalog:${catalogId}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const catalogDef = BOYFRIENDTV_CATALOG_MAP[catalogId];
  if (!catalogDef) return [];

  const page = Math.floor(skip / 24) + 1;
  let url: string;

  if (catalogDef.isQuery) {
    if (page > 1) {
      url = `${BASE_URL}${catalogDef.path}&page=${page}`;
    } else {
      url = `${BASE_URL}${catalogDef.path}`;
    }
  } else {
    if (page > 1) {
      url = `${BASE_URL}${catalogDef.path}?page=${page}`;
    } else {
      url = `${BASE_URL}${catalogDef.path}`;
    }
  }

  if (isDebug()) console.log(`[BoyfriendTV] Fetching catalog: ${url}`);

  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const items = parseItems($);

    setCached("catalog", cacheKey, items);
    return items;
  } catch (err: any) {
    if (isDebug()) console.error(`[BoyfriendTV] Catalog error:`, err.message);
    return [];
  }
}

export async function searchBoyfriendtvContent(query: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `boyfriendtv-search:${query}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const allItems: CatalogItem[] = [];
  const maxPages = 3;
  const startPage = Math.floor(skip / 24) + 1;

  for (let page = startPage; page < startPage + maxPages; page++) {
    try {
      const url = page === 1
        ? `${BASE_URL}/search/?q=${encodeURIComponent(query)}`
        : `${BASE_URL}/search/?q=${encodeURIComponent(query)}&page=${page}`;
      if (isDebug()) console.log(`[BoyfriendTV] Search page ${page}: ${url}`);

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
      if (isDebug()) console.error(`[BoyfriendTV] Search error:`, err.message);
      break;
    }
  }

  setCached("catalog", cacheKey, allItems);
  return allItems;
}

export async function getBoyfriendtvMeta(id: string): Promise<StremioMeta | null> {
  const cacheKey = `boyfriendtv-meta:${id}`;
  const cached = getCached<StremioMeta>("meta", cacheKey);
  if (cached) return cached;

  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[BoyfriendTV] Getting meta for: ${url}`);

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    let title = "Unknown";
    let description: string | undefined;
    let poster: string | undefined;

    const ldJsonScript = $('script[type="application/ld+json"]').first().html();
    if (ldJsonScript) {
      try {
        const ldJson = JSON.parse(ldJsonScript);
        title = ldJson.name || title;
        description = ldJson.description || undefined;
        if (ldJson.thumbnailUrl) {
          if (Array.isArray(ldJson.thumbnailUrl)) {
            poster = ldJson.thumbnailUrl[0];
          } else {
            poster = ldJson.thumbnailUrl;
          }
        }
      } catch {
      }
    }

    if (title === "Unknown") {
      title = $('meta[property="og:title"]').attr("content")?.trim()
        || $("title").text().trim()
        || "Unknown";
    }
    if (!poster) {
      poster = $('meta[property="og:image"]').attr("content")?.trim();
    }
    if (!description) {
      description = $('meta[property="og:description"]').attr("content")?.trim();
    }

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
    if (isDebug()) console.error(`[BoyfriendTV] Meta error:`, err.message);
    return null;
  }
}

export async function getBoyfriendtvStreams(id: string, baseUrl?: string): Promise<StremioStream[]> {
  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[BoyfriendTV] Getting streams for: ${url}`);

    const extracted = await extractBoyfriendtvStreams(url);
    const streams = await mapStreamsForStremio(extracted, baseUrl);
    return streams;
  } catch (err: any) {
    if (isDebug()) console.error(`[BoyfriendTV] Stream error:`, err.message);
    return [];
  }
}
