import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, AlertCircle, Play, ChevronDown, RefreshCw, Wifi, WifiOff } from "lucide-react";
import VideoPlayer, { type Stream } from "@/components/video-player";
import { addToHistory } from "@/lib/history";

interface StreamsResponse {
  streams: Stream[];
}

interface MetaResponse {
  id: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
}

interface CatalogItem {
  id: string;
  name: string;
  poster?: string;
  type: string;
}

function useVideoId() {
  const params = useParams<{ id: string }>();
  return params.id ? decodeURIComponent(params.id) : "";
}

function getProvider(videoId: string): string {
  return videoId.split(":")[0] ?? "";
}

function SuggestionCard({ item, onPlay }: { item: CatalogItem; onPlay: (id: string) => void }) {
  return (
    <button
      className="w-full rounded-md overflow-hidden hover:bg-white/10 transition-colors text-left group"
      onClick={() => onPlay(item.id)}
      data-testid={`suggestion-${item.id}`}
    >
      <div className="relative w-full aspect-video bg-white/5">
        {item.poster ? (
          <img
            src={`/api/imgproxy?url=${encodeURIComponent(item.poster)}`}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>
      <div className="px-2 py-2">
        <p className="text-white text-xs font-medium leading-snug line-clamp-2">{item.name}</p>
      </div>
    </button>
  );
}

function StreamLoadingState({ retryCount, onRetry }: { retryCount: number; onRetry: () => void }) {
  const [dots, setDots] = useState("...");

  useEffect(() => {
    const timer = setInterval(() => {
      setDots(d => d.length >= 3 ? "." : d + ".");
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-white/40 animate-spin" />
        <Wifi className="w-5 h-5 text-white/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-center">
        <p className="text-white/70 text-sm font-medium">Finding streams{dots}</p>
        {retryCount > 0 && (
          <p className="text-white/40 text-xs mt-1">Retry {retryCount}/3</p>
        )}
      </div>
    </div>
  );
}

function StreamErrorState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center px-4">
      <WifiOff className="w-12 h-12 text-[#e50914]" />
      <div>
        <p className="text-white font-semibold text-lg">Failed to load streams</p>
        <p className="text-white/50 text-sm mt-1">The server could not be reached. Check your connection.</p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[#e50914] hover:bg-[#f40612] text-white rounded text-sm transition-colors"
          data-testid="button-retry-streams"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

function NoStreamsState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center px-4">
      <AlertCircle className="w-12 h-12 text-white/30" />
      <div>
        <p className="text-white font-semibold text-lg">No streams available</p>
        <p className="text-white/50 text-sm mt-1">
          This video has no playable sources right now. Try refreshing or check back later.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded text-sm transition-colors"
          data-testid="button-retry-no-streams"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default function Watch() {
  const videoId = useVideoId();
  const [, navigate] = useLocation();
  const provider = getProvider(videoId);
  const [retryKey, setRetryKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const [allSuggestions, setAllSuggestions] = useState<CatalogItem[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  }

  function handleRetry() {
    setRetryCount(c => c + 1);
    setRetryKey(k => k + 1);
  }

  const { data: streamsData, isLoading: streamsLoading, error: streamsError } = useQuery<StreamsResponse>({
    queryKey: ["/stream/movie", videoId, retryKey],
    queryFn: async () => {
      const res = await fetch(`/stream/movie/${encodeURIComponent(videoId)}.json`);
      if (!res.ok) throw new Error("Failed to load streams");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
    enabled: !!videoId,
  });

  const { data: meta } = useQuery<MetaResponse>({
    queryKey: ["/api/meta", videoId],
    queryFn: async () => {
      const res = await fetch(`/api/meta/${encodeURIComponent(videoId)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!videoId,
  });

  const { data: catalogsMap } = useQuery<Record<string, { id: string; name: string }[]>>({
    queryKey: ["/api/catalogs"],
    staleTime: 10 * 60 * 1000,
  });

  const providerCatalogId = catalogsMap?.[provider]?.find(c => !c.id.includes("search"))?.id;

  const { data: initialSuggestions } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog", providerCatalogId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/${encodeURIComponent(providerCatalogId!)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!providerCatalogId,
  });

  useEffect(() => {
    setAllSuggestions([]);
    setHasMore(false);
  }, [videoId]);

  useEffect(() => {
    if (initialSuggestions !== undefined) {
      const filtered = initialSuggestions.filter(s => s.id !== videoId);
      setAllSuggestions(filtered);
      setHasMore(initialSuggestions.length >= 20);
    }
  }, [initialSuggestions, videoId]);

  const loadMore = useCallback(async () => {
    if (!providerCatalogId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const skip = allSuggestions.length;
      const res = await fetch(`/api/catalog/${encodeURIComponent(providerCatalogId)}?skip=${skip}`);
      if (res.ok) {
        const newItems: CatalogItem[] = await res.json();
        const filtered = newItems.filter(s => s.id !== videoId);
        setAllSuggestions(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...filtered.filter(f => !existingIds.has(f.id))];
        });
        setHasMore(newItems.length >= 20);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [providerCatalogId, loadingMore, hasMore, allSuggestions.length, videoId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  useEffect(() => {
    document.title = meta?.name ? `${meta.name} — StreamFlix` : "Watch — StreamFlix";
    return () => { document.title = "StreamFlix"; };
  }, [meta?.name]);

  useEffect(() => {
    if (meta?.name && videoId) {
      addToHistory({
        id: videoId,
        name: meta.name,
        poster: meta.poster,
        provider: getProvider(videoId),
      });
    }
  }, [meta?.name, videoId]);

  const streams = streamsData?.streams ?? [];

  if (!videoId) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <p className="text-white/50">Invalid video ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col" data-testid="page-watch">
      <div className="flex-shrink-0 bg-[#141414]/90 backdrop-blur-sm flex items-center gap-3 px-4 py-3 z-10">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Back</span>
        </button>
        {meta?.name && (
          <h1 className="text-white font-semibold text-sm md:text-base truncate" data-testid="text-watch-title">
            {meta.name}
          </h1>
        )}
        {!streamsLoading && streams.length > 0 && (
          <span className="ml-auto text-white/30 text-xs hidden sm:inline flex-shrink-0">
            {streams.length} source{streams.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="w-full bg-black flex items-center justify-center" style={{ minHeight: "50vh" }}>
            {streamsLoading && (
              <StreamLoadingState retryCount={retryCount} onRetry={handleRetry} />
            )}

            {streamsError && !streamsLoading && (
              <StreamErrorState onRetry={handleRetry} onBack={goBack} />
            )}

            {!streamsLoading && !streamsError && streams.length === 0 && (
              <NoStreamsState onRetry={handleRetry} onBack={goBack} />
            )}

            {!streamsLoading && streams.length > 0 && (
              <div className="w-full aspect-video">
                <VideoPlayer
                  streams={streams}
                  title={meta?.name ?? ""}
                  onClose={goBack}
                />
              </div>
            )}
          </div>

          {meta && (
            <div className="bg-[#141414] px-4 md:px-6 py-5">
              <div className="flex gap-4">
                {meta.poster && (
                  <img
                    src={`/api/imgproxy?url=${encodeURIComponent(meta.poster)}`}
                    alt={meta.name}
                    className="w-20 md:w-24 rounded flex-shrink-0 object-cover self-start"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="text-white font-bold text-lg mb-2">{meta.name}</h2>
                  {meta.description && (
                    <p className="text-white/60 text-sm leading-relaxed">{meta.description}</p>
                  )}
                  {streams.length > 0 && (
                    <p className="text-white/30 text-xs mt-2">
                      {streams.length} stream source{streams.length !== 1 ? "s" : ""} available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 bg-[#181818] lg:border-l border-white/10 flex flex-col">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Up Next</h3>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 56px)" }}>
            {allSuggestions.length === 0 && !loadingMore && (
              <div className="flex items-center justify-center py-12">
                <p className="text-white/30 text-sm">Loading suggestions...</p>
              </div>
            )}
            <div className="p-2 space-y-1">
              {allSuggestions.map((item, idx) => (
                <SuggestionCard
                  key={`${item.id}-${idx}`}
                  item={item}
                  onPlay={(id) => navigate(`/watch/${encodeURIComponent(id)}`)}
                />
              ))}

              <div ref={sentinelRef} className="py-1">
                {loadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                  </div>
                )}
                {!loadingMore && hasMore && (
                  <button
                    onClick={loadMore}
                    className="w-full flex items-center justify-center gap-2 py-3 text-white/50 hover:text-white text-xs transition-colors"
                    data-testid="button-load-more"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load more
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
