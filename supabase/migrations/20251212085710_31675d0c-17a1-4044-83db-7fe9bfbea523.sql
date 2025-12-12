-- Create role_dna_fit_requests table
CREATE TABLE public.role_dna_fit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_twin_job_id UUID NOT NULL REFERENCES public.job_twin_jobs(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_fit_requests_user_job ON public.role_dna_fit_requests(user_id, job_twin_job_id);
CREATE INDEX idx_fit_requests_requested_by ON public.role_dna_fit_requests(requested_by_user_id);

-- Enable RLS
ALTER TABLE public.role_dna_fit_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Candidates can view their own fit requests
CREATE POLICY "Users can view their own fit requests"
ON public.role_dna_fit_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Recruiters can view fit requests they created
CREATE POLICY "Recruiters can view fit requests they created"
ON public.role_dna_fit_requests
FOR SELECT
USING (auth.uid() = requested_by_user_id);

-- System can manage fit requests (for edge functions)
CREATE POLICY "System can manage fit requests"
ON public.role_dna_fit_requests
FOR ALL
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_role_dna_fit_requests_updated_at
BEFORE UPDATE ON public.role_dna_fit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();