import type { StremioManifest } from "../stremio/manifest.js";

export interface StashConfig {
  serverUrl: string;
  apiKey: string;
}

export function encodeStashConfig(config: StashConfig): string {
  return Buffer.from(JSON.stringify(config)).toString("base64url");
}

export function decodeStashConfig(encoded: string): StashConfig {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed.serverUrl || typeof parsed.serverUrl !== "string") {
      throw new Error("Missing serverUrl");
    }
    const url = new URL(parsed.serverUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol - must be http or https");
    }
    return {
      serverUrl: parsed.serverUrl.replace(/\/+$/, ""),
      apiKey: parsed.apiKey || "",
    };
  } catch (err: any) {
    if (err.message?.includes("protocol") || err.message?.includes("Missing")) {
      throw err;
    }
    throw new Error("Invalid Stash configuration");
  }
}

function getStashCatalogs(): StremioManifest["catalogs"] {
  return [
    {
      type: "movie",
      id: "stash-search",
      name: "Stash Search",
      extra: [
        { name: "search", isRequired: true },
        { name: "skip" },
      ],
    },
    {
      type: "movie",
      id: "stash-recent",
      name: "Stash - Recently Added",
      extra: [{ name: "skip" }],
    },
    {
      type: "movie",
      id: "stash-played",
      name: "Stash - Recently Played",
      extra: [{ name: "skip" }],
    },
    {
      type: "movie",
      id: "stash-most-played",
      name: "Stash - Most Played",
      extra: [{ name: "skip" }],
    },
    {
      type: "movie",
      id: "stash-highest-rated",
      name: "Stash - Highest Rated",
      extra: [{ name: "skip" }],
    },
    {
      type: "movie",
      id: "stash-random",
      name: "Stash - Random",
      extra: [{ name: "skip" }],
    },
  ];
}

export function buildStashManifest(config?: StashConfig): StremioManifest {
  if (!config) {
    return {
      id: "community.stash.stremio",
      version: "1.0.0",
      name: "Stash",
      description: "Browse and stream your self-hosted Stash library through Stremio. Visit /stash/configure to set up your Stash server URL and API key.",
      resources: [],
      types: ["movie"],
      catalogs: [],
      idPrefixes: ["stash:"],
      behaviorHints: {
        adult: true,
        configurable: true,
      },
    };
  }

  let serverLabel = "";
  try { serverLabel = ` (${new URL(config.serverUrl).hostname})`; } catch {}

  return {
    id: "community.stash.stremio",
    version: "1.0.0",
    name: `Stash${serverLabel}`,
    description: "Browse and stream your self-hosted Stash library through Stremio.",
    resources: ["catalog", "meta", "stream"],
    types: ["movie"],
    catalogs: getStashCatalogs(),
    idPrefixes: ["stash:"],
    behaviorHints: {
      adult: true,
      configurable: true,
    },
  };
}
