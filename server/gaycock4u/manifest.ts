import type { StremioManifest } from "../stremio/manifest";

export const GAYCOCK4U_CATALOG_MAP: Record<string, { path: string; name: string }> = {
  "gaycock4u-latest": { path: "/", name: "GC4U-Latest Updates" },
  "gaycock4u-amateur": { path: "/category/amateur/", name: "GC4U-Amateur" },
  "gaycock4u-bareback": { path: "/category/bareback/", name: "GC4U-Bareback" },
  "gaycock4u-bigcock": { path: "/category/bigcock/", name: "GC4U-Big Cock" },
  "gaycock4u-group": { path: "/category/group/", name: "GC4U-Group" },
  "gaycock4u-hardcore": { path: "/category/hardcore/", name: "GC4U-Hardcore" },
  "gaycock4u-latino": { path: "/category/latino/", name: "GC4U-Latino" },
  "gaycock4u-interracial": { path: "/category/interracial/", name: "GC4U-Interracial" },
  "gaycock4u-twink": { path: "/category/twink/", name: "GC4U-Twink" },
  "gaycock4u-asianetwork": { path: "/studio/asianetwork/", name: "GC4U-Asianetwork" },
  "gaycock4u-bromo": { path: "/studio/bromo/", name: "GC4U-Bromo" },
  "gaycock4u-latinonetwork": { path: "/studio/latinonetwork/", name: "GC4U-Latino Network" },
  "gaycock4u-lucasentertainment": { path: "/studio/lucasentertainment/", name: "GC4U-Lucas Entertainment" },
  "gaycock4u-onlyfans": { path: "/studio/onlyfans/", name: "GC4U-Onlyfans" },
  "gaycock4u-rawfuckclub": { path: "/studio/rawfuckclub/", name: "GC4U-Raw Fuck Club" },
  "gaycock4u-ragingstallion": { path: "/studio/ragingstallion/", name: "GC4U-Ragingstallion" },
};

export function buildGaycock4uManifest(): StremioManifest {
  const catalogs: StremioManifest["catalogs"] = Object.entries(GAYCOCK4U_CATALOG_MAP).map(([id, { name }]) => ({
    type: "movie",
    id,
    name,
    extra: [
      { name: "skip" },
    ],
  }));

  catalogs.unshift({
    type: "movie",
    id: "gaycock4u-search",
    name: "Gaycock4U Search",
    extra: [
      { name: "search", isRequired: true },
      { name: "skip" },
    ],
  });

  return {
    id: "community.gaycock4u.stremio",
    version: "1.0.0",
    name: "Gaycock4U",
    description: "Gaycock4U content provider for Stremio - converted from Cloudstream 3 extension",
    resources: ["catalog", "meta", "stream"],
    types: ["movie"],
    catalogs,
    idPrefixes: ["gaycock4u:"],
    behaviorHints: {
      adult: true,
      configurable: false,
    },
  };
}
