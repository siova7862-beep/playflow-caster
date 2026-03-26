-- Create accesses table
CREATE TABLE IF NOT EXISTS public.accesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT 'cdnflash.top',
  port INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.accesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active accesses" ON public.accesses
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert accesses" ON public.accesses
  FOR INSERT WITH CHECK (true);

-- Create notices table
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  admin_name TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notices" ON public.notices
  FOR SELECT USING (true);

-- Create watch_progress table
CREATE TABLE IF NOT EXISTS public.watch_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_name TEXT NOT NULL,
  content_url TEXT NOT NULL,
  content_logo TEXT NOT NULL DEFAULT '',
  content_group TEXT NOT NULL DEFAULT '',
  progress_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_duration DOUBLE PRECISION NOT NULL DEFAULT 0,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read watch progress" ON public.watch_progress
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert watch progress" ON public.watch_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update watch progress" ON public.watch_progress
  FOR UPDATE USING (true);

CREATE INDEX idx_watch_progress_username ON public.watch_progress(username);
CREATE INDEX idx_watch_progress_url_user ON public.watch_progress(content_url, username);