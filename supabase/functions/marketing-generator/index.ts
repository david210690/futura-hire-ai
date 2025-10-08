import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let supabase;

  try {
    const { jobId } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Get job details
    const { data: job } = await supabase
      .from('jobs')
      .select('title, jd_text, location, seniority, companies!inner(name)')
      .eq('id', jobId)
      .single();

    if (!job) throw new Error('Job not found');

    const companies = job.companies as any;
    const companyName = companies?.name || 'our company';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You create compelling talent marketing content. Return ONLY JSON.'
          },
          {
            role: 'user',
            content: `Create marketing content for this job posting. Return ONLY valid JSON.

Schema:
{
  "linkedin_post": "string",
  "outreach_email": "string",
  "candidate_message": "string"
}

Company: ${companyName}
Job Title: ${job.title}
Location: ${job.location}
Seniority: ${job.seniority}

Job Description:
${job.jd_text}

Provide:
- linkedin_post: Engaging LinkedIn post (100-150 words) with emojis and call-to-action
- outreach_email: Professional email template (use [Name] placeholder, 150-200 words)
- candidate_message: Short, friendly message for direct outreach (50-75 words, use [Name])`
          }
        ],
        temperature: 0.7,
      }),
    });

    const latency = Date.now() - startTime;

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const assets = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    // Save or update marketing assets
    const { data: existing } = await supabase
      .from('marketing_assets')
      .select('id')
      .eq('job_id', jobId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('marketing_assets')
        .update({
          linkedin_post: assets.linkedin_post,
          outreach_email: assets.outreach_email,
          candidate_message: assets.candidate_message
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('marketing_assets').insert({
        job_id: jobId,
        linkedin_post: assets.linkedin_post,
        outreach_email: assets.outreach_email,
        candidate_message: assets.candidate_message
      });
    }

    // Log AI run
    await supabase.from('ai_runs').insert({
      kind: 'shortlist',
      input_ref: jobId,
      output_json: assets,
      latency_ms: latency,
      model_name: 'google/gemini-2.5-flash',
      status: 'ok',
      created_by: user.id
    });

    return new Response(
      JSON.stringify({ success: true, assets }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('Error in marketing-generator:', error);

    if (supabase) {
      try {
        await supabase.from('ai_runs').insert({
          kind: 'shortlist',
          status: 'error',
          error_message: error.message,
          latency_ms: latency,
          model_name: 'google/gemini-2.5-flash'
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
