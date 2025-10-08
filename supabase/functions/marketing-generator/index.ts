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

    // Rate limit: 3 runs per day per job
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRuns } = await supabase
      .from('ai_runs')
      .select('id')
      .eq('kind', 'marketing')
      .eq('input_ref', jobId)
      .gte('created_at', dayAgo);

    if (recentRuns && recentRuns.length >= 3) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. You can generate marketing assets 3 times per day.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get job details with company values
    const { data: job } = await supabase
      .from('jobs')
      .select(`
        title,
        jd_text,
        companies!inner(
          name,
          values_text
        )
      `)
      .eq('id', jobId)
      .single();

    if (!job) throw new Error('Job not found');

    const companies = job.companies as any;
    const companyName = companies?.name || 'our company';
    const companyValues = companies?.values_text || 'innovation and teamwork';

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
            content: 'You are a recruitment marketing copywriter. Output ONLY valid JSON. Be crisp, human, and high-conversion.'
          },
          {
            role: 'user',
            content: `Create a LinkedIn post, an outreach email to passive candidates, and a short DM for direct messages. Use the job & company context. Avoid buzzwords; be specific. Return ONLY valid JSON.

Schema:
{
  "linkedin_post": "string",
  "outreach_email": "string",
  "candidate_message": "string"
}

Job: ${job.title}
JD: ${job.jd_text}
Company: ${companyName}
Values: ${companyValues}`
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
      kind: 'marketing',
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
          kind: 'marketing',
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
