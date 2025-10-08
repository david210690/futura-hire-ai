import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 3 video analyses per candidate per hour
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const hourAgo = now - 3600000;
  
  const timestamps = rateLimitMap.get(userId) || [];
  const recentCalls = timestamps.filter(t => t > hourAgo);
  
  if (recentCalls.length >= 3) {
    return false;
  }
  
  recentCalls.push(now);
  rateLimitMap.set(userId, recentCalls);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let supabase;

  try {
    const { videoId, transcript } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      throw new Error('Rate limit exceeded. Maximum 3 video analyses per hour.');
    }

    // Get video and candidate info
    const { data: video } = await supabase
      .from('videos')
      .select('candidate_id, job_id')
      .eq('id', videoId)
      .single();

    if (!video) throw new Error('Video not found');

    // Get company values if video is linked to a job
    let companyValues = '';
    let jdText = '';
    
    if (video.job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('jd_text, company_id, companies!inner(values_text)')
        .eq('id', video.job_id)
        .maybeSingle();
      
      if (job) {
        jdText = job.jd_text;
        const companies = job.companies as any;
        companyValues = companies?.values_text || '';
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Analyze video transcript
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
            content: 'You analyze candidate interview/intro videos. Use company values if provided. Return ONLY JSON.'
          },
          {
            role: 'user',
            content: `Summarize the transcript, list highlights and red flags, then score confidence, communication, and culture fit (0-100). Provide a short rationale referencing company values.

Schema:
{
  "summary": "string",
  "highlights": ["string"],
  "red_flags": ["string"],
  "confidence_score": 0,
  "comms_score": 0,
  "culture_fit_score": 0,
  "rationale": "string"
}

${companyValues ? `Company Values: ${companyValues}\n\n` : ''}${jdText ? `JD: ${jdText}\n\n` : ''}Transcript: ${transcript}`
          }
        ],
        temperature: 0.3,
      }),
    });

    const latency = Date.now() - startTime;

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    // Save analysis
    const { error: insertError } = await supabase
      .from('video_analysis')
      .insert({
        video_id: videoId,
        transcript,
        summary: analysis.summary,
        highlights: JSON.stringify(analysis.highlights),
        red_flags: JSON.stringify(analysis.red_flags || []),
        confidence_score: analysis.confidence_score,
        comms_score: analysis.comms_score,
        rationale: analysis.rationale,
      });

    if (insertError) throw insertError;

    // Update applications with culture fit score
    if (video.job_id) {
      const { data: app } = await supabase
        .from('applications')
        .select('skill_fit_score')
        .eq('job_id', video.job_id)
        .eq('candidate_id', video.candidate_id)
        .maybeSingle();

      if (app) {
        const overall = Math.round(app.skill_fit_score * 0.6 + analysis.culture_fit_score * 0.4);
        await supabase
          .from('applications')
          .update({ 
            culture_fit_score: analysis.culture_fit_score,
            overall_score: overall 
          })
          .eq('job_id', video.job_id)
          .eq('candidate_id', video.candidate_id);
      }
    }

    // Log AI run
    await supabase.from('ai_runs').insert({
      kind: 'video',
      input_ref: videoId,
      output_json: analysis,
      latency_ms: latency,
      model_name: 'google/gemini-2.5-flash',
      status: 'ok',
      created_by: user.id
    });

    // Log audit
    await supabase.rpc('log_audit', {
      p_action: 'analyze_video',
      p_entity_type: 'video',
      p_entity_id: videoId,
      p_meta_json: { culture_fit_score: analysis.culture_fit_score }
    });

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error('Error in analyze-video:', error);

    // Log failed AI run
    if (supabase) {
      try {
        await supabase.from('ai_runs').insert({
          kind: 'video',
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
      { status: error.message.includes('Rate limit') ? 429 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
