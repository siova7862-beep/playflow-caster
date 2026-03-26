import { supabase } from "@/integrations/supabase/client";
import type { AccessData, PlaylistCategories, PlaylistItem, WatchProgress } from "@/types/iptv";

function parseExtinf(extinfLine: string, url: string): PlaylistItem {
  const logoMatch = extinfLine.match(/tvg-logo="([^"]*)"/);
  const groupMatch = extinfLine.match(/group-title="([^"]*)"/);
  const tvgIdMatch = extinfLine.match(/tvg-id="([^"]*)"/);
  const tvgNameMatch = extinfLine.match(/tvg-name="([^"]*)"/);
  
  const lastCommaIdx = extinfLine.lastIndexOf(",");
  const name = lastCommaIdx !== -1 ? extinfLine.substring(lastCommaIdx + 1).trim() : "Unknown";

  return {
    name: name || tvgNameMatch?.[1]?.trim() || "Unknown",
    url,
    logo: logoMatch?.[1] || "",
    group: groupMatch?.[1] || "Outros",
    tvgId: tvgIdMatch?.[1] || "",
    tvgName: tvgNameMatch?.[1] || "",
  };
}

async function parseM3UStream(
  response: Response,
  onProgress?: (count: number) => void
): Promise<PlaylistCategories> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to read playlist stream");
  }

  const decoder = new TextDecoder();
  const categories: PlaylistCategories = {};
  let buffer = "";
  let currentExtinf: string | null = null;
  let totalItems = 0;
  let lastYield = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith("#EXTINF:")) {
        currentExtinf = line;
        continue;
      }

      if (currentExtinf && !line.startsWith("#")) {
        const item = parseExtinf(currentExtinf, line);
        if (!categories[item.group]) categories[item.group] = [];
        categories[item.group].push(item);
        currentExtinf = null;
        totalItems++;
      }
    }

    const now = Date.now();
    if (now - lastYield > 200) {
      onProgress?.(totalItems);
      await new Promise((r) => setTimeout(r, 0));
      lastYield = Date.now();
    }
  }

  if (currentExtinf) {
    const lastLine = buffer.trim();
    if (lastLine && !lastLine.startsWith("#")) {
      const item = parseExtinf(currentExtinf, lastLine);
      if (!categories[item.group]) categories[item.group] = [];
      categories[item.group].push(item);
      totalItems++;
    }
  }

  onProgress?.(totalItems);
  return categories;
}

export async function fetchPlaylist(
  username: string,
  password: string,
  onProgress?: (count: number) => void
): Promise<PlaylistCategories> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/parse-playlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMsg = `Failed to fetch playlist: ${res.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMsg = errorJson.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return parseM3UStream(res, onProgress);
}

export function getProxyUrl(streamUrl: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/proxy-stream?url=${encodeURIComponent(streamUrl)}`;
}

export async function getLatestAccess(): Promise<AccessData | null> {
  const { data } = await supabase
    .from('accesses')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function saveAccess(access: Omit<AccessData, 'created_at'>): Promise<void> {
  const { error } = await supabase.functions.invoke('generate-access', {
    body: access,
  });
  if (error) console.error('Failed to save access:', error);
}

export async function getNotices() {
  const { data } = await supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function saveWatchProgress(progress: WatchProgress): Promise<void> {
  const { data: existing } = await supabase
    .from('watch_progress')
    .select('id')
    .eq('content_url', progress.content_url)
    .eq('username', progress.username)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('watch_progress')
      .update({
        progress_time: progress.progress_time,
        total_duration: progress.total_duration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('watch_progress').insert({
      content_name: progress.content_name,
      content_url: progress.content_url,
      content_logo: progress.content_logo,
      content_group: progress.content_group,
      progress_time: progress.progress_time,
      total_duration: progress.total_duration,
      username: progress.username,
    });
  }
}

export async function getWatchProgress(username: string): Promise<WatchProgress[]> {
  const { data } = await supabase
    .from('watch_progress')
    .select('*')
    .eq('username', username)
    .gt('progress_time', 5)
    .order('updated_at', { ascending: false })
    .limit(20);
  return (data as unknown as WatchProgress[]) || [];
}
