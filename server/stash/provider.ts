import { makeId, extractSceneId } from "./ids.js";
import { findScenes, findScene, getSceneStreams, type StashScene } from "./client.js";
import type { StashConfig } from "./manifest.js";
import type { StremioMeta, StremioStream, CatalogItem } from "../../shared/schema.js";
import { log } from "../logger.js";

const isDebug = () => process.env.DEBUG === "1";
const PER_PAGE = 25;

function sceneToMeta(scene: StashScene, config: StashConfig): CatalogItem {
  let poster = scene.paths.screenshot || undefined;
  if (poster && !poster.startsWith("http")) {
    poster = `${config.serverUrl}${poster}`;
  }
  if (poster && config.apiKey) {
    const sep = poster.includes("?") ? "&" : "?";
    poster = `${poster}${sep}apikey=${config.apiKey}`;
  }

  return {
    id: makeId(scene.id),
    name: scene.title || scene.files?.[0]?.basename || `Scene ${scene.id}`,
    poster,
    type: "movie",
  };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export async function getStashCatalog(config: StashConfig, catalogId: string, skip: number = 0): Promise<CatalogItem[]> {
  const page = Math.floor(skip / PER_PAGE) + 1;

  let sort = "created_at";
  let direction: "ASC" | "DESC" = "DESC";
  let sceneFilter: Record<string, any> | undefined;

  switch (catalogId) {
    case "stash-recent":
      sort = "created_at";
      direction = "DESC";
      break;
    case "stash-played":
      sort = "last_played_at";
      direction = "DESC";
      sceneFilter = { play_count: { modifier: "GREATER_THAN", value: 0 } };
      break;
    case "stash-most-played":
      sort = "play_count";
      direction = "DESC";
      sceneFilter = { play_count: { modifier: "GREATER_THAN", value: 0 } };
      break;
    case "stash-highest-rated":
      sort = "rating";
      direction = "DESC";
      sceneFilter = { rating100: { modifier: "GREATER_THAN", value: 0 } };
      break;
    case "stash-random":
      sort = "random";
      direction = "DESC";
      break;
    default:
      sort = "created_at";
      direction = "DESC";
  }

  if (isDebug()) {
    log(`Stash catalog: ${catalogId}, page=${page}, sort=${sort}`, "stash");
  }

  const result = await findScenes(config, {
    filter: { page, per_page: PER_PAGE, sort, direction },
    sceneFilter,
  });

  return result.scenes.map(s => sceneToMeta(s, config));
}

export async function searchStashContent(config: StashConfig, query: string, skip: number = 0): Promise<CatalogItem[]> {
  const page = Math.floor(skip / PER_PAGE) + 1;

  if (isDebug()) {
    log(`Stash search: "${query}", page=${page}`, "stash");
  }

  const result = await findScenes(config, {
    filter: { q: query, page, per_page: PER_PAGE, sort: "updated_at", direction: "DESC" },
  });

  return result.scenes.map(s => sceneToMeta(s, config));
}

export async function getStashMeta(config: StashConfig, id: string): Promise<StremioMeta | null> {
  const sceneId = extractSceneId(id);
  if (isDebug()) {
    log(`Stash meta: scene ${sceneId}`, "stash");
  }

  const scene = await findScene(config, sceneId);
  if (!scene) return null;

  let poster = scene.paths.screenshot || undefined;
  let background = scene.paths.webp || scene.paths.preview || undefined;
  [poster, background].forEach((url, _i) => {
    if (url && !url.startsWith("http")) {
      url = `${config.serverUrl}${url}`;
    }
  });
  if (poster && !poster.startsWith("http")) poster = `${config.serverUrl}${poster}`;
  if (background && !background.startsWith("http")) background = `${config.serverUrl}${background}`;
  if (poster && config.apiKey) {
    const sep = poster.includes("?") ? "&" : "?";
    poster = `${poster}${sep}apikey=${config.apiKey}`;
  }
  if (background && config.apiKey) {
    const sep = background.includes("?") ? "&" : "?";
    background = `${background}${sep}apikey=${config.apiKey}`;
  }

  const genres: string[] = [];
  if (scene.tags?.length) {
    genres.push(...scene.tags.map(t => t.name));
  }

  const links: Array<{ name: string; category: string; url: string }> = [];
  if (scene.performers?.length) {
    scene.performers.forEach(p => {
      links.push({ name: p.name, category: "Performers", url: `stash:performer:${p.id}` });
    });
  }
  if (scene.studio) {
    links.push({ name: scene.studio.name, category: "Studio", url: `stash:studio:${scene.studio.id}` });
  }

  const file = scene.files?.[0];
  let description = scene.details || "";
  if (file) {
    const parts: string[] = [];
    if (file.width && file.height) parts.push(`${file.width}x${file.height}`);
    if (file.video_codec) parts.push(file.video_codec.toUpperCase());
    if (file.duration) parts.push(formatDuration(file.duration));
    if (file.size) parts.push(formatFileSize(file.size));
    if (parts.length) {
      description = description ? `${description}\n\n${parts.join(" | ")}` : parts.join(" | ");
    }
  }
  if (scene.performers?.length) {
    description = description
      ? `${description}\n\nPerformers: ${scene.performers.map(p => p.name).join(", ")}`
      : `Performers: ${scene.performers.map(p => p.name).join(", ")}`;
  }

  const runtime = file?.duration ? formatDuration(file.duration) : undefined;

  return {
    id: makeId(scene.id),
    type: "movie",
    name: scene.title || file?.basename || `Scene ${scene.id}`,
    poster,
    background,
    description,
    genres: genres.length ? genres : undefined,
    releaseInfo: scene.date || undefined,
    runtime,
    links: links.length ? links : undefined,
  };
}

export async function getStashStreams(config: StashConfig, id: string): Promise<StremioStream[]> {
  const sceneId = extractSceneId(id);
  if (isDebug()) {
    log(`Stash streams: scene ${sceneId}`, "stash");
  }

  const streams = await getSceneStreams(config, sceneId);
  const scene = await findScene(config, sceneId);

  const stremioStreams: StremioStream[] = [];

  for (const stream of streams) {
    let streamUrl = stream.url;
    if (!streamUrl.startsWith("http")) {
      streamUrl = `${config.serverUrl}${streamUrl}`;
    }
    if (config.apiKey) {
      const sep = streamUrl.includes("?") ? "&" : "?";
      streamUrl = `${streamUrl}${sep}apikey=${config.apiKey}`;
    }

    const mimeType = stream.mime_type || "";
    const label = stream.label || "Stream";
    const isHls = mimeType.includes("mpegurl") || mimeType.includes("m3u8") || streamUrl.includes(".m3u8");
    const isDash = mimeType.includes("dash") || streamUrl.includes(".mpd");

    let resolution = "";
    if (scene?.files?.[0]) {
      const f = scene.files[0];
      if (f.height >= 2160) resolution = "4K";
      else if (f.height >= 1080) resolution = "1080p";
      else if (f.height >= 720) resolution = "720p";
      else if (f.height >= 480) resolution = "480p";
      else resolution = `${f.height}p`;
    }

    const name = `Stash ${label}${resolution ? ` [${resolution}]` : ""}`;
    const file = scene?.files?.[0];
    const titleParts: string[] = [];
    if (file?.video_codec) titleParts.push(file.video_codec.toUpperCase());
    if (file?.audio_codec) titleParts.push(file.audio_codec);
    if (file?.size) titleParts.push(formatFileSize(file.size));

    stremioStreams.push({
      name,
      title: titleParts.length ? titleParts.join(" | ") : label,
      url: streamUrl,
      behaviorHints: {
        notWebReady: isHls || isDash,
        bingeGroup: `stash-${sceneId}`,
        proxyHeaders: config.apiKey ? {
          request: {
            "ApiKey": config.apiKey,
          },
        } : undefined,
      },
    });
  }

  if (stremioStreams.length === 0 && scene?.paths?.stream) {
    let directUrl = scene.paths.stream;
    if (!directUrl.startsWith("http")) {
      directUrl = `${config.serverUrl}${directUrl}`;
    }
    if (config.apiKey) {
      const sep = directUrl.includes("?") ? "&" : "?";
      directUrl = `${directUrl}${sep}apikey=${config.apiKey}`;
    }

    stremioStreams.push({
      name: "Stash Direct",
      title: "Direct stream from Stash",
      url: directUrl,
      behaviorHints: {
        notWebReady: false,
        bingeGroup: `stash-${sceneId}`,
        proxyHeaders: config.apiKey ? {
          request: {
            "ApiKey": config.apiKey,
          },
        } : undefined,
      },
    });
  }

  return stremioStreams;
}
