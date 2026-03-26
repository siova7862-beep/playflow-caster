import { useState, useMemo } from "react";
import type { PlaylistItem } from "@/types/iptv";
import { Loader2, ChevronDown } from "lucide-react";

const PAGE_SIZE = 40;

interface ContentGridProps {
  items: PlaylistItem[];
  type: 'filmes' | 'series' | 'canais';
  onSelect: (item: PlaylistItem) => void;
}

export function ContentGrid({ items, type, onSelect }: ContentGridProps) {
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  const handleClick = (item: PlaylistItem) => {
    if (type === 'canais') {
      onSelect(item);
      return;
    }
    setLoadingItem(item.name);
    setTimeout(() => {
      setLoadingItem(null);
      onSelect(item);
    }, 800);
  };

  useMemo(() => {
    setVisibleCount(PAGE_SIZE);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="font-display text-lg">Nenhum conteúdo encontrado</p>
        <p className="text-sm mt-1">Selecione uma categoria ou carregue a playlist</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground mb-2 font-body">
        {items.length} itens {hasMore && `· mostrando ${visibleCount}`}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {visibleItems.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="content-card relative overflow-hidden"
            onClick={() => handleClick(item)}
          >
            {loadingItem === item.name && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-1" />
                  <p className="text-xs text-primary font-display">Carregando...</p>
                </div>
              </div>
            )}
            <div className="aspect-video bg-secondary/50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
              {item.logo ? (
                <img src={item.logo} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="glow-text font-display text-xs font-bold text-center px-2">
                  {type === 'filmes' ? '🎬' : type === 'series' ? '📺' : '📡'}
                </div>
              )}
            </div>
            <p className="font-body text-xs font-semibold truncate text-foreground">
              {item.name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {item.group}
            </p>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full mt-4 py-3 rounded-xl glass-card flex items-center justify-center gap-2 text-sm font-display text-primary hover:bg-secondary/50 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Carregar mais ({items.length - visibleCount} restantes)
        </button>
      )}
    </>
  );
}
