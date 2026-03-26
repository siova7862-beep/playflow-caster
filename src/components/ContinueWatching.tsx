import type { WatchProgress } from "@/types/iptv";
import { Play } from "lucide-react";

interface ContinueWatchingProps {
  items: WatchProgress[];
  onPlay: (item: WatchProgress) => void;
}

export function ContinueWatching({ items, onPlay }: ContinueWatchingProps) {
  if (items.length === 0) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-6">
      <h3 className="font-display text-sm font-bold glow-text mb-3">Continuar Assistindo</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item, idx) => {
          const progress = item.total_duration > 0 ? (item.progress_time / item.total_duration) * 100 : 0;
          return (
            <div
              key={`${item.content_url}-${idx}`}
              className="content-card min-w-[160px] max-w-[160px] relative"
              onClick={() => onPlay(item)}
            >
              <div className="aspect-video bg-secondary/50 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                <Play className="w-8 h-8 text-primary" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
              <p className="font-body text-xs font-semibold truncate text-foreground">
                {item.content_name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatTime(item.progress_time)} / {formatTime(item.total_duration)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
