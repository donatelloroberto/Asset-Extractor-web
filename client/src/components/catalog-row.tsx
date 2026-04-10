import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from "lucide-react";
import { Link } from "wouter";
import MovieCard, { MovieItem } from "./movie-card";

interface CatalogRowProps {
  catalogId: string;
  title: string;
  onInfo?: (item: MovieItem) => void;
}

export default function CatalogRow({ catalogId, title, onInfo }: CatalogRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const { data: items, isLoading } = useQuery<MovieItem[]>({
    queryKey: ["/api/catalog", catalogId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/${encodeURIComponent(catalogId)}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.8;
    rowRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <div className="mb-8 group/row">
      <div className="flex items-center justify-between mb-3 px-4 md:px-12">
        <h2 className="text-white text-lg md:text-xl font-semibold" data-testid={`text-row-title-${catalogId}`}>
          {title}
        </h2>
        <Link
          href={`/browse?catalog=${encodeURIComponent(catalogId)}`}
          className="flex items-center gap-1 text-white/50 hover:text-white text-xs font-medium transition-colors group/see"
          data-testid={`link-see-all-${catalogId}`}
        >
          See all
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/see:translate-x-0.5" />
        </Link>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 md:w-14 bg-gradient-to-r from-[#141414] to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
          data-testid={`button-scroll-left-${catalogId}`}
        >
          <ChevronLeft className="w-7 h-7 text-white" />
        </button>

        <div
          ref={rowRef}
          className="flex gap-2 md:gap-3 overflow-x-auto hide-scrollbar px-4 md:px-12 pb-2"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[160px] md:w-[200px] lg:w-[220px] aspect-[2/3] rounded-md bg-[#1a1a1a] animate-pulse"
                />
              ))
            : items!.map((item, i) => (
                <MovieCard key={`${item.id}-${i}`} item={item} onInfo={onInfo} index={i} />
              ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 md:w-14 bg-gradient-to-l from-[#141414] to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
          data-testid={`button-scroll-right-${catalogId}`}
        >
          <ChevronRight className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
}
