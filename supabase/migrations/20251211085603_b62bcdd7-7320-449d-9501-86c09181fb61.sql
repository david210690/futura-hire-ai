-- Create message templates table
CREATE TABLE public.job_twin_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'initial_outreach', 'follow_up', 'thank_you', 'negotiation'
  channel TEXT NOT NULL DEFAULT 'email', -- 'email', 'linkedin'
  subject TEXT,
  body TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_twin_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own templates" ON public.job_twin_message_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates" ON public.job_twin_message_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.job_twin_message_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.job_twin_message_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_job_twin_message_templates_updated_at
  BEFORE UPDATE ON public.job_twin_message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();