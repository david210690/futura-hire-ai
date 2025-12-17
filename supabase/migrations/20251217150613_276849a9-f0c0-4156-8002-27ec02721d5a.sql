-- Create analytics_events table for tracking user activity
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view', 'action', 'page_exit'
  page_path TEXT NOT NULL,
  page_title TEXT,
  action_name TEXT, -- for action events: 'button_click', 'form_submit', etc.
  action_target TEXT, -- what was clicked/submitted
  referrer_path TEXT, -- previous page
  time_on_page_ms INTEGER, -- duration spent on page
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_page_path ON public.analytics_events(page_path);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- System can insert events (from client)
CREATE POLICY "System can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics"
ON public.analytics_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create analytics_sessions table for session-level data
CREATE TABLE public.analytics_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_pages_viewed INTEGER DEFAULT 0,
  total_actions INTEGER DEFAULT 0,
  entry_page TEXT,
  exit_page TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_analytics_sessions_user_id ON public.analytics_sessions(user_id);
CREATE INDEX idx_analytics_sessions_started_at ON public.analytics_sessions(started_at DESC);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage analytics sessions"
ON public.analytics_sessions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view sessions"
ON public.analytics_sessions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));