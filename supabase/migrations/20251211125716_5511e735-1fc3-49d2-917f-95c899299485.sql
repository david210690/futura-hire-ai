-- Create career_trajectory_snapshots table
CREATE TABLE public.career_trajectory_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_trajectory_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view their own trajectories
CREATE POLICY "Users can view own career trajectories"
ON public.career_trajectory_snapshots
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own trajectories
CREATE POLICY "Users can create own career trajectories"
ON public.career_trajectory_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- System can manage trajectories (for edge functions)
CREATE POLICY "System can manage career trajectories"
ON public.career_trajectory_snapshots
FOR ALL
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_career_trajectory_snapshots_updated_at
BEFORE UPDATE ON public.career_trajectory_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();