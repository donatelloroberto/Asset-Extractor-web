import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import https from "https";
import vm from "vm";

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

const INSECURE_HOSTS = [
  "ds2video.com",
  "d0o0d.com",
  "d-s.io",
  "doodstream.com",
  "dsvplay.com",
  "vide0.net",
  "myvidplay.com",
  "bigwarp.io",
  "bigwarp.cc",
  "bgwp.cc",
  "vidoza.net",
  "filemoon.to",
  "filemoon.sx",
  "vinovo.to",
  "vinovo.si",
  "voe.sx",
  "voe.to",
  "streamtape.to",
];

function needsInsecureAgent(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return INSECURE_HOSTS.some(h => hostname.includes(h));
  } catch {
    return false;
  }
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const isDebug = () => process.env.DEBUG === "1";

export async function fetchPage(url: string, options: {
  referer?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  timeout?: number;
} = {}): Promise<string> {
  const { referer, headers = {}, maxRetries = 3, timeout = 15000 } = options;

  const config: AxiosRequestConfig = {
    timeout,
    headers: {
      "User-Agent": getRandomUA(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      ...(referer ? { Referer: referer } : {}),
      ...headers,
    },
    maxRedirects: 5,
    ...(needsInsecureAgent(url) ? { httpsAgent: insecureAgent } : {}),
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (isDebug()) console.log(`[HTTP] GET ${url} (attempt ${attempt})`);

      const probeConfig = { ...config, maxRedirects: 0, validateStatus: () => true };
      const probeResponse: AxiosResponse = await axios.get(url, probeConfig);
      const probeHtml = typeof probeResponse.data === "string" ? probeResponse.data : String(probeResponse.data);

      const sucuriCookie = solveSucuriChallenge(probeHtml);
      if (sucuriCookie) {
        if (isDebug()) console.log(`[HTTP] Sucuri challenge detected (status ${probeResponse.status}), solving...`);
        const existingCookies = (config.headers?.Cookie as string) || "";
        const newConfig = {
          ...config,
          headers: {
            ...config.headers,
            Cookie: existingCookies ? `${existingCookies}; ${sucuriCookie}` : sucuriCookie,
          },
        };
        const retryResponse: AxiosResponse = await axios.get(url, newConfig);
        return typeof retryResponse.data === "string" ? retryResponse.data : String(retryResponse.data);
      }

      if (probeResponse.status >= 300 && probeResponse.status < 400) {
        const response: AxiosResponse = await axios.get(url, config);
        return typeof response.data === "string" ? response.data : String(response.data);
      }

      if (probeResponse.status >= 400) {
        if (probeHtml.includes("DDoS-Guard") || probeHtml.includes("ddos-guard")) {
          if (isDebug()) console.log(`[HTTP] DDoS-Guard challenge on ${url} - cannot bypass server-side`);
          return probeHtml;
        }
        throw new Error(`HTTP ${probeResponse.status} for ${url}`);
      }

      return probeHtml;
    } catch (err: any) {
      if (isDebug()) console.error(`[HTTP] Error on attempt ${attempt}:`, err.message);
      if (attempt === maxRetries) {
        throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts: ${err.message}`);
      }
      await sleep(1000 * attempt);
    }
  }

  throw new Error(`Unreachable`);
}

function solveSucuriChallenge(html: string): string | null {
  if (!html.includes("sucuri_cloudproxy_js")) return null;

  try {
    const sMatch = html.match(/sucuri_cloudproxy_js='',S='([^']+)'/);
    if (!sMatch) return null;

    const encoded = sMatch[1];
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");

    const cookieResult: { name: string; value: string } = { name: "", value: "" };

    const sandbox = {
      String: String,
      document: {
        get cookie() { return ""; },
        set cookie(val: string) {
          cookieResult.name = val.split("=")[0];
          cookieResult.value = val.split(";")[0];
        },
      },
      location: { reload: () => {} },
    };

    vm.createContext(sandbox);
    vm.runInContext(decoded, sandbox, { timeout: 2000 });

    if (cookieResult.value) {
      if (isDebug()) console.log(`[HTTP] Sucuri cookie solved: ${cookieResult.value.substring(0, 30)}...`);
      return cookieResult.value;
    }
  } catch (err: any) {
    if (isDebug()) console.error(`[HTTP] Sucuri challenge solving failed: ${err.message}`);
  }

  return null;
}

export async function fetchText(url: string, options: {
  referer?: string;
  headers?: Record<string, string>;
} = {}): Promise<string> {
  return fetchPage(url, options);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
