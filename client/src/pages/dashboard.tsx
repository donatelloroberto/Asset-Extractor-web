import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import {
  Activity,
  Database,
  Zap,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  Layers,
  BarChart3,
  CheckCircle2,
  XCircle,
  Trash2,
  Globe,
  Info,
  MonitorPlay,
} from "lucide-react";

interface AddonInfo {
  name: string;
  version: string;
  catalogs: number;
  manifestPath: string;
}

interface StatusResponse {
  name: string;
  version: string;
  uptime: number;
  catalogs: number;
  cacheStats: { hits: number; misses: number; keys: number };
  addons: AddonInfo[];
  endpoints: { path: string; description: string }[];
}

interface CatalogEntry {
  type: string;
  id: string;
  name: string;
}

interface CatalogsResponse {
  gxtapes: CatalogEntry[];
  nurgay: CatalogEntry[];
  fxggxt: CatalogEntry[];
  justthegays: CatalogEntry[];
  besthdgayporn: CatalogEntry[];
  boyfriendtv: CatalogEntry[];
  gaycock4u: CatalogEntry[];
  gaystream: CatalogEntry[];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function AddonCard({ addon, baseUrl }: { addon: AddonInfo; baseUrl: string }) {
  const { toast } = useToast();
  const manifestUrl = `${baseUrl}${addon.manifestPath}`;
  const stremioUrl = `stremio://${window.location.host}${addon.manifestPath}`;
  const webInstallUrl = `https://web.stremio.com/#?addon=${encodeURIComponent(manifestUrl)}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  return (
    <Card key={addon.manifestPath} className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">{addon.name}</CardTitle>
        <Badge variant="secondary" className="text-xs shrink-0">
          {addon.catalogs} catalogs
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Manifest URL
          </label>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto font-mono text-foreground/80"
              data-testid={`text-manifest-url-${addon.name.toLowerCase()}`}
            >
              {manifestUrl}
            </code>
            <Button
              size="icon"
              variant="outline"
              className="shrink-0"
              onClick={() => copyToClipboard(manifestUrl, `${addon.name} Manifest URL`)}
              data-testid={`button-copy-manifest-${addon.name.toLowerCase()}`}
              title="Copy manifest URL"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mt-auto">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(stremioUrl, "_blank")}
            data-testid={`button-install-${addon.name.toLowerCase()}`}
            title="Open in Stremio desktop app"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            Install (Desktop)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(webInstallUrl, "_blank")}
            title="Install via Stremio Web"
          >
            <Globe className="w-3.5 h-3.5" />
            Install (Web)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open(manifestUrl, "_blank")}
            data-testid={`button-view-manifest-${addon.name.toLowerCase()}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: status, isLoading, refetch } = useQuery<StatusResponse>({
    queryKey: ["/api/status"],
    refetchInterval: 10000,
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/cache/clear"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      toast({ title: "Cache cleared", description: "All cached data has been removed." });
    },
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-addon-title">
                Stremio Add-ons Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                8 Cloudstream 3 extensions converted to Stremio add-ons
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">How to install:</span> Click{" "}
              <span className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 rounded">Install (Desktop)</span> to open
              in Stremio, or{" "}
              <span className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 rounded">Install (Web)</span> for the
              browser version. You can also copy the Manifest URL and paste it into Stremio manually.
            </div>
          </div>
        </header>

        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : status ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-lg font-semibold" data-testid="text-status">Online</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Uptime</span>
                  </div>
                  <span className="text-lg font-semibold" data-testid="text-uptime">
                    {formatUptime(status.uptime)}
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Total Catalogs</span>
                  </div>
                  <span className="text-lg font-semibold" data-testid="text-catalogs">
                    {status.catalogs}
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Cache Keys</span>
                  </div>
                  <span className="text-lg font-semibold" data-testid="text-cache-keys">
                    {status.cacheStats.keys}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Add-on Cards */}
            {status.addons && status.addons.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Available Add-ons</h2>
                  <Badge variant="outline">{status.addons.length} providers</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {status.addons.map((addon) => (
                    <AddonCard key={addon.manifestPath} addon={addon} baseUrl={baseUrl} />
                  ))}
                </div>
              </section>
            )}

            <Separator />

            {/* Cache + Endpoints row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                  <CardTitle className="text-base font-semibold">Cache Statistics</CardTitle>
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-muted-foreground">Hits</span>
                      </div>
                      <span className="text-xl font-bold text-green-700 dark:text-green-400" data-testid="text-cache-hits">
                        {status.cacheStats.hits}
                      </span>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <XCircle className="w-3 h-3 text-orange-600" />
                        <span className="text-xs text-muted-foreground">Misses</span>
                      </div>
                      <span className="text-xl font-bold text-orange-700 dark:text-orange-400" data-testid="text-cache-misses">
                        {status.cacheStats.misses}
                      </span>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Database className="w-3 h-3 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Keys</span>
                      </div>
                      <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
                        {status.cacheStats.keys}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      data-testid="button-refresh-stats"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => clearCacheMutation.mutate()}
                      disabled={clearCacheMutation.isPending}
                      data-testid="button-clear-cache"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                  <CardTitle className="text-base font-semibold">API Endpoints</CardTitle>
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {status.endpoints.map((ep) => (
                      <div
                        key={ep.path}
                        className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0"
                        data-testid={`row-endpoint-${ep.path.replace(/\//g, "-")}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge variant="secondary" className="text-xs shrink-0">GET</Badge>
                          <code className="text-xs font-mono text-muted-foreground truncate">{ep.path}</code>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                          {ep.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <CatalogList baseUrl={baseUrl} />
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <p className="text-lg font-semibold">Unable to connect</p>
              <p className="text-sm text-muted-foreground mt-1">
                The add-on server is not responding. Please check the server logs.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <footer className="text-center text-xs text-muted-foreground pt-2 pb-6">
          Stremio Add-ons — 8 Cloudstream 3 extensions &bull; All streams are sourced from their respective providers
        </footer>
      </div>
    </div>
  );
}

type AddonKey = "gxtapes" | "nurgay" | "fxggxt" | "justthegays" | "besthdgayporn" | "boyfriendtv" | "gaycock4u" | "gaystream";

const ADDON_LABELS: Record<AddonKey, string> = {
  gxtapes: "GXtapes",
  nurgay: "Nurgay",
  fxggxt: "Fxggxt",
  justthegays: "Justthegays",
  besthdgayporn: "BestHDgayporn",
  boyfriendtv: "BoyfriendTV",
  gaycock4u: "Gaycock4U",
  gaystream: "GayStream",
};

function CatalogList({ baseUrl }: { baseUrl: string }) {
  const [activeTab, setActiveTab] = useState<AddonKey>("gxtapes");

  const { data: catalogs, isLoading } = useQuery<CatalogsResponse>({
    queryKey: ["/api/catalogs"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!catalogs) return null;

  const activeCatalogs = catalogs[activeTab] || [];
  const addonKeys = Object.keys(ADDON_LABELS) as AddonKey[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Browse Catalogs</CardTitle>
        <Layers className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {addonKeys.map((key) => (
            <Button
              key={key}
              variant={activeTab === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(key)}
              data-testid={`button-tab-${key}`}
            >
              {ADDON_LABELS[key]}
              <Badge
                variant={activeTab === key ? "secondary" : "outline"}
                className="ml-1.5 text-xs px-1.5"
              >
                {catalogs[key]?.length || 0}
              </Badge>
            </Button>
          ))}
        </div>

        {activeCatalogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeCatalogs.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-2 p-3 rounded-md border hover:bg-muted/50 transition-colors"
                data-testid={`card-catalog-${cat.id}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium truncate block">{cat.name}</span>
                  <span className="text-xs text-muted-foreground font-mono truncate block">{cat.id}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() =>
                    window.open(`${baseUrl}/catalog/movie/${cat.id}.json`, "_blank")
                  }
                  data-testid={`button-test-catalog-${cat.id}`}
                  title="Test this catalog"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No catalogs available.</p>
        )}
      </CardContent>
    </Card>
  );
}
