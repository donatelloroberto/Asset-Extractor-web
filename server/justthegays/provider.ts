import * as cheerio from "cheerio";
import { fetchPage } from "../stremio/http";
import { makeId, extractUrl } from "./ids";
import { getCached, setCached } from "../stremio/cache";
import { extractJustthegaysStreams } from "./extractors";
import { JUSTTHEGAYS_CATALOG_MAP } from "./manifest";
import { mapStreamsForStremio } from "../stremio/stream-mapper";
import type { StremioMeta, StremioStream, CatalogItem } from "../../shared/schema";

const BASE_URL = "https://justthegays.com";
const isDebug = () => process.env.DEBUG === "1";

function fixUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function parseArticles($: cheerio.CheerioAPI): CatalogItem[] {
  const items: CatalogItem[] = [];
  $("article.video, article.type-video").each((_, el) => {
    const $el = $(el);
    const title = $el.find("h3.post-title a").text().trim();
    const href = $el.find("div.item-img a").first().attr("href")
      || $el.find("h3.post-title a").attr("href");
    const poster = $el.find("div.item-img img").attr("src")
      || $el.find("img.wp-post-image").attr("src");

    if (href && title) {
      const fullUrl = fixUrl(href);
      items.push({
        id: makeId(fullUrl),
        name: title,
        poster: poster ? fixUrl(poster) : undefined,
        type: "movie",
      });
    }
  });
  return items;
}

export async function getJustthegaysCatalog(catalogId: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `justthegays-catalog:${catalogId}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  const catalogDef = JUSTTHEGAYS_CATALOG_MAP[catalogId];
  if (!catalogDef) return [];

  const page = Math.floor(skip / 24) + 1;
  let url: string;

  if (page > 1) {
    url = `${BASE_URL}${catalogDef.path}page/${page}/`;
  } else {
    url = `${BASE_URL}${catalogDef.path}`;
  }

  if (isDebug()) console.log(`[Justthegays] Fetching catalog: ${url}`);

  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const items = parseArticles($);

    setCached("catalog", cacheKey, items);
    return items;
  } catch (err: any) {
    if (isDebug()) console.error(`[Justthegays] Catalog error:`, err.message);
    return [];
  }
}

export async function searchJustthegaysContent(query: string, skip: number = 0): Promise<CatalogItem[]> {
  const cacheKey = `justthegays-search:${query}:${skip}`;
  const cached = getCached<CatalogItem[]>("catalog", cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    if (isDebug()) console.log(`[Justthegays] Search: ${url}`);

    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const items = parseArticles($);

    setCached("catalog", cacheKey, items);
    return items;
  } catch (err: any) {
    if (isDebug()) console.error(`[Justthegays] Search error:`, err.message);
    return [];
  }
}

export async function getJustthegaysMeta(id: string): Promise<StremioMeta | null> {
  const cacheKey = `justthegays-meta:${id}`;
  const cached = getCached<StremioMeta>("meta", cacheKey);
  if (cached) return cached;

  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[Justthegays] Getting meta for: ${url}`);

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
    if (isDebug()) console.error(`[Justthegays] Meta error:`, err.message);
    return null;
  }
}

export async function getJustthegaysStreams(id: string, baseUrl?: string): Promise<StremioStream[]> {
  try {
    const url = extractUrl(id);
    if (isDebug()) console.log(`[Justthegays] Getting streams for: ${url}`);

    const extracted = await extractJustthegaysStreams(url);
    const streams = await mapStreamsForStremio(extracted, baseUrl);
    return streams;
  } catch (err: any) {
    if (isDebug()) console.error(`[Justthegays] Stream error:`, err.message);
    return [];
  }
}
