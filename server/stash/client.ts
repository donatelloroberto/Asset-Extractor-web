import axios from "axios";
import type { StashConfig } from "./manifest.js";
import { log } from "../logger.js";

const isDebug = () => process.env.DEBUG === "1";

export interface StashScene {
  id: string;
  title: string | null;
  details: string | null;
  date: string | null;
  rating100: number | null;
  organized: boolean;
  play_count: number | null;
  play_duration: number | null;
  last_played_at: string | null;
  created_at: string;
  updated_at: string;
  files: Array<{
    id: string;
    path: string;
    basename: string;
    size: number;
    duration: number;
    video_codec: string;
    audio_codec: string;
    width: number;
    height: number;
    frame_rate: number;
    bit_rate: number;
  }>;
  paths: {
    screenshot: string | null;
    preview: string | null;
    stream: string | null;
    webp: string | null;
    sprite: string | null;
  };
  studio: {
    id: string;
    name: string;
    image_path: string | null;
  } | null;
  performers: Array<{
    id: string;
    name: string;
    image_path: string | null;
    gender: string | null;
  }>;
  tags: Array<{
    id: string;
    name: string;
  }>;
  sceneStreams: Array<{
    url: string;
    mime_type: string | null;
    label: string | null;
  }>;
}

interface FindScenesResult {
  count: number;
  scenes: StashScene[];
}

const SCENE_FRAGMENT = `
  fragment SceneData on Scene {
    id
    title
    details
    date
    rating100
    organized
    play_count
    play_duration
    last_played_at
    created_at
    updated_at
    files {
      id
      path
      basename
      size
      duration
      video_codec
      audio_codec
      width
      height
      frame_rate
      bit_rate
    }
    paths {
      screenshot
      preview
      stream
      webp
      sprite
    }
    studio {
      id
      name
      image_path
    }
    performers {
      id
      name
      image_path
      gender
    }
    tags {
      id
      name
    }
    sceneStreams {
      url
      mime_type
      label
    }
  }
`;

async function gqlRequest<T>(config: StashConfig, query: string, variables?: Record<string, any>): Promise<T> {
  const url = `${config.serverUrl}/graphql`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["ApiKey"] = config.apiKey;
  }

  if (isDebug()) {
    log(`Stash GQL request to ${config.serverUrl}`, "stash");
  }

  const resp = await axios.post(url, { query, variables }, {
    headers,
    timeout: 15000,
  });

  if (resp.data.errors?.length) {
    const errMsg = resp.data.errors.map((e: any) => e.message).join("; ");
    throw new Error(`Stash GraphQL error: ${errMsg}`);
  }

  return resp.data.data;
}

export async function findScenes(
  config: StashConfig,
  opts: {
    filter?: {
      q?: string;
      page?: number;
      per_page?: number;
      sort?: string;
      direction?: "ASC" | "DESC";
    };
    sceneFilter?: Record<string, any>;
  } = {}
): Promise<FindScenesResult> {
  const query = `
    ${SCENE_FRAGMENT}
    query FindScenes($filter: FindFilterType, $scene_filter: SceneFilterType) {
      findScenes(filter: $filter, scene_filter: $scene_filter) {
        count
        scenes {
          ...SceneData
        }
      }
    }
  `;

  const variables: Record<string, any> = {};

  if (opts.filter) {
    variables.filter = {
      q: opts.filter.q || "",
      page: opts.filter.page || 1,
      per_page: opts.filter.per_page || 25,
      sort: opts.filter.sort || "created_at",
      direction: opts.filter.direction || "DESC",
    };
  } else {
    variables.filter = {
      page: 1,
      per_page: 25,
      sort: "created_at",
      direction: "DESC",
    };
  }

  if (opts.sceneFilter) {
    variables.scene_filter = opts.sceneFilter;
  }

  const data = await gqlRequest<{ findScenes: FindScenesResult }>(config, query, variables);
  return data.findScenes;
}

export async function findScene(config: StashConfig, sceneId: string): Promise<StashScene | null> {
  const query = `
    ${SCENE_FRAGMENT}
    query FindScene($id: ID!) {
      findScene(id: $id) {
        ...SceneData
      }
    }
  `;

  const data = await gqlRequest<{ findScene: StashScene | null }>(config, query, { id: sceneId });
  return data.findScene;
}

export async function getSceneStreams(config: StashConfig, sceneId: string): Promise<Array<{ url: string; mime_type: string | null; label: string | null }>> {
  const query = `
    query SceneStreams($id: ID) {
      sceneStreams(id: $id) {
        url
        mime_type
        label
      }
    }
  `;

  const data = await gqlRequest<{ sceneStreams: Array<{ url: string; mime_type: string | null; label: string | null }> }>(config, query, { id: sceneId });
  return data.sceneStreams;
}

export async function getStats(config: StashConfig): Promise<{ scene_count: number; scenes_duration: number }> {
  const query = `
    query Stats {
      stats {
        scene_count
        scenes_duration
      }
    }
  `;

  const data = await gqlRequest<{ stats: { scene_count: number; scenes_duration: number } }>(config, query);
  return data.stats;
}
