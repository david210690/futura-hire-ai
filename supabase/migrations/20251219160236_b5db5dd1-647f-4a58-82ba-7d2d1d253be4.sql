-- Create calendar_connections table to store OAuth tokens
CREATE TABLE public.calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT,
  calendar_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create calendar_events table for synced events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_connection_id UUID NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  external_event_id TEXT,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  reference_type TEXT,
  reference_id UUID,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for calendar_connections
CREATE POLICY "Users can view their own calendar connections"
ON public.calendar_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar connections"
ON public.calendar_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections"
ON public.calendar_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connections"
ON public.calendar_connections FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for calendar_events
CREATE POLICY "Users can view their own calendar events"
ON public.calendar_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_connections cc
    WHERE cc.id = calendar_events.calendar_connection_id
    AND cc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own calendar events"
ON public.calendar_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendar_connections cc
    WHERE cc.id = calendar_events.calendar_connection_id
    AND cc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own calendar events"
ON public.calendar_events FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_connections cc
    WHERE cc.id = calendar_events.calendar_connection_id
    AND cc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own calendar events"
ON public.calendar_events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_connections cc
    WHERE cc.id = calendar_events.calendar_connection_id
    AND cc.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_calendar_connections_updated_at
BEFORE UPDATE ON public.calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_calendar_connections_user_id ON public.calendar_connections(user_id);
CREATE INDEX idx_calendar_events_connection_id ON public.calendar_events(calendar_connection_id);
CREATE INDEX idx_calendar_events_reference ON public.calendar_events(reference_type, reference_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);