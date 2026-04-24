import * as cheerio from "cheerio";
import { fetchPage } from "../stremio/http";
import { makeId, extractUrl } from "./ids";
import { getCached, setCached } from "../stremio/cache";
import { extractFxggxtStreams } from "./extractors";
import { FXGGXT_CATALOG_MAP } from "./manifest";
import { mapStreamsForStremio } from "../stremio/stream-mapper";
import type { StremioMeta, StremioStream, CatalogItem } from "../../shared/schema";

const BASE_URL = "https://fxggxt.com";
const isDebug = () => process.env.DEBUG === "1";

function fixUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function parseArticles($: cheerio.CheerioAPI): CatalogItem[] {
  const items: CatalogItem[] = [];
  $("article.loop-video.thumb-block").each((_, el) => {
    const $el = $(el);
    const aTag = $el.find("a").first();
    const href = aTag.attr("href");
    const title = aTag.find("header.entry-header span").text().trim() || "No Title";
    const $img = $el.find(".post-thumbnail-container img");
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

export async function getFxggxtCatalog(catalogId: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `fxggxt-catalog:${catalogId}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const catalogDef = FXGGXT_CATALOG_MAP[catalogId];
  if (!catalogDef) return [];

  const page = Math.floor(skip / 24) + 1;
  let url: string;

  if (page > 1) {
    url = `${BASE_URL}${catalogDef.path}page/${page}/`;
  } else {
    url = `${BASE_URL}${catalogDef.path}`;
  }

  if (isDebug()) console.log(`[Fxggxt] Fetching catalog: ${url}`);

  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const items = parseArticles($);

    setCached("catalog", cacheKey, items);
    return items;
  } catch (err: any) {
    if (isDebug()) console.error(`[Fxggxt] Catalog error:`, err.message);
    return [];
  }
}

export async function searchFxggxtContent(query: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `fxggxt-search:${query}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const allItems: CatalogItem[] = [];
  const maxPages = 7;
  const startPage = Math.floor(skip / 24) + 1;

  for (let page = startPage; page < startPage + maxPages; page++) {
    try {
      const url = page === 1
        ? `${BASE_URL}/?s=${encodeURIComponent(query)}`
        : `${BASE_URL}/page/${page}/?s=${encodeURIComponent(query)}`;
      if (isDebug()) console.log(`[Fxggxt] Search page ${page}: ${url}`);

      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      const items = parseArticles($);

      if (items.length === 0) break;

      for (const item of items) {
        if (!allItems.some(i => i.id === item.id)) {
          allItems.push(item);
        }
      }
    } catch (err: any) {
      if (isDebug()) console.error(`[Fxggxt] Search error:`, err.message);
      break;
    }
  }

  setCached("catalog", cacheKey, allItems);
  return allItems;
}

export async function getFxggxtMeta(id: string): Promise<StremioMeta | null> {
  const cacheKey = `fxggxt-meta:${id}`;
  const cached = getCached<StremioMeta>("meta", cacheKey);
  if (cached) return cached;

  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[Fxggxt] Getting meta for: ${url}`);

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const videoEl = $("article[itemtype='http://schema.org/VideoObject']");

    const title = videoEl.find("meta[itemprop='name']").attr("content")?.trim()
      || $('meta[property="og:title"]').attr("content")?.trim()
      || $("h1.entry-title").text().trim()
      || "Unknown";
    const poster = videoEl.find("meta[itemprop='thumbnailUrl']").attr("content")?.trim()
      || $('meta[property="og:image"]').attr("content")?.trim();
    const description = videoEl.find("meta[itemprop='description']").attr("content")?.trim()
      || $('meta[property="og:description"]').attr("content")?.trim();

    const actors = $("#video-actors a").map((_, el) => $(el).text().trim()).get().filter(Boolean);

    const meta: StremioMeta = {
      id,
      type: "movie",
      name: title,
      poster: poster || undefined,
      posterShape: "poster",
      background: poster || undefined,
      description: description || undefined,
    };

    if (actors.length > 0) {
      (meta as any).cast = actors;
    }

    setCached("meta", cacheKey, meta);
    return meta;
  } catch (err: any) {
    if (isDebug()) console.error(`[Fxggxt] Meta error:`, err.message);
    return null;
  }
}

export async function getFxggxtStreams(id: string, baseUrl?: string): Promise<StremioStream[]> {
  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[Fxggxt] Getting streams for: ${url}`);

    const extracted = await extractFxggxtStreams(url);
    const streams = await mapStreamsForStremio(extracted, baseUrl);
    return streams;
  } catch (err: any) {
    if (isDebug()) console.error(`[Fxggxt] Stream error:`, err.message);
    return [];
  }
}
