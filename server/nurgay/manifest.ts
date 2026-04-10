import type { StremioManifest } from "../stremio/manifest";

export const NURGAY_CATALOG_MAP: Record<string, { path: string; name: string; isQuery?: boolean }> = {
  "nurgay-latest": { path: "/?filter=latest", name: "NurG-Latest", isQuery: true },
  "nurgay-most-viewed": { path: "/?filter=most-viewed", name: "NurG-Most Viewed", isQuery: true },
  "nurgay-amateur": { path: "/amateur/", name: "NurG-Amateur" },
  "nurgay-anal": { path: "/anal/", name: "NurG-Anal" },
  "nurgay-animation": { path: "/animation/", name: "NurG-Animation" },
  "nurgay-arab": { path: "/araber/", name: "NurG-Araber" },
  "nurgay-asian": { path: "/asiaten/", name: "NurG-Asian" },
  "nurgay-bareback": { path: "/bareback/", name: "NurG-Bareback" },
  "nurgay-bears": { path: "/baeren/", name: "NurG-Bears" },
  "nurgay-bdsm": { path: "/bdsm-fetisch/", name: "NurG-BDSM / Fetisch" },
  "nurgay-bisex": { path: "/bisex/", name: "NurG-Bisexual" },
  "nurgay-blowjob": { path: "/blowjob/", name: "NurG-Blowjob" },
  "nurgay-clips": { path: "/clips/", name: "NurG-Clips" },
  "nurgay-compilation": { path: "/compilation/", name: "NurG-Compilation" },
  "nurgay-cross-dressing": { path: "/cross-dressing/", name: "NurG-Cross Dressing" },
  "nurgay-cross-generation": { path: "/cross-generation/", name: "NurG-Cross Generation" },
  "nurgay-cumshot": { path: "/cumshot/", name: "NurG-CumShot" },
  "nurgay-daddy": { path: "/daddy/", name: "NurG-Daddy" },
  "nurgay-deutsch": { path: "/deutsch-german/", name: "NurG-Deutsch / German" },
  "nurgay-fisting": { path: "/fisting/", name: "NurG-Fisting" },
  "nurgay-feet": { path: "/fuesse-feet/", name: "NurG-Feet / Socks" },
  "nurgay-groupsex": { path: "/gruppensex/", name: "NurG-Group Sex" },
  "nurgay-hairy": { path: "/harrig/", name: "NurG-Hairy" },
  "nurgay-hunks": { path: "/hunks/", name: "NurG-Hunks" },
  "nurgay-interracial": { path: "/interracial/", name: "NurG-Interracial" },
  "nurgay-kinky": { path: "/kinky/", name: "NurG-Kinky" },
  "nurgay-latino": { path: "/latino/", name: "NurG-Latino" },
  "nurgay-leather": { path: "/leder/", name: "NurG-Leather" },
  "nurgay-muscle": { path: "/muskeln/", name: "NurG-Muscle" },
  "nurgay-piss": { path: "/natursekt/", name: "NurG-Natursekt" },
  "nurgay-outdoor": { path: "/public-outdoor/", name: "NurG-Public / Outdoor" },
  "nurgay-black": { path: "/schoko/", name: "NurG-Black" },
  "nurgay-solo": { path: "/solo/", name: "NurG-Solo" },
  "nurgay-cumplay": { path: "/sperma-cumshot/", name: "NurG-Sperma & Cumshot" },
  "nurgay-trans": { path: "/trans/", name: "NurG-Trans" },
  "nurgay-twinks": { path: "/twinks/", name: "NurG-Twinks" },
  "nurgay-uniform": { path: "/uniform/", name: "NurG-Uniform" },
  "nurgay-unsorted": { path: "/gay-pornos/", name: "NurG-Unsorted" },
  "nurgay-vintage": { path: "/vintage/", name: "NurG-Vintage" },
  "nurgay-twins": { path: "/zwillinge/", name: "NurG-Twins" },
};

export function buildNurgayManifest(): StremioManifest {
  const catalogs: StremioManifest["catalogs"] = Object.entries(NURGAY_CATALOG_MAP).map(([id, { name }]) => ({
    type: "movie",
    id,
    name,
    extra: [
      { name: "skip" },
    ],
  }));

  catalogs.unshift({
    type: "movie",
    id: "nurgay-search",
    name: "Nurgay Search",
    extra: [
      { name: "search", isRequired: true },
      { name: "skip" },
    ],
  });

  return {
    id: "community.nurgay.stremio",
    version: "1.0.0",
    name: "Nurgay",
    description: "Nurgay content provider for Stremio - converted from Cloudstream 3 extension",
    resources: ["catalog", "meta", "stream"],
    types: ["movie"],
    catalogs,
    idPrefixes: ["nurgay:"],
    behaviorHints: {
      adult: true,
      configurable: false,
    },
  };
}
