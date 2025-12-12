-- Create table for tracking hiring plan task completion
CREATE TABLE public.hiring_plan_task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  task_key TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_twin_job_id, user_id, task_key)
);

-- Enable RLS
ALTER TABLE public.hiring_plan_task_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own task completions
CREATE POLICY "Users can view their own task completions"
ON public.hiring_plan_task_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own task completions
CREATE POLICY "Users can insert their own task completions"
ON public.hiring_plan_task_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own task completions
CREATE POLICY "Users can delete their own task completions"
ON public.hiring_plan_task_completions
FOR DELETE
USING (auth.uid() = user_id);