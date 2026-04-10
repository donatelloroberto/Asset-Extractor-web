import { useState } from "react";
import { Play, Info } from "lucide-react";
import { useLocation } from "wouter";

export interface MovieItem {
  id: string;
  name: string;
  poster?: string;
  type?: string;
  description?: string;
}

interface MovieCardProps {
  item: MovieItem;
  onInfo?: (item: MovieItem) => void;
  index?: number;
}

export default function MovieCard({ item, onInfo, index = 0 }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [, navigate] = useLocation();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/watch/${encodeURIComponent(item.id)}`);
  };

  const handleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInfo) onInfo(item);
  };

  return (
    <div
      className="card-hover relative flex-shrink-0 w-[160px] md:w-[200px] lg:w-[220px] rounded-md overflow-hidden cursor-pointer group"
      data-testid={`card-movie-${index}`}
      onClick={handlePlay}
    >
      <div className="aspect-[2/3] bg-[#1a1a1a] relative overflow-hidden">
        {item.poster && !imgError ? (
          <img
            src={`/api/imgproxy?url=${encodeURIComponent(item.poster)}`}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a]">
            <Play className="w-10 h-10 text-white/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          <div className="flex gap-1.5">
            <button
              onClick={handlePlay}
              className="flex items-center gap-1 bg-white text-black text-xs font-semibold px-2.5 py-1.5 rounded-sm hover:bg-white/90 transition-colors"
              data-testid={`button-play-${index}`}
            >
              <Play className="w-3 h-3 fill-black" />
              Play
            </button>
            {onInfo && (
              <button
                onClick={handleInfo}
                className="flex items-center justify-center w-7 h-7 border-2 border-white/60 rounded-full hover:border-white transition-colors bg-black/60"
                data-testid={`button-info-${index}`}
              >
                <Info className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-2 bg-[#181818]">
        <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{item.name}</p>
      </div>
    </div>
  );
}
