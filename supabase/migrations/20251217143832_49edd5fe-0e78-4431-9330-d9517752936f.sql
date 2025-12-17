-- Create email_logs table for monitoring transactional email delivery
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.orgs(id),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only org members can view their org's email logs
CREATE POLICY "Org members can view email logs"
ON public.email_logs
FOR SELECT
USING (is_org_member(auth.uid(), org_id));

-- Service role can insert logs (edge functions)
CREATE POLICY "Service can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_email_logs_org_id ON public.email_logs(org_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);