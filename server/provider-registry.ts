import {
  getCatalog, searchContent, getMeta, getStreams,
} from "./stremio/provider";
import {
  getNurgayCatalog, searchNurgayContent, getNurgayMeta, getNurgayStreams,
} from "./nurgay/provider";
import {
  getFxggxtCatalog, searchFxggxtContent, getFxggxtMeta, getFxggxtStreams,
} from "./fxggxt/provider";
import {
  getJustthegaysCatalog, searchJustthegaysContent, getJustthegaysMeta, getJustthegaysStreams,
} from "./justthegays/provider";
import {
  getBesthdgaypornCatalog, searchBesthdgaypornContent, getBesthdgaypornMeta, getBesthdgaypornStreams,
} from "./besthdgayporn/provider";
import {
  getBoyfriendtvCatalog, searchBoyfriendtvContent, getBoyfriendtvMeta, getBoyfriendtvStreams,
} from "./boyfriendtv/provider";
import {
  getGaycock4uCatalog, searchGaycock4uContent, getGaycock4uMeta, getGaycock4uStreams,
} from "./gaycock4u/provider";
import {
  getGaystreamCatalog, searchGaystreamContent, getGaystreamMeta, getGaystreamStreams,
} from "./gaystream/provider";
import { buildManifest } from "./stremio/manifest";
import { buildNurgayManifest } from "./nurgay/manifest";
import { buildFxggxtManifest } from "./fxggxt/manifest";
import { buildJustthegaysManifest } from "./justthegays/manifest";
import { buildBesthdgaypornManifest } from "./besthdgayporn/manifest";
import { buildBoyfriendtvManifest } from "./boyfriendtv/manifest";
import { buildGaycock4uManifest } from "./gaycock4u/manifest";
import { buildGaystreamManifest } from "./gaystream/manifest";
import type { CatalogItem, StremioMeta, StremioStream } from "../shared/schema";

export interface ProviderDefinition {
  prefix: string;
  manifestPath: string;
  buildManifest: () => any;
  getCatalog: (id: string, skip: number) => Promise<CatalogItem[]>;
  searchContent: (query: string, skip: number) => Promise<CatalogItem[]>;
  getMeta: (id: string) => Promise<StremioMeta | null>;
  getStreams: (id: string, baseUrl: string) => Promise<StremioStream[]>;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    prefix: "nurgay",
    manifestPath: "/nurgay/manifest.json",
    buildManifest: buildNurgayManifest,
    getCatalog: getNurgayCatalog,
    searchContent: searchNurgayContent,
    getMeta: getNurgayMeta,
    getStreams: (id, baseUrl) => getNurgayStreams(id, baseUrl),
  },
  {
    prefix: "fxggxt",
    manifestPath: "/fxggxt/manifest.json",
    buildManifest: buildFxggxtManifest,
    getCatalog: getFxggxtCatalog,
    searchContent: searchFxggxtContent,
    getMeta: getFxggxtMeta,
    getStreams: (id, baseUrl) => getFxggxtStreams(id, baseUrl),
  },
  {
    prefix: "justthegays",
    manifestPath: "/justthegays/manifest.json",
    buildManifest: buildJustthegaysManifest,
    getCatalog: getJustthegaysCatalog,
    searchContent: searchJustthegaysContent,
    getMeta: getJustthegaysMeta,
    getStreams: (id, baseUrl) => getJustthegaysStreams(id, baseUrl),
  },
  {
    prefix: "besthdgayporn",
    manifestPath: "/besthdgayporn/manifest.json",
    buildManifest: buildBesthdgaypornManifest,
    getCatalog: getBesthdgaypornCatalog,
    searchContent: searchBesthdgaypornContent,
    getMeta: getBesthdgaypornMeta,
    getStreams: (id, baseUrl) => getBesthdgaypornStreams(id, baseUrl),
  },
  {
    prefix: "boyfriendtv",
    manifestPath: "/boyfriendtv/manifest.json",
    buildManifest: buildBoyfriendtvManifest,
    getCatalog: getBoyfriendtvCatalog,
    searchContent: searchBoyfriendtvContent,
    getMeta: getBoyfriendtvMeta,
    getStreams: (id, baseUrl) => getBoyfriendtvStreams(id, baseUrl),
  },
  {
    prefix: "gaycock4u",
    manifestPath: "/gaycock4u/manifest.json",
    buildManifest: buildGaycock4uManifest,
    getCatalog: getGaycock4uCatalog,
    searchContent: searchGaycock4uContent,
    getMeta: getGaycock4uMeta,
    getStreams: (id, baseUrl) => getGaycock4uStreams(id, baseUrl),
  },
  {
    prefix: "gaystream",
    manifestPath: "/gaystream/manifest.json",
    buildManifest: buildGaystreamManifest,
    getCatalog: getGaystreamCatalog,
    searchContent: searchGaystreamContent,
    getMeta: getGaystreamMeta,
    getStreams: (id, baseUrl) => getGaystreamStreams(id, baseUrl),
  },
];

export const GXTAPES_PROVIDER: ProviderDefinition = {
  prefix: "gxtapes",
  manifestPath: "/manifest.json",
  buildManifest: buildManifest,
  getCatalog: getCatalog,
  searchContent: searchContent,
  getMeta: getMeta,
  getStreams: (id, baseUrl) => getStreams(id, baseUrl),
};

export const ALL_PROVIDERS = [GXTAPES_PROVIDER, ...PROVIDERS];

export function resolveProviderById(id: string): ProviderDefinition {
  const match = PROVIDERS.find(p => id.startsWith(`${p.prefix}:`));
  return match ?? GXTAPES_PROVIDER;
}

export function resolveProviderByCatalog(catalogId: string): ProviderDefinition {
  const match = PROVIDERS.find(p => catalogId.startsWith(`${p.prefix}-`));
  return match ?? GXTAPES_PROVIDER;
}

export async function resolveStreams(
  id: string,
  baseUrl: string,
): Promise<StremioStream[]> {
  const provider = resolveProviderById(id);
  return provider.getStreams(id, baseUrl);
}

export async function resolveMeta(id: string): Promise<StremioMeta | null> {
  const provider = resolveProviderById(id);
  return provider.getMeta(id);
}

export async function resolveCatalog(
  catalogId: string,
  skip: number,
  search?: string,
): Promise<CatalogItem[]> {
  const provider = resolveProviderByCatalog(catalogId);
  const searchCatalogId = `${provider.prefix}-search`;
  if (catalogId === searchCatalogId && search) {
    return provider.searchContent(search, skip);
  }
  return provider.getCatalog(catalogId, skip);
}
