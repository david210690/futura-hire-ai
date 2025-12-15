-- Create pilot_leads table for lead capture
CREATE TABLE public.pilot_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  hiring_volume TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pilot_leads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (no auth required for lead capture)
CREATE POLICY "Anyone can submit pilot leads"
ON public.pilot_leads
FOR INSERT
WITH CHECK (true);

-- Only authenticated admins can view leads (we'll handle this via edge function)
CREATE POLICY "No public read access"
ON public.pilot_leads
FOR SELECT
USING (false);