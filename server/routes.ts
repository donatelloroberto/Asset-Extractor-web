import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from "axios";
import { buildManifest } from "./stremio/manifest";
import { getCatalog, searchContent, getMeta, getStreams } from "./stremio/provider";
import { buildNurgayManifest } from "./nurgay/manifest";
import { getNurgayCatalog, searchNurgayContent, getNurgayMeta, getNurgayStreams } from "./nurgay/provider";
import { buildFxggxtManifest } from "./fxggxt/manifest";
import { getFxggxtCatalog, searchFxggxtContent, getFxggxtMeta, getFxggxtStreams } from "./fxggxt/provider";
import { buildJustthegaysManifest } from "./justthegays/manifest";
import { getJustthegaysCatalog, searchJustthegaysContent, getJustthegaysMeta, getJustthegaysStreams } from "./justthegays/provider";
import { buildBesthdgaypornManifest } from "./besthdgayporn/manifest";
import { getBesthdgaypornCatalog, searchBesthdgaypornContent, getBesthdgaypornMeta, getBesthdgaypornStreams } from "./besthdgayporn/provider";
import { buildBoyfriendtvManifest } from "./boyfriendtv/manifest";
import { getBoyfriendtvCatalog, searchBoyfriendtvContent, getBoyfriendtvMeta, getBoyfriendtvStreams } from "./boyfriendtv/provider";
import { buildGaycock4uManifest } from "./gaycock4u/manifest";
import { getGaycock4uCatalog, searchGaycock4uContent, getGaycock4uMeta, getGaycock4uStreams } from "./gaycock4u/provider";
import { buildGaystreamManifest } from "./gaystream/manifest";
import { getGaystreamCatalog, searchGaystreamContent, getGaystreamMeta, getGaystreamStreams } from "./gaystream/provider";
import { getCacheStats, clearAllCaches } from "./stremio/cache";
import { log } from "./logger";

const startTime = Date.now();

function parseStremioExtra(extra: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = extra.split("&");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx !== -1) {
      const key = decodeURIComponent(part.slice(0, eqIdx));
      const value = decodeURIComponent(part.slice(eqIdx + 1));
      result[key] = value;
    }
  }
  return result;
}

function isNurgayId(id: string): boolean {
  return id.startsWith("nurgay:");
}

function isFxggxtId(id: string): boolean {
  return id.startsWith("fxggxt:");
}

function isNurgayCatalog(id: string): boolean {
  return id.startsWith("nurgay-");
}

function isFxggxtCatalog(id: string): boolean {
  return id.startsWith("fxggxt-");
}

function isJustthegaysId(id: string): boolean {
  return id.startsWith("justthegays:");
}

function isJustthegaysCatalog(id: string): boolean {
  return id.startsWith("justthegays-");
}

function isBesthdgaypornId(id: string): boolean {
  return id.startsWith("besthdgayporn:");
}

function isBesthdgaypornCatalog(id: string): boolean {
  return id.startsWith("besthdgayporn-");
}

function isBoyfriendtvId(id: string): boolean {
  return id.startsWith("boyfriendtv:");
}

function isBoyfriendtvCatalog(id: string): boolean {
  return id.startsWith("boyfriendtv-");
}

function isGaycock4uId(id: string): boolean {
  return id.startsWith("gaycock4u:");
}

function isGaycock4uCatalog(id: string): boolean {
  return id.startsWith("gaycock4u-");
}

function isGaystreamId(id: string): boolean {
  return id.startsWith("gaystream:");
}

