import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import Navbar from "@/components/navbar";
import MovieCard, { MovieItem } from "@/components/movie-card";
import VideoModal from "@/components/video-modal";
import { Loader2, Search } from "lucide-react";

interface CatalogsResponse {
  gxtapes: { id: string; name: string }[];
  nurgay: { id: string; name: string }[];
  fxggxt: { id: string; name: string }[];
  justthegays: { id: string; name: string }[];
  besthdgayporn: { id: string; name: string }[];
  boyfriendtv: { id: string; name: string }[];
  gaycock4u: { id: string; name: string }[];
  gaystream: { id: string; name: string }[];
}

const PROVIDER_LABELS: Record<string, string> = {
  gxtapes: "GXtapes",
  nurgay: "Nurgay",
  fxggxt: "Fxggxt",
  justthegays: "JustTheGays",
  besthdgayporn: "BestHDgayporn",
  boyfriendtv: "BoyfriendTV",
  gaycock4u: "GayCock4U",
  gaystream: "GayStream",
};

export default function Browse() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const searchQuery = params.get("search") || "";
  const catalogParam = params.get("catalog") || "";

  const [selectedCatalog, setSelectedCatalog] = useState<string>(catalogParam);
  const [items, setItems] = useState<MovieItem[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const { data: catalogs } = useQuery<CatalogsResponse>({
    queryKey: ["/api/catalogs"],
    staleTime: Infinity,
  });

  const allCatalogs = catalogs
    ? Object.entries(catalogs).flatMap(([provider, cats]) =>
        (cats as { id: string; name: string }[]).map((c) => ({
          ...c,
          provider,
          label: c.name,
        }))
      )
    : [];

  useEffect(() => {
    if (allCatalogs.length > 0 && !selectedCatalog && !searchQuery) {
      const firstNonSearch = allCatalogs.find(c => !c.id.includes("search"));
      setSelectedCatalog(firstNonSearch?.id || allCatalogs[0].id);
    }
  }, [allCatalogs.length, searchQuery, selectedCatalog]);

  useEffect(() => {
    if (catalogParam) {
      setSelectedCatalog(catalogParam);
      setItems([]);
      setSkip(0);
      setHasMore(true);
    }
  }, [catalogParam]);

  const fetchItems = useCallback(async (catalogId: string, newSkip: number, search?: string) => {
    try {
      let url: string;
      if (search) {
        const searchCatalogId = catalogId.replace(/-latest$|-search$/, "") + "-search";
        url = `/api/catalog/${encodeURIComponent(searchCatalogId)}?search=${encodeURIComponent(search)}&skip=${newSkip}`;
      } else {
        url = `/api/catalog/${encodeURIComponent(catalogId)}?skip=${newSkip}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const data: MovieItem[] = await res.json();
      return data;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setSkip(0);
    setHasMore(true);
  }, [selectedCatalog, searchQuery]);

  useEffect(() => {
    if (!selectedCatalog && !searchQuery) return;
    const catalogToUse = selectedCatalog || (allCatalogs[0]?.id ?? "gxtapes-latest");
    setLoadingMore(true);
    fetchItems(catalogToUse, 0, searchQuery || undefined).then((data) => {
      setItems(data);
      setHasMore(data.length >= 20);
      setLoadingMore(false);
    });
  }, [selectedCatalog, searchQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const catalogToUse = selectedCatalog || (allCatalogs[0]?.id ?? "gxtapes-latest");
    const newSkip = skip + 20;
    setLoadingMore(true);
    const data = await fetchItems(catalogToUse, newSkip, searchQuery || undefined);
    setItems((prev) => [...prev, ...data]);
    setSkip(newSkip);
    setHasMore(data.length >= 20);
    setLoadingMore(false);
  }, [loadingMore, hasMore, selectedCatalog, skip, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  const providerKeys = Object.keys(PROVIDER_LABELS);

  return (
    <div className="min-h-screen bg-[#141414]" data-testid="page-browse">
      <Navbar />
      <div className="pt-20 px-4 md:px-8">
        {searchQuery && (
          <div className="mb-6 flex items-center gap-3">
            <Search className="w-5 h-5 text-white/40" />
            <h2 className="text-white text-xl font-semibold">
              Results for <span className="text-[#e50914]">"{searchQuery}"</span>
            </h2>
          </div>
        )}

        {!searchQuery && (
          <div className="mb-6 space-y-3">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {providerKeys.map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    const firstCat = (catalogs as any)?.[provider]?.[0]?.id;
                    if (firstCat) setSelectedCatalog(firstCat);
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    selectedCatalog && allCatalogs.find((c) => c.id === selectedCatalog)?.provider === provider
                      ? "bg-[#e50914] text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  }`}
                  data-testid={`button-provider-${provider}`}
                >
                  {PROVIDER_LABELS[provider]}
                </button>
              ))}
            </div>

            {selectedCatalog && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                {allCatalogs
                  .filter((c) => c.provider === (allCatalogs.find((x) => x.id === selectedCatalog)?.provider))
                  .filter((c) => !c.id.endsWith("-search"))
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCatalog(cat.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedCatalog === cat.id
                          ? "bg-white text-black"
                          : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                      }`}
                      data-testid={`button-catalog-${cat.id}`}
                    >
                      {cat.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {items.length === 0 && !loadingMore ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/30 gap-3">
            <Search className="w-12 h-12" />
            <p className="text-lg">No results found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {items.map((item, i) => (
              <MovieCard
                key={`${item.id}-${i}`}
                item={item}
                onInfo={(itm) => setModalId(itm.id)}
                index={i}
              />
            ))}
          </div>
        )}

        <div ref={loaderRef} className="flex justify-center py-8">
          {loadingMore && <Loader2 className="w-8 h-8 text-white/40 animate-spin" />}
        </div>
      </div>

      {modalId && <VideoModal itemId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
