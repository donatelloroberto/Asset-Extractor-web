import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Play, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface VideoModalProps {
  itemId: string;
  onClose: () => void;
}

interface MetaResponse {
  id: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  type?: string;
  year?: string | number;
  runtime?: string;
  genre?: string[];
}

export default function VideoModal({ itemId, onClose }: VideoModalProps) {
  const [, navigate] = useLocation();

  const { data: meta, isLoading, error } = useQuery<MetaResponse>({
    queryKey: ["/api/meta", itemId],
    queryFn: async () => {
      const res = await fetch(`/api/meta/${encodeURIComponent(itemId)}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="video-modal-overlay"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative bg-[#181818] rounded-lg overflow-hidden max-w-2xl w-full shadow-2xl z-10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="video-modal-content"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
          data-testid="button-modal-close"
        >
          <X className="w-4 h-4" />
        </button>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="w-10 h-10 text-[#e50914]" />
            <p className="text-white/70 text-sm">Failed to load details</p>
          </div>
        )}

        {meta && (
          <>
            <div className="relative aspect-video bg-black">
              {(meta.background || meta.poster) && (
                <img
                  src={`/api/imgproxy?url=${encodeURIComponent((meta.background || meta.poster)!)}`}
                  alt={meta.name}
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-white text-2xl font-bold mb-2" data-testid="text-modal-title">{meta.name}</h2>
                <div className="flex gap-2 flex-wrap">
                  {meta.year && <span className="text-white/60 text-sm">{meta.year}</span>}
                  {meta.runtime && <span className="text-white/60 text-sm">• {meta.runtime}</span>}
                  {meta.genre?.slice(0, 3).map((g) => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">{g}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={() => navigate(`/watch/${encodeURIComponent(itemId)}`)}
                className="flex items-center gap-2 bg-white text-black font-semibold px-6 py-2.5 rounded hover:bg-white/90 transition-colors mb-4"
                data-testid="button-modal-play"
              >
                <Play className="w-5 h-5 fill-black" />
                Play Now
              </button>

              {meta.description && (
                <p className="text-white/70 text-sm leading-relaxed line-clamp-4" data-testid="text-modal-description">
                  {meta.description}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
