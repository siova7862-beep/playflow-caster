import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      throw new Error('Username and password required');
    }

    const m3uUrl = `http://cdnflash.top:80/get.php?username=${username}&password=${password}&type=m3u_plus&output=mpegts`;

    const res = await fetch(m3uUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10)' },
    });

    if (!res.ok) {
      throw new Error(`M3U fetch failed: ${res.status}`);
    }

    return new Response(res.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
