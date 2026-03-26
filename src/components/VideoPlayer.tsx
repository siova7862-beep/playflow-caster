import { useState, useRef, useEffect, useCallback } from "react";
import mpegts from "mpegts.js";
import {
  Play, Pause, SkipBack, SkipForward,
  Maximize, Minimize, ArrowLeft, Volume2, VolumeX
} from "lucide-react";
import { getProxyUrl } from "@/lib/api";

interface VideoPlayerProps {
  url: string;
  title: string;
  onBack: () => void;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function VideoPlayer({ url, title, onBack, initialTime, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const saveInterval = useRef<ReturnType<typeof setInterval>>();
  const playerRef = useRef<mpegts.Player | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const proxyUrl = getProxyUrl(url);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Destroy previous player
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.unload();
      playerRef.current.detachMediaElement();
      playerRef.current.destroy();
      playerRef.current = null;
    }

    setError('');

    const isLiveOrTs = url.includes('.ts') || url.includes('/live/') || url.includes('output=mpegts') || !url.includes('.m3u8');

    if (mpegts.isSupported()) {
      try {
        const player = mpegts.createPlayer({
          type: isLiveOrTs ? 'mpegts' : 'mpegts',
          isLive: url.includes('/live/') || (!url.includes('.m3u8') && !url.includes('/movie/') && !url.includes('/series/')),
          url: proxyUrl,
        }, {
          enableWorker: true,
          lazyLoadMaxDuration: 3 * 60,
          seekType: 'range',
          liveBufferLatencyChasing: true,
          liveBufferLatencyMaxLatency: 1.5,
          liveBufferLatencyMinRemain: 0.3,
        });

        player.attachMediaElement(video);
        player.load();

        player.on(mpegts.Events.ERROR, (errorType, errorDetail, errorInfo) => {
          console.error('mpegts error:', errorType, errorDetail, errorInfo);
          if (errorType === mpegts.ErrorTypes.NETWORK_ERROR) {
            setError('Erro de rede ao carregar stream');
          } else if (errorType === mpegts.ErrorTypes.MEDIA_ERROR) {
            // Try to recover
            player.unload();
            player.load();
          } else {
            setError('Erro ao reproduzir vídeo');
          }
        });

        playerRef.current = player;

        const onCanPlay = () => {
          if (initialTime && initialTime > 0 && !url.includes('/live/')) {
            video.currentTime = initialTime;
          }
          video.play().then(() => setPlaying(true)).catch(() => {});
        };

        video.addEventListener('canplay', onCanPlay, { once: true });
      } catch (e) {
        console.error('mpegts init error:', e);
        // Fallback: direct src
        video.src = proxyUrl;
        video.load();
        video.addEventListener('loadedmetadata', () => {
          if (initialTime && initialTime > 0) {
            video.currentTime = initialTime;
          }
          video.play().then(() => setPlaying(true)).catch(() => {});
        }, { once: true });
      }
    } else {
      // Fallback for unsupported browsers
      video.src = proxyUrl;
      video.load();
      video.addEventListener('loadedmetadata', () => {
        if (initialTime && initialTime > 0) {
          video.currentTime = initialTime;
        }
        video.play().then(() => setPlaying(true)).catch(() => {});
      }, { once: true });
    }

    // Save progress every 10 seconds
    saveInterval.current = setInterval(() => {
      if (video && onTimeUpdate && video.currentTime > 0) {
        onTimeUpdate(video.currentTime, video.duration || 0);
      }
    }, 10000);

    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.unload();
        playerRef.current.detachMediaElement();
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (saveInterval.current) clearInterval(saveInterval.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [playing, resetHideTimer]);

  const handleBack = () => {
    const video = videoRef.current;
    if (video && onTimeUpdate && video.currentTime > 0) {
      onTimeUpdate(video.currentTime, video.duration || 0);
    }
    onBack();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
    } else {
      v.play().catch(() => setError('Erro ao reproduzir'));
    }
    setPlaying(!playing);
    resetHideTimer();
  };

  const seek = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + seconds, duration));
    resetHideTimer();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    v.currentTime = pos * duration;
    resetHideTimer();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      onClick={resetHideTimer}
      onMouseMove={resetHideTimer}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-background"
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
        onError={() => setError('Erro ao carregar vídeo')}
        muted={muted}
        playsInline
        onClick={togglePlay}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90">
          <div className="text-center p-6">
            <p className="text-destructive font-display text-lg mb-2">{error}</p>
            <p className="text-muted-foreground text-sm mb-4">Tentando via proxy...</p>
            <button onClick={handleBack} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-display text-sm">
              VOLTAR
            </button>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.8) 100%)' }}
      >
        <div className="flex items-center gap-3 p-4">
          <button onClick={handleBack} className="btn-player w-10 h-10 bg-secondary/80">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="font-display text-sm font-bold truncate">{title}</h3>
        </div>

        <div className="flex items-center justify-center gap-8">
          <button onClick={() => seek(-10)} className="btn-player w-12 h-12">
            <SkipBack className="w-6 h-6" />
          </button>
          <button
            onClick={togglePlay}
            className="btn-player w-16 h-16 bg-primary/90 text-primary-foreground hover:bg-primary"
          >
            {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>
          <button onClick={() => seek(10)} className="btn-player w-12 h-12">
            <SkipForward className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <div className="progress-bar-3d" onClick={handleProgressClick}>
            <div
              className="progress-fill"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setMuted(!muted)} className="btn-player w-8 h-8">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={toggleFullscreen} className="btn-player w-8 h-8">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
