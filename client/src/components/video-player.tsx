import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

export interface Stream {
  url?: string;
  externalUrl?: string;
  playerFrameUrl?: string;
  title?: string;
  name?: string;
  behaviorHints?: { notWebReady?: boolean };
}

interface VideoPlayerProps {
  streams: Stream[];
  title: string;
  onClose?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getStreamMode(stream: Stream): "video" | "iframe" | "none" {
  if (stream.url) return "video";
  if (stream.externalUrl || stream.playerFrameUrl) return "iframe";
  return "none";
}

function getEmbedUrl(stream: Stream): string {
  const url = stream.externalUrl || stream.playerFrameUrl || "";
  if (!url) return "";
  return `/api/embed?url=${encodeURIComponent(url)}`;
}

function getStreamLabel(stream: Stream, idx: number): string {
  return stream.title || stream.name || `Source ${idx + 1}`;
}

function StreamPicker({ streams, streamIdx, onSelect }: {
  streams: Stream[];
  streamIdx: number;
  onSelect: (i: number) => void;
}) {
  if (streams.length <= 1) return null;
  return (
    <div className="flex gap-2 flex-wrap px-4 pb-3 pt-2">
      {streams.map((s, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); onSelect(i); }}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            i === streamIdx
              ? "bg-[#e50914] text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
          }`}
          data-testid={`button-stream-${i}`}
        >
          {getStreamLabel(s, i)}
        </button>
      ))}
    </div>
  );
}

function IframePlayer({ stream, streams, streamIdx, title, onClose, onSelect }: {
  stream: Stream;
  streams: Stream[];
  streamIdx: number;
  title: string;
  onClose?: () => void;
  onSelect: (i: number) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const embedSrc = getEmbedUrl(stream);
  const externalHref = stream.externalUrl || stream.playerFrameUrl || "";

  return (
    <div className="relative w-full h-full bg-black flex flex-col" data-testid="iframe-player-container">
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-white font-semibold text-sm truncate">{title}</h2>
          <span className="text-white/40 text-xs flex-shrink-0">
            {stream.name || stream.title?.replace(" - Open in Browser", "") || "Embed"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {externalHref && (
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white/70 hover:text-white text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              data-testid="link-open-external"
            >
              <ExternalLink className="w-3 h-3" />
              Open tab
            </a>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              data-testid="button-close-player"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {loading && !failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10 pointer-events-none">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 z-10">
            <AlertCircle className="w-10 h-10 text-[#e50914]" />
            <p className="text-white/70 text-sm">Could not embed this player</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {externalHref && (
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#e50914] text-white text-sm rounded hover:bg-[#f40612] transition-colors"
                  data-testid="link-open-external-fallback"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </a>
              )}
              {streamIdx + 1 < streams.length && (
                <button
                  onClick={() => { setFailed(false); setLoading(true); onSelect(streamIdx + 1); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-sm rounded hover:bg-white/20 transition-colors"
                  data-testid="button-try-next-source"
                >
                  <ChevronRight className="w-4 h-4" />
                  Try next source
                </button>
              )}
            </div>
          </div>
        ) : (
          <iframe
            key={embedSrc}
            src={embedSrc}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
            data-testid="embed-iframe"
          />
        )}
      </div>

      <div className="bg-black/80 flex-shrink-0">
        <StreamPicker streams={streams} streamIdx={streamIdx} onSelect={onSelect} />
      </div>
    </div>
  );
}

export default function VideoPlayer({ streams, title, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const autoSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    try { return parseFloat(localStorage.getItem("sf-volume") || "1"); } catch { return 1; }
  });
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamIdx, setStreamIdx] = useState(0);
  const [quality, setQuality] = useState<string>("Auto");
  const [showQuality, setShowQuality] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<{ height: number; index: number }[]>([]);
  const [switchingSource, setSwitchingSource] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (autoSwitchTimerRef.current) clearTimeout(autoSwitchTimerRef.current);
    };
  }, []);

  const currentStream = streams[streamIdx];
  const mode = currentStream ? getStreamMode(currentStream) : "none";

  const safePlay = (video: HTMLVideoElement) => {
    const p = video.play();
    if (p !== undefined) {
      p.catch((err) => {
        if (err?.name === "AbortError" || err?.name === "NotAllowedError") return;
      });
    }
  };

  const tryNextSource = useCallback((reason: string) => {
    setStreamIdx(i => {
      const next = i + 1;
      if (next < streams.length) {
        setSwitchingSource(getStreamLabel(streams[next], next));
        autoSwitchTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSwitchingSource(null);
        }, 2500);
        return next;
      }
      setError("All sources failed. The video may be unavailable.");
      setLoading(false);
      return i;
    });
  }, [streams]);

  const loadStream = useCallback((stream: Stream) => {
    const video = videoRef.current;
    if (!video) return;
    if (!stream?.url) return;

    setLoading(true);
    setError(null);
    setPlaying(false);
    setHlsLevels([]);
    setSwitchingSource(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = stream.url;
    const isHls = url.includes(".m3u8") || url.includes("m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        xhrSetup: (xhr) => { xhr.withCredentials = false; },
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        if (!mountedRef.current) return;
        setHlsLevels(data.levels.map((l, i) => ({ height: l.height, index: i })));
        setLoading(false);
        safePlay(video);
        setPlaying(true);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!mountedRef.current) return;
        if (data.fatal) tryNextSource("HLS fatal error");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl") && isHls) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        if (!mountedRef.current) return;
        setLoading(false);
        safePlay(video);
        setPlaying(true);
      }, { once: true });
    } else {
      video.src = url;
      video.load();
    }
  }, [streams.length, tryNextSource]);

  useEffect(() => {
    if (mode === "video" && currentStream) loadStream(currentStream);
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [streamIdx]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => { if (isFinite(video.duration)) setDuration(video.duration); };
    const onPlay = () => { setPlaying(true); setLoading(false); setSwitchingSource(null); };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onCanPlay = () => setLoading(false);
    const onError = () => { if (!mountedRef.current) return; tryNextSource("video error"); };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [streamIdx, streams.length, tryNextSource]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (mode !== "video") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const video = videoRef.current;
      if (!video) return;
      switch (e.key) {
        case " ": case "k":
          e.preventDefault();
          if (video.paused) safePlay(video); else video.pause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        case "m": case "M":
          e.preventDefault();
          video.muted = !video.muted;
          setMuted(video.muted);
          break;
        case "f": case "F":
          e.preventDefault();
          if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
          else document.exitFullscreen();
          break;
        case "n": case "N":
          if (streamIdx + 1 < streams.length) {
            e.preventDefault();
            tryNextSource("keyboard shortcut");
          }
          break;
      }
      resetControlsTimer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, streamIdx, streams.length, tryNextSource]);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setShowControls(false);
    }, 3000);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) safePlay(video); else video.pause();
  };

  const seek = (secs: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + secs, duration));
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    try { localStorage.setItem("sf-volume", String(v)); } catch {}
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setMuted(v === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const setHlsLevel = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setQuality(levelIndex === -1 ? "Auto" : `${hlsLevels.find(l => l.index === levelIndex)?.height}p`);
    }
    setShowQuality(false);
  };

  if (!currentStream || mode === "none") {
    return (
      <div className="relative w-full h-full bg-black flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-[#e50914]" />
        <p className="text-white text-lg font-medium">No playable stream found</p>
        {streams.length > 1 && (
          <div className="flex gap-2 flex-wrap justify-center">
            {streams.map((s, i) => (
              <button
                key={i}
                onClick={() => setStreamIdx(i)}
                className="px-3 py-1.5 rounded text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                data-testid={`button-source-${i}`}
              >
                {getStreamLabel(s, i)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (mode === "iframe") {
    return (
      <IframePlayer
        stream={currentStream}
        streams={streams}
        streamIdx={streamIdx}
        title={title}
        onClose={onClose}
        onSelect={setStreamIdx}
      />
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const progressStyle = {
    background: `linear-gradient(to right, #e50914 0%, #e50914 ${progress}%, rgba(255,255,255,0.3) ${progress}%, rgba(255,255,255,0.3) 100%)`,
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none"
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
      onClick={togglePlay}
      style={{ cursor: showControls ? "default" : "none" }}
      data-testid="video-player-container"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        data-testid="video-element"
      />

      {/* Switching source notification */}
      {switchingSource && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/80 rounded-lg px-5 py-3 flex items-center gap-3 pointer-events-none">
          <RefreshCw className="w-5 h-5 text-white animate-spin" />
          <div className="text-center">
            <p className="text-white text-sm font-medium">Switching source</p>
            <p className="text-white/50 text-xs">{switchingSource}</p>
          </div>
        </div>
      )}

      {loading && !error && !switchingSource && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
          <AlertCircle className="w-12 h-12 text-[#e50914]" />
          <div className="text-center">
            <p className="text-white text-lg font-medium">{error}</p>
            <p className="text-white/50 text-sm mt-1">All {streams.length} sources were tried</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setStreamIdx(0); setError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#e50914] text-white rounded text-sm hover:bg-[#f40612] transition-colors"
            data-testid="button-retry-from-start"
          >
            <RefreshCw className="w-4 h-4" />
            Try again from source 1
          </button>
        </div>
      )}

