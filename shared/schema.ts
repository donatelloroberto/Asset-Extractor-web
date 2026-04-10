import { z } from "zod";

export const stremioMetaSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  poster: z.string().optional(),
  posterShape: z.string().optional(),
  background: z.string().optional(),
  description: z.string().optional(),
  genres: z.array(z.string()).optional(),
  releaseInfo: z.string().optional(),
  runtime: z.string().optional(),
  links: z.array(z.object({
    name: z.string(),
    category: z.string(),
    url: z.string(),
  })).optional(),
});

export const stremioStreamSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
  externalUrl: z.string().optional(),
  playerFrameUrl: z.string().optional(),
  behaviorHints: z.object({
    notWebReady: z.boolean().optional(),
    bingeGroup: z.string().optional(),
    proxyHeaders: z.object({
      request: z.record(z.string()).optional(),
    }).optional(),
  }).optional(),
});

export const catalogItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  poster: z.string().optional(),
  type: z.string(),
});

export const addonStatusSchema = z.object({
  name: z.string(),
  version: z.string(),
  uptime: z.number(),
  catalogs: z.number(),
  cacheStats: z.object({
    hits: z.number(),
    misses: z.number(),
    keys: z.number(),
  }),
  endpoints: z.array(z.object({
    path: z.string(),
    description: z.string(),
  })),
});

export type StremioMeta = z.infer<typeof stremioMetaSchema>;
export type StremioStream = z.infer<typeof stremioStreamSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type AddonStatus = z.infer<typeof addonStatusSchema>;
