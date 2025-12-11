-- Create opportunity_radar_snapshots table
CREATE TABLE public.opportunity_radar_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.opportunity_radar_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only view their own snapshots
CREATE POLICY "Users can view own opportunity radar snapshots"
ON public.opportunity_radar_snapshots
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own snapshots
CREATE POLICY "Users can create own opportunity radar snapshots"
ON public.opportunity_radar_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own snapshots
CREATE POLICY "Users can update own opportunity radar snapshots"
ON public.opportunity_radar_snapshots
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_opportunity_radar_snapshots_user_id ON public.opportunity_radar_snapshots(user_id);
CREATE INDEX idx_opportunity_radar_snapshots_created_at ON public.opportunity_radar_snapshots(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_opportunity_radar_snapshots_updated_at
BEFORE UPDATE ON public.opportunity_radar_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();