      {/* Keyboard hints */}
      <div
        className={`absolute top-14 left-1/2 -translate-x-1/2 bg-black/70 rounded px-3 py-1.5 text-white/50 text-xs pointer-events-none transition-opacity duration-300 ${
          showControls && !playing && !loading && !error ? "opacity-100" : "opacity-0"
        }`}
      >
        Space/K play · ←→ seek · ↑↓ volume · M mute · F fullscreen{streams.length > 1 ? " · N next source" : ""}
      </div>

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: showControls ? "auto" : "none" }}
      >
        <div className="bg-gradient-to-b from-black/70 to-transparent px-4 py-3 flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm md:text-base truncate max-w-[80%]">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-sm px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
              data-testid="button-close-player"
            >
              ✕ Close
            </button>
          )}
        </div>

        <div className="bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-8">
          {/* Stream picker */}
          <StreamPicker streams={streams} streamIdx={streamIdx} onSelect={setStreamIdx} />

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="progress-bar w-full mb-3"
            style={progressStyle}
            data-testid="input-progress"
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors" data-testid="button-play-pause">
                {playing ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="text-white hover:text-white/80 transition-colors" data-testid="button-seek-back">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="text-white hover:text-white/80 transition-colors" data-testid="button-seek-forward">
                <SkipForward className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors" data-testid="button-mute">
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-bar hidden sm:block"
                  data-testid="input-volume"
                />
              </div>

              <span className="text-white/80 text-xs sm:text-sm tabular-nums" data-testid="text-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {streams.length > 1 && streamIdx + 1 < streams.length && (
                <button
                  onClick={(e) => { e.stopPropagation(); tryNextSource("manual"); }}
                  className="text-white/60 hover:text-white text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors hidden sm:flex items-center gap-1"
                  data-testid="button-next-source"
                  title="Try next source (N)"
                >
                  <ChevronRight className="w-3 h-3" />
                  Next
                </button>
              )}

              {hlsLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowQuality(v => !v); }}
                    className="text-white/80 hover:text-white text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                    data-testid="button-quality"
                  >
                    {quality}
                  </button>
                  {showQuality && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded shadow-xl min-w-[100px]">
                      <button onClick={() => setHlsLevel(-1)} className="block w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors">
                        Auto
                      </button>
                      {[...hlsLevels].reverse().map(l => (
                        <button
                          key={l.index}
                          onClick={() => setHlsLevel(l.index)}
                          className="block w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors"
                        >
                          {l.height}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="text-white hover:text-white/80 transition-colors"
                data-testid="button-fullscreen"
              >
                {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
