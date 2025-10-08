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

  try {
    const { videoId, transcript } = await req.json();
    
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

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
            content: 'Analyze candidate video interview. Assess communication clarity, confidence, professionalism, culture fit. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Transcript:\n${transcript}\n\nReturn JSON with: summary (3 sentences), highlights (array of 3-4 positive points), red_flags (array of concerns or empty if none), confidence_score (0-100), comms_score (0-100), culture_fit_score (0-100 based on communication style, enthusiasm, clarity).`
          }
        ],
        temperature: 0.3,
      }),
    });

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
      });

    if (insertError) throw insertError;

    // Update applications with culture fit score
    const { data: video } = await supabase
      .from('videos')
      .select('candidate_id, job_id')
      .eq('id', videoId)
      .single();

    if (video?.job_id) {
      const { data: app } = await supabase
        .from('applications')
        .select('skill_fit_score')
        .eq('job_id', video.job_id)
        .eq('candidate_id', video.candidate_id)
        .single();

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

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-video:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
