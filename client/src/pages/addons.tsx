import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import { ExternalLink, Download, Layers, Film, Copy, Check } from "lucide-react";

interface StremioManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  catalogs: Array<{ type: string; id: string; name: string }>;
  resources: string[];
  types: string[];
  logo?: string;
}

interface AddonEntry {
  path: string;
  label: string;
  color: string;
  emoji: string;
}

const ADDON_LIST: AddonEntry[] = [
  { path: "/manifest.json", label: "All Providers", color: "#e50914", emoji: "🎬" },
  { path: "/nurgay/manifest.json", label: "NurGay", color: "#7c3aed", emoji: "🟣" },
  { path: "/fxggxt/manifest.json", label: "FxGGxt", color: "#0891b2", emoji: "🔵" },
  { path: "/justthegays/manifest.json", label: "JustTheGays", color: "#059669", emoji: "🟢" },
  { path: "/besthdgayporn/manifest.json", label: "BestHDGayPorn", color: "#d97706", emoji: "🟠" },
  { path: "/boyfriendtv/manifest.json", label: "BoyfriendTV", color: "#db2777", emoji: "🌸" },
  { path: "/gaycock4u/manifest.json", label: "GayCock4U", color: "#dc2626", emoji: "🔴" },
  { path: "/gaystream/manifest.json", label: "GayStream", color: "#2563eb", emoji: "💙" },
];

function CopyButton({ text, label, buttonLabel = "Copy Manifest URL", className = "w-full" }: { text: string; label: string; buttonLabel?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition-all whitespace-nowrap shrink-0 ${className}`}
      data-testid={`button-copy-${label}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 shrink-0" />
          {buttonLabel}
        </>
      )}
    </button>
  );
}

function AddonCard({ entry, baseUrl }: { entry: AddonEntry; baseUrl: string }) {
  const [manifest, setManifest] = useState<StremioManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const manifestUrl = `${baseUrl}${entry.path}`;
  const stremioUrl = `stremio://${baseUrl.replace(/^https?:\/\//, "")}${entry.path}`;

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(entry.path)
      .then((r) => r.json())
      .then((data) => {
        setManifest(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [entry.path]);

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/10 flex flex-col"
      style={{ borderTop: `3px solid ${entry.color}` }}
      data-testid={`card-addon-${entry.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{entry.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight">
              {loading ? entry.label : manifest?.name || entry.label}
            </h3>
            {!loading && manifest && (
              <span className="text-xs text-white/40">v{manifest.version}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-white/10 rounded animate-pulse w-full" />
            <div className="h-3 bg-white/10 rounded animate-pulse w-4/5" />
          </div>
        ) : error ? (
          <p className="text-white/40 text-sm">Unable to load manifest</p>
        ) : (
          <>
            <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-2">
              {manifest?.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {manifest?.catalogs?.length || 0} catalogs
              </span>
              <span className="flex items-center gap-1">
                <Film className="w-3 h-3" />
                {manifest?.types?.join(", ")}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="p-5 pt-0 flex flex-col gap-2">
        <a
          href={stremioUrl}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ backgroundColor: entry.color }}
          data-testid={`button-install-${entry.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Download className="w-4 h-4" />
          Install in Stremio
        </a>

        <CopyButton text={manifestUrl} label={entry.label.toLowerCase().replace(/\s+/g, "-")} />

        <a
          href={entry.path}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition-all"
          data-testid={`link-manifest-${entry.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Manifest JSON
        </a>
      </div>
    </div>
  );
}

export default function Addons() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />

      <div className="pt-24 pb-16 px-4 md:px-12 max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            <span className="text-[#e50914]">Stremio</span> Addons
          </h1>
          <p className="text-white/50 text-base max-w-2xl">
            Install these addons directly into Stremio to access content from all providers.
            Click "Install in Stremio" on any card, or copy the manifest URL to add it manually.
          </p>
        </div>

        <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
          <span className="text-yellow-400 text-xl shrink-0">💡</span>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-sm font-medium mb-1">Your addon base URL</p>
            <code
              className="text-[#e50914] text-sm font-mono break-all block"
              data-testid="text-base-url"
            >
              {baseUrl}
            </code>
          </div>
          <CopyButton text={baseUrl} label="base-url" buttonLabel="Copy URL" className="" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ADDON_LIST.map((entry) => (
            <AddonCard key={entry.path} entry={entry} baseUrl={baseUrl} />
          ))}
        </div>
      </div>
    </div>
  );
}