function isGaystreamCatalog(id: string): boolean {
  return id.startsWith("gaystream-");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    next();
  });

  app.get("/manifest.json", (_req, res) => {
    const manifest = buildManifest();
    res.json(manifest);
  });

  app.get("/nurgay/manifest.json", (_req, res) => {
    const manifest = buildNurgayManifest();
    res.json(manifest);
  });

  app.get("/fxggxt/manifest.json", (_req, res) => {
    const manifest = buildFxggxtManifest();
    res.json(manifest);
  });

  app.get("/justthegays/manifest.json", (_req, res) => {
    const manifest = buildJustthegaysManifest();
    res.json(manifest);
  });

  app.get("/besthdgayporn/manifest.json", (_req, res) => {
    const manifest = buildBesthdgaypornManifest();
    res.json(manifest);
  });

  app.get("/boyfriendtv/manifest.json", (_req, res) => {
    const manifest = buildBoyfriendtvManifest();
    res.json(manifest);
  });

  app.get("/gaycock4u/manifest.json", (_req, res) => {
    const manifest = buildGaycock4uManifest();
    res.json(manifest);
  });

  app.get("/gaystream/manifest.json", (_req, res) => {
    const manifest = buildGaystreamManifest();
    res.json(manifest);
  });

  // BestHDgayporn dedicated routes
  app.get("/besthdgayporn/catalog/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;
      log(`BestHDgayporn catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "besthdgayporn-search" && search) {
        metas = await searchBesthdgaypornContent(search, skip);
      } else {
        metas = await getBesthdgaypornCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`BestHDgayporn catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/besthdgayporn/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;
      log(`BestHDgayporn catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "besthdgayporn-search" && search) {
        metas = await searchBesthdgaypornContent(search, skip);
      } else {
        metas = await getBesthdgaypornCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`BestHDgayporn catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/besthdgayporn/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`BestHDgayporn meta request: ${id}`, "stremio");
      const meta = await getBesthdgaypornMeta(id);
      if (!meta) return res.json({ meta: null });
      res.json({ meta });
    } catch (err: any) {
      log(`BestHDgayporn meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/besthdgayporn/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`BestHDgayporn stream request: ${id}`, "stremio");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const streams = await getBesthdgaypornStreams(id, baseUrl);
      res.json({ streams });
    } catch (err: any) {
      log(`BestHDgayporn stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  // BoyfriendTV dedicated routes
  app.get("/boyfriendtv/catalog/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;
      log(`BoyfriendTV catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "boyfriendtv-search" && search) {
        metas = await searchBoyfriendtvContent(search, skip);
      } else {
        metas = await getBoyfriendtvCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`BoyfriendTV catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/boyfriendtv/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;
      log(`BoyfriendTV catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "boyfriendtv-search" && search) {
        metas = await searchBoyfriendtvContent(search, skip);
      } else {
        metas = await getBoyfriendtvCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`BoyfriendTV catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/boyfriendtv/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`BoyfriendTV meta request: ${id}`, "stremio");
      const meta = await getBoyfriendtvMeta(id);
      if (!meta) return res.json({ meta: null });
      res.json({ meta });
    } catch (err: any) {
      log(`BoyfriendTV meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/boyfriendtv/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`BoyfriendTV stream request: ${id}`, "stremio");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const streams = await getBoyfriendtvStreams(id, baseUrl);
      res.json({ streams });
    } catch (err: any) {
      log(`BoyfriendTV stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  // Gaycock4U dedicated routes
  app.get("/gaycock4u/catalog/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;
      log(`Gaycock4U catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "gaycock4u-search" && search) {
        metas = await searchGaycock4uContent(search, skip);
      } else {
        metas = await getGaycock4uCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`Gaycock4U catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/gaycock4u/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;
      log(`Gaycock4U catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "gaycock4u-search" && search) {
        metas = await searchGaycock4uContent(search, skip);
      } else {
        metas = await getGaycock4uCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`Gaycock4U catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/gaycock4u/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Gaycock4U meta request: ${id}`, "stremio");
      const meta = await getGaycock4uMeta(id);
      if (!meta) return res.json({ meta: null });
      res.json({ meta });
    } catch (err: any) {
      log(`Gaycock4U meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/gaycock4u/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Gaycock4U stream request: ${id}`, "stremio");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const streams = await getGaycock4uStreams(id, baseUrl);
      res.json({ streams });
    } catch (err: any) {
      log(`Gaycock4U stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  // GayStream dedicated routes
  app.get("/gaystream/catalog/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;
      log(`GayStream catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "gaystream-search" && search) {
        metas = await searchGaystreamContent(search, skip);
      } else {
        metas = await getGaystreamCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`GayStream catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/gaystream/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;
      log(`GayStream catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");
      let metas;
      if (id === "gaystream-search" && search) {
        metas = await searchGaystreamContent(search, skip);
      } else {
        metas = await getGaystreamCatalog(id, skip);
      }
      res.json({ metas });
    } catch (err: any) {
      log(`GayStream catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/gaystream/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`GayStream meta request: ${id}`, "stremio");
      const meta = await getGaystreamMeta(id);
      if (!meta) return res.json({ meta: null });
      res.json({ meta });
    } catch (err: any) {
      log(`GayStream meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/gaystream/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`GayStream stream request: ${id}`, "stremio");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const streams = await getGaystreamStreams(id, baseUrl);
      res.json({ streams });
    } catch (err: any) {
      log(`GayStream stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  app.get("/justthegays/catalog/:type/:id.json", async (req, res) => {
    try {
      const { type, id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;

      log(`Justthegays catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "justthegays-search" && search) {
        metas = await searchJustthegaysContent(search, skip);
      } else {
        metas = await getJustthegaysCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Justthegays catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/justthegays/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { type, id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;

      log(`Justthegays catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "justthegays-search" && search) {
        metas = await searchJustthegaysContent(search, skip);
      } else {
        metas = await getJustthegaysCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Justthegays catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/justthegays/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Justthegays meta request: ${id}`, "stremio");
      const meta = await getJustthegaysMeta(id);
      if (!meta) {
        return res.json({ meta: null });
      }
      res.json({ meta });
    } catch (err: any) {
      log(`Justthegays meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/justthegays/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Justthegays stream request: ${id}`, "stremio");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const streams = await getJustthegaysStreams(id, baseUrl);
      res.json({ streams });
    } catch (err: any) {
      log(`Justthegays stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  app.get("/fxggxt/catalog/:type/:id.json", async (req, res) => {
    try {
      const { type, id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;

      log(`Fxggxt catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "fxggxt-search" && search) {
        metas = await searchFxggxtContent(search, skip);
      } else {
        metas = await getFxggxtCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Fxggxt catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/fxggxt/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { type, id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;

      log(`Fxggxt catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "fxggxt-search" && search) {
        metas = await searchFxggxtContent(search, skip);
      } else {
        metas = await getFxggxtCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Fxggxt catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/fxggxt/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Fxggxt meta request: ${id}`, "stremio");
      const meta = await getFxggxtMeta(id);
      if (!meta) {
        return res.json({ meta: null });
      }
      res.json({ meta });
    } catch (err: any) {
      log(`Fxggxt meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/fxggxt/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Fxggxt stream request: ${id}`, "stremio");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const streams = await getFxggxtStreams(id, baseUrl);
      res.json({ streams });
    } catch (err: any) {
      log(`Fxggxt stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  app.get("/nurgay/catalog/:type/:id.json", async (req, res) => {
    try {
      const { type, id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;

      log(`Nurgay catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "nurgay-search" && search) {
        metas = await searchNurgayContent(search, skip);
      } else {
        metas = await getNurgayCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Nurgay catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/nurgay/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { type, id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;

      log(`Nurgay catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "nurgay-search" && search) {
        metas = await searchNurgayContent(search, skip);
      } else {
        metas = await getNurgayCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Nurgay catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/nurgay/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Nurgay meta request: ${id}`, "stremio");
      const meta = await getNurgayMeta(id);
      if (!meta) {
        return res.json({ meta: null });
      }
      res.json({ meta });
    } catch (err: any) {
      log(`Nurgay meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/nurgay/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Nurgay stream request: ${id}`, "stremio");
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const streams = await getNurgayStreams(id, baseUrl);
      res.json({ streams });
    } catch (err: any) {
      log(`Nurgay stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  app.get("/catalog/:type/:id.json", async (req, res) => {
    try {
      const { type, id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;

      log(`Catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "nurgay-search" && search) {
        metas = await searchNurgayContent(search, skip);
      } else if (isNurgayCatalog(id)) {
        metas = await getNurgayCatalog(id, skip);
      } else if (id === "fxggxt-search" && search) {
        metas = await searchFxggxtContent(search, skip);
      } else if (isFxggxtCatalog(id)) {
        metas = await getFxggxtCatalog(id, skip);
      } else if (id === "justthegays-search" && search) {
        metas = await searchJustthegaysContent(search, skip);
      } else if (isJustthegaysCatalog(id)) {
        metas = await getJustthegaysCatalog(id, skip);
      } else if (id === "besthdgayporn-search" && search) {
        metas = await searchBesthdgaypornContent(search, skip);
      } else if (isBesthdgaypornCatalog(id)) {
        metas = await getBesthdgaypornCatalog(id, skip);
      } else if (id === "boyfriendtv-search" && search) {
        metas = await searchBoyfriendtvContent(search, skip);
      } else if (isBoyfriendtvCatalog(id)) {
        metas = await getBoyfriendtvCatalog(id, skip);
      } else if (id === "gaycock4u-search" && search) {
        metas = await searchGaycock4uContent(search, skip);
      } else if (isGaycock4uCatalog(id)) {
        metas = await getGaycock4uCatalog(id, skip);
      } else if (id === "gaystream-search" && search) {
        metas = await searchGaystreamContent(search, skip);
      } else if (isGaystreamCatalog(id)) {
        metas = await getGaystreamCatalog(id, skip);
      } else if (id === "gxtapes-search" && search) {
        metas = await searchContent(search, skip);
      } else {
        metas = await getCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/catalog/:type/:id/:extra.json", async (req, res) => {
    try {
      const { type, id, extra } = req.params;
      const extraPairs = parseStremioExtra(extra);
      const skip = parseInt(extraPairs.skip || "0", 10);
      const search = extraPairs.search || undefined;

      log(`Catalog request: ${id}, skip=${skip}, search=${search || "none"}`, "stremio");

      let metas;
      if (id === "nurgay-search" && search) {
        metas = await searchNurgayContent(search, skip);
      } else if (isNurgayCatalog(id)) {
        metas = await getNurgayCatalog(id, skip);
      } else if (id === "fxggxt-search" && search) {
        metas = await searchFxggxtContent(search, skip);
      } else if (isFxggxtCatalog(id)) {
        metas = await getFxggxtCatalog(id, skip);
      } else if (id === "justthegays-search" && search) {
        metas = await searchJustthegaysContent(search, skip);
      } else if (isJustthegaysCatalog(id)) {
        metas = await getJustthegaysCatalog(id, skip);
      } else if (id === "besthdgayporn-search" && search) {
        metas = await searchBesthdgaypornContent(search, skip);
      } else if (isBesthdgaypornCatalog(id)) {
        metas = await getBesthdgaypornCatalog(id, skip);
      } else if (id === "boyfriendtv-search" && search) {
        metas = await searchBoyfriendtvContent(search, skip);
      } else if (isBoyfriendtvCatalog(id)) {
        metas = await getBoyfriendtvCatalog(id, skip);
      } else if (id === "gaycock4u-search" && search) {
        metas = await searchGaycock4uContent(search, skip);
      } else if (isGaycock4uCatalog(id)) {
        metas = await getGaycock4uCatalog(id, skip);
      } else if (id === "gaystream-search" && search) {
        metas = await searchGaystreamContent(search, skip);
      } else if (isGaystreamCatalog(id)) {
        metas = await getGaystreamCatalog(id, skip);
      } else if (id === "gxtapes-search" && search) {
        metas = await searchContent(search, skip);
      } else {
        metas = await getCatalog(id, skip);
      }

      res.json({ metas });
    } catch (err: any) {
      log(`Catalog error: ${err.message}`, "stremio");
      res.json({ metas: [] });
    }
  });

  app.get("/meta/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Meta request: ${id}`, "stremio");

      let meta;
      if (isNurgayId(id)) {
        meta = await getNurgayMeta(id);
      } else if (isFxggxtId(id)) {
        meta = await getFxggxtMeta(id);
      } else if (isJustthegaysId(id)) {
        meta = await getJustthegaysMeta(id);
      } else if (isBesthdgaypornId(id)) {
        meta = await getBesthdgaypornMeta(id);
      } else if (isBoyfriendtvId(id)) {
        meta = await getBoyfriendtvMeta(id);
      } else if (isGaycock4uId(id)) {
        meta = await getGaycock4uMeta(id);
      } else if (isGaystreamId(id)) {
        meta = await getGaystreamMeta(id);
      } else {
        meta = await getMeta(id);
      }

      if (!meta) {
        return res.json({ meta: null });
      }
      res.json({ meta });
    } catch (err: any) {
      log(`Meta error: ${err.message}`, "stremio");
      res.json({ meta: null });
    }
  });

  app.get("/stream/:type/:id.json", async (req, res) => {
    try {
      const { id } = req.params;
      log(`Stream request: ${id}`, "stremio");

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      let streams;
      if (isNurgayId(id)) {
        streams = await getNurgayStreams(id, baseUrl);
      } else if (isFxggxtId(id)) {
        streams = await getFxggxtStreams(id, baseUrl);
      } else if (isJustthegaysId(id)) {
        streams = await getJustthegaysStreams(id, baseUrl);
      } else if (isBesthdgaypornId(id)) {
        streams = await getBesthdgaypornStreams(id, baseUrl);
      } else if (isBoyfriendtvId(id)) {
        streams = await getBoyfriendtvStreams(id, baseUrl);
      } else if (isGaycock4uId(id)) {
        streams = await getGaycock4uStreams(id, baseUrl);
      } else if (isGaystreamId(id)) {
        streams = await getGaystreamStreams(id, baseUrl);
      } else {
        streams = await getStreams(id);
      }

      res.json({ streams });
    } catch (err: any) {
      log(`Stream error: ${err.message}`, "stremio");
      res.json({ streams: [] });
    }
  });

  app.get("/proxy/stream", async (req, res) => {
    try {
      const streamUrl = req.query.url as string;
      const referer = req.query.referer as string || "";

      if (!streamUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      log(`Proxy stream: ${streamUrl}`, "stremio");

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
      };
      if (referer) {
        headers["Referer"] = referer;
      }

      const rangeHeader = req.headers.range;
      if (rangeHeader) {
        headers["Range"] = rangeHeader;
      }

      const response = await axios.get(streamUrl, {
        headers,
        responseType: "stream",
        timeout: 30000,
        maxRedirects: 5,
      });

      res.setHeader("Content-Type", response.headers["content-type"] || "video/mp4");
      if (response.headers["content-length"]) {
        res.setHeader("Content-Length", response.headers["content-length"]);
      }
      if (response.headers["content-range"]) {
        res.setHeader("Content-Range", response.headers["content-range"]);
      }
      if (response.headers["accept-ranges"]) {
        res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);
      }
      res.status(response.status);

      response.data.pipe(res);

      response.data.on("error", (err: any) => {
        log(`Proxy stream pipe error: ${err.message}`, "stremio");
        if (!res.headersSent) {
          res.status(502).json({ error: "Stream error" });
        }
      });
    } catch (err: any) {
      log(`Proxy stream error: ${err.message}`, "stremio");
      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to proxy stream" });
      }
    }
  });

  app.get("/api/status", (_req, res) => {
    const allManifests = [
      { manifest: buildManifest(), path: "/manifest.json" },
      { manifest: buildNurgayManifest(), path: "/nurgay/manifest.json" },
      { manifest: buildFxggxtManifest(), path: "/fxggxt/manifest.json" },
      { manifest: buildJustthegaysManifest(), path: "/justthegays/manifest.json" },
      { manifest: buildBesthdgaypornManifest(), path: "/besthdgayporn/manifest.json" },
      { manifest: buildBoyfriendtvManifest(), path: "/boyfriendtv/manifest.json" },
      { manifest: buildGaycock4uManifest(), path: "/gaycock4u/manifest.json" },
      { manifest: buildGaystreamManifest(), path: "/gaystream/manifest.json" },
    ];
    const cacheStats = getCacheStats();
    const totalCatalogs = allManifests.reduce((sum, m) => sum + m.manifest.catalogs.length, 0);
    res.json({
      name: "Stremio Add-ons",
      version: "1.0.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      catalogs: totalCatalogs,
      cacheStats,
      addons: allManifests.map(({ manifest, path }) => ({
        name: manifest.name,
        version: manifest.version,
        catalogs: manifest.catalogs.length,
        manifestPath: path,
      })),
      endpoints: allManifests.map(({ manifest, path }) => ({
        path,
        description: `${manifest.name} manifest`,
      })).concat([
        { path: "/catalog/movie/{catalogId}.json", description: "Browse catalogs" },
        { path: "/meta/movie/{id}.json", description: "Content metadata" },
        { path: "/stream/movie/{id}.json", description: "Stream links" },
      ]),
    });
  });

  app.get("/api/catalogs", (_req, res) => {
    res.json({
      gxtapes: buildManifest().catalogs,
      nurgay: buildNurgayManifest().catalogs,
      fxggxt: buildFxggxtManifest().catalogs,
      justthegays: buildJustthegaysManifest().catalogs,
      besthdgayporn: buildBesthdgaypornManifest().catalogs,
      boyfriendtv: buildBoyfriendtvManifest().catalogs,
      gaycock4u: buildGaycock4uManifest().catalogs,
      gaystream: buildGaystreamManifest().catalogs,
    });
  });

  app.get("/api/catalog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const skip = parseInt((req.query as any).skip || "0", 10);
      const search = (req.query as any).search as string | undefined;

      let items;
      if (id === "nurgay-search" && search) {
        items = await searchNurgayContent(search, skip);
      } else if (isNurgayCatalog(id)) {
        items = await getNurgayCatalog(id, skip);
      } else if (id === "fxggxt-search" && search) {
        items = await searchFxggxtContent(search, skip);
      } else if (isFxggxtCatalog(id)) {
        items = await getFxggxtCatalog(id, skip);
      } else if (id === "justthegays-search" && search) {
        items = await searchJustthegaysContent(search, skip);
      } else if (isJustthegaysCatalog(id)) {
        items = await getJustthegaysCatalog(id, skip);
      } else if (id === "besthdgayporn-search" && search) {
        items = await searchBesthdgaypornContent(search, skip);
      } else if (isBesthdgaypornCatalog(id)) {
        items = await getBesthdgaypornCatalog(id, skip);
      } else if (id === "boyfriendtv-search" && search) {
        items = await searchBoyfriendtvContent(search, skip);
      } else if (isBoyfriendtvCatalog(id)) {
        items = await getBoyfriendtvCatalog(id, skip);
      } else if (id === "gaycock4u-search" && search) {
        items = await searchGaycock4uContent(search, skip);
      } else if (isGaycock4uCatalog(id)) {
        items = await getGaycock4uCatalog(id, skip);
      } else if (id === "gaystream-search" && search) {
        items = await searchGaystreamContent(search, skip);
      } else if (isGaystreamCatalog(id)) {
        items = await getGaystreamCatalog(id, skip);
      } else if (id === "gxtapes-search" && search) {
        items = await searchContent(search, skip);
      } else {
        items = await getCatalog(id, skip);
      }
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/meta/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let meta;
      if (isNurgayId(id)) {
        meta = await getNurgayMeta(id);
      } else if (isFxggxtId(id)) {
        meta = await getFxggxtMeta(id);
      } else if (isJustthegaysId(id)) {
        meta = await getJustthegaysMeta(id);
      } else if (isBesthdgaypornId(id)) {
        meta = await getBesthdgaypornMeta(id);
      } else if (isBoyfriendtvId(id)) {
        meta = await getBoyfriendtvMeta(id);
      } else if (isGaycock4uId(id)) {
        meta = await getGaycock4uMeta(id);
      } else if (isGaystreamId(id)) {
        meta = await getGaystreamMeta(id);
      } else {
        meta = await getMeta(id);
      }
      res.json(meta);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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
      const host = `${req.protocol}://${req.get("host")}`;

      const rewritten = m3u8Text.split("\n").map((line: string) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          // Rewrite URI= attributes in tags like #EXT-X-KEY:URI="..."
          return line.replace(/URI="([^"]+)"/gi, (_match: string, uri: string) => {
            const absUri = uri.startsWith("http") ? uri : uri.startsWith("//") ? `https:${uri}` : `${baseM3u8Url}${uri}`;
            const params = new URLSearchParams({ url: absUri, referer: m3u8Url });
            return `URI="${host}/proxy/stream?${params.toString()}"`;
          });
        }
        // It's a segment or sub-playlist URL
        const absUrl = trimmed.startsWith("http") ? trimmed : trimmed.startsWith("//") ? `https:${trimmed}` : `${baseM3u8Url}${trimmed}`;
        const isSubPlaylist = absUrl.includes(".m3u8");
        if (isSubPlaylist) {
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

    const AD_BLOCK_CSS = `
<style id="sf-adblock">
  /* StreamFlix AdBlock: hide ad containers */
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

    const AD_BLOCK_JS = `
<script id="sf-adblock-js">
(function(){
  // Block window.open (popup/popunder ads)
  window.open = function(){ return {focus:function(){},blur:function(){},closed:false,location:{href:''}}; };
  // Block onbeforeunload redirect tricks
  window.onbeforeunload = null;
  Object.defineProperty(window,'onbeforeunload',{set:function(){}});
  // Prevent location redirect used by some ad scripts
  var _loc = window.location;
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
  // Remove ad elements periodically
  var adSelectors=[
    'ins.adsbygoogle','.adsbygoogle',
    '[id^="google_ads"],[id^="aswift"]',
    'iframe[src*="googlesyndication"]','iframe[src*="doubleclick"]',
    'iframe[src*="exoclick"]','iframe[src*="juicyads"]',
    '[class*="popunder"],[class*="pop-up-"]'
  ];
  function removeAds(){
    adSelectors.forEach(function(sel){
      try{ document.querySelectorAll(sel).forEach(function(el){ el.remove(); }); }catch(e){}
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',removeAds);
  } else { removeAds(); }
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

      // Detect Cloudflare challenges / bot-detection pages — redirect browser to handle directly
      const isCfChallenge =
        body.includes("__cf_chl_opt") ||
        body.includes("cf-browser-verification") ||
        body.includes("cf_chl_prog") ||
        body.includes("challenge-platform") ||
        (response.headers["cf-mitigated"] === "challenge") ||
        (body.includes("Verifying") && body.includes("Cloudflare")) ||
        (response.status === 403 && !!response.headers["cf-ray"]);

      if (isCfChallenge) {
        log(`Cloudflare challenge detected, redirecting directly: ${embedUrl}`, "stremio");
        return res.redirect(302, embedUrl);
      }

      const embedOrigin = new URL(embedUrl).origin;

      // Strip framing restrictions and CSP meta tags
      let cleaned = body
        .replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, "")
        .replace(/<meta[^>]*content-security-policy[^>]*>/gi, "");

      // Remove known ad network script tags
      for (const domain of AD_BLOCK_DOMAINS) {
        const adScriptRe = new RegExp(`<script[^>]+src=["'][^"']*${domain.replace(".", "\\.")}[^"']*["'][^>]*>[\\s\\S]*?<\\/script>`, "gi");
        cleaned = cleaned.replace(adScriptRe, "<!-- sf-adblocked -->");
        const adScriptSelf = new RegExp(`<script[^>]+src=["'][^"']*${domain.replace(".", "\\.")}[^"']*["'][^>]*\\/?>`, "gi");
        cleaned = cleaned.replace(adScriptSelf, "<!-- sf-adblocked />");
      }

      // Inject base tag + ad-blocking CSS + ad-blocking JS right after <head>
      const injection = `<base href="${embedOrigin}/">${AD_BLOCK_CSS}${AD_BLOCK_JS}`;
      let final: string;
      if (cleaned.includes("<base ")) {
        final = cleaned.replace(/<head([^>]*)>/i, `<head$1>${AD_BLOCK_CSS}${AD_BLOCK_JS}`);
      } else {
        final = cleaned.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
      }
      if (!final.includes("<head")) {
        final = AD_BLOCK_CSS + AD_BLOCK_JS + final;
      }

      res.send(final);
    } catch (err: any) {
      log(`Embed proxy failed (${err.response?.status ?? err.code}), redirecting: ${embedUrl}`, "stremio");
      // Fall back to a redirect so the browser loads the page directly (video still works)
      res.redirect(302, embedUrl);
    }
  });

  app.post("/api/cache/clear", (_req, res) => {
    clearAllCaches();
    res.json({ success: true });
  });

  return httpServer;
}
