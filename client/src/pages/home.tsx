import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Info, Loader2, Clock, X } from "lucide-react";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";
import CatalogRow from "@/components/catalog-row";
import VideoModal from "@/components/video-modal";
import { MovieItem } from "@/components/movie-card";
import { getHistory, removeFromHistory, type HistoryItem } from "@/lib/history";

const FEATURED_CATALOGS = [
  { id: "gxtapes-latest", label: "GXtapes — Latest" },
  { id: "nurgay-latest", label: "Nurgay — Latest" },
  { id: "boyfriendtv-trending", label: "BoyfriendTV — Trending" },
  { id: "gaystream-latest", label: "GayStream — Latest" },
  { id: "besthdgayporn-latest", label: "BestHD — Latest" },
  { id: "gaycock4u-latest", label: "GayCock4U — Latest" },
  { id: "justthegays-latest", label: "JustTheGays — Latest" },
  { id: "fxggxt-bareback", label: "Fxggxt — Bareback" },
  { id: "gxtapes-bareback", label: "GXtapes — Bareback" },
  { id: "nurgay-twinks", label: "Nurgay — Twinks" },
  { id: "nurgay-hunks", label: "Nurgay — Hunks" },
  { id: "gaystream-4k", label: "GayStream — 4K" },
];

function ContinueWatching() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [, navigate] = useLocation();
  const [modalId, setModalId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeFromHistory(id);
    setHistory(getHistory());
  };

  if (history.length === 0) return null;

  return (
    <>
      <div className="px-4 md:px-12 mb-1">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-white/50" />
          <h2 className="text-white font-semibold text-lg">Continue Watching</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
          {history.map((item) => (
            <div
              key={item.id}
              className="relative flex-shrink-0 w-40 sm:w-44 group cursor-pointer"
              onClick={() => navigate(`/watch/${encodeURIComponent(item.id)}`)}
              data-testid={`history-card-${item.id}`}
            >
              <div className="relative w-full aspect-video rounded overflow-hidden bg-white/5">
                {item.poster ? (
                  <img
                    src={`/api/imgproxy?url=${encodeURIComponent(item.poster)}`}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                  data-testid={`button-remove-history-${item.id}`}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
              <p className="text-white/70 text-xs mt-1.5 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                {item.name}
              </p>
            </div>
          ))}
        </div>
      </div>
      {modalId && <VideoModal itemId={modalId} onClose={() => setModalId(null)} />}
    </>
  );
}

function HeroBanner() {
  const [heroItem, setHeroItem] = useState<MovieItem | null>(null);
  const [imgError, setImgError] = useState(false);
  const [, navigate] = useLocation();
  const [modalId, setModalId] = useState<string | null>(null);

  const { data: items } = useQuery<MovieItem[]>({
    queryKey: ["/api/catalog", "gxtapes-latest-hero"],
    queryFn: async () => {
      const res = await fetch("/api/catalog/gxtapes-latest");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (items && items.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(items.length, 10));
      setHeroItem(items[idx]);
    }
  }, [items]);

  if (!heroItem) {
    return (
      <div className="h-[60vh] md:h-[80vh] bg-gradient-to-b from-[#1a1a1a] to-[#141414] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="relative h-[60vh] md:h-[80vh] overflow-hidden">
        {heroItem.poster && !imgError ? (
          <img
            src={`/api/imgproxy?url=${encodeURIComponent(heroItem.poster)}`}
            alt={heroItem.name}
            className="w-full h-full object-cover object-top"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a0a0a] to-[#141414]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-[#141414]/30" />

        <div className="absolute bottom-[15%] left-0 px-4 md:px-12 max-w-xl md:max-w-2xl">
          <h1 className="text-white text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 drop-shadow-lg" data-testid="text-hero-title">
            {heroItem.name}
          </h1>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate(`/watch/${encodeURIComponent(heroItem.id)}`)}
              className="flex items-center gap-2 bg-white text-black font-bold px-6 md:px-8 py-2.5 md:py-3 rounded text-sm md:text-base hover:bg-white/90 transition-colors"
              data-testid="button-hero-play"
            >
              <Play className="w-5 h-5 fill-black" />
              Play
            </button>
            <button
              onClick={() => setModalId(heroItem.id)}
              className="flex items-center gap-2 bg-white/20 text-white font-semibold px-5 md:px-7 py-2.5 md:py-3 rounded text-sm md:text-base hover:bg-white/30 transition-colors backdrop-blur-sm"
              data-testid="button-hero-info"
            >
              <Info className="w-5 h-5" />
              More Info
            </button>
          </div>
        </div>
      </div>

      {modalId && <VideoModal itemId={modalId} onClose={() => setModalId(null)} />}
    </>
  );
}

export default function Home() {
  const [modalId, setModalId] = useState<string | null>(null);

  const handleInfo = (item: MovieItem) => setModalId(item.id);

  return (
    <div className="min-h-screen bg-[#141414]" data-testid="page-home">
      <Navbar />

      <HeroBanner />

      <div className="relative z-10 -mt-16 md:-mt-24 pb-16">
        <ContinueWatching />

        {FEATURED_CATALOGS.map((cat) => (
          <CatalogRow
            key={cat.id}
            catalogId={cat.id}
            title={cat.label}
            onInfo={handleInfo}
          />
        ))}
      </div>

      {modalId && <VideoModal itemId={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
