import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interview_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get interview ratings and related data
    const { data: ratings, error: ratingsError } = await supabase
      .from('interview_ratings')
      .select('*, interviews!inner(job_id, candidate_id)')
      .eq('interview_id', interview_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ratingsError) {
      console.error('Ratings fetch error:', ratingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch interview ratings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ratings) {
      return new Response(
        JSON.stringify({ error: 'Interview ratings not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optionally get video summary
    let videoSummary = null;
    const { data: videoData } = await supabase
      .from('video_analysis')
      .select('summary')
      .eq('video_id', (await supabase
        .from('videos')
        .select('id')
        .eq('candidate_id', ratings.interviews.candidate_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle())?.data?.id || '')
      .maybeSingle();

    if (videoData?.summary) {
      videoSummary = videoData.summary;
    }

    // Build system prompt
    const systemPrompt = `You create concise interview feedback for hiring panels. Be specific, neutral, and actionable. Output ONLY valid JSON with this exact schema:
{
  "strengths": ["string", "string", "string"],
  "concerns": ["string", "string", "string"],
  "recommendation": "string (1 paragraph)",
  "decision": "yes|no|maybe"
}`;

    const ratingsJson = JSON.stringify({
      tech_depth: ratings.tech_depth,
      problem_solving: ratings.problem_solving,
      communication: ratings.communication,
      culture_add: ratings.culture_add,
      hire_recommend: ratings.hire_recommend,
      notes: ratings.notes
    });

    const userPrompt = `Given the structured ratings and notes${videoSummary ? ' and video summary' : ''}, produce: 3 bullet strengths, 3 bullet concerns, 1 paragraph recommendation, and a hire decision ("yes"|"no"|"maybe") consistent with ratings.

Ratings JSON: ${ratingsJson}
${videoSummary ? `Optional Summary: ${videoSummary}` : ''}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Parse JSON from content
    let feedback;
    try {
      feedback = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update interview ratings with formatted feedback
    const formattedNotes = `
AI Panel Brief:

Strengths:
${feedback.strengths.map((s: string) => `• ${s}`).join('\n')}

Concerns:
${feedback.concerns.map((c: string) => `• ${c}`).join('\n')}

Recommendation:
${feedback.recommendation}

Decision: ${feedback.decision}
`;

    const { error: updateError } = await supabase
      .from('interview_ratings')
      .update({ notes: formattedNotes })
      .eq('id', ratings.id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Log AI run
    await supabase
      .from('ai_runs')
      .insert({
        kind: 'interview_feedback',
        model_name: 'google/gemini-2.5-flash',
        input_ref: interview_id,
        output_json: feedback,
        status: 'ok'
      });

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
