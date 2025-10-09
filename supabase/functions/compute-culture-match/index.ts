import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { org_id, candidate_id } = await req.json();
    if (!org_id || !candidate_id) {
      throw new Error('Missing org_id or candidate_id');
    }

    // Get org culture profile
    const { data: profile, error: profileError } = await supabase
      .from('culture_profiles')
      .select('*')
      .eq('org_id', org_id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      throw new Error('No culture profile found for org');
    }

    const orgVector = profile.vector as Record<string, number>;

    // Get candidate signals
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single();

    // Get video analysis (latest)
    const { data: videoAnalysis } = await supabase
      .from('video_analysis')
      .select('*')
      .eq('video_id', await (async () => {
        const { data: video } = await supabase
          .from('videos')
          .select('id')
          .eq('candidate_id', candidate_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return video?.id;
      })())
      .maybeSingle();

    // Build candidate vector from signals
    const candidateVector: Record<string, number> = {
      communication: videoAnalysis?.comms_score || 50,
      ownership: videoAnalysis?.confidence_score || 50,
      collaboration: 50, // Default, could extract from resume/interview
      stability: 50,
      risk_taking: 50,
    };

    // Compute cosine similarity (normalized dot product)
    const dimensions = Object.keys(orgVector);
    let dotProduct = 0;
    let orgMagnitude = 0;
    let candMagnitude = 0;

    for (const dim of dimensions) {
      const orgVal = orgVector[dim] || 0;
      const candVal = candidateVector[dim] || 0;
      dotProduct += orgVal * candVal;
      orgMagnitude += orgVal * orgVal;
      candMagnitude += candVal * candVal;
    }

    orgMagnitude = Math.sqrt(orgMagnitude);
    candMagnitude = Math.sqrt(candMagnitude);

    const cosineSim = (orgMagnitude > 0 && candMagnitude > 0) 
      ? dotProduct / (orgMagnitude * candMagnitude) 
      : 0.5;

    // Convert to 0-100 score
    const matchScore = Math.round(cosineSim * 100);

    // Use LLM to generate rationale
    const systemPrompt = `Explain culture match succinctly. Output ONLY JSON.`;
    const userPrompt = `Given org culture vector and candidate signals, return a 2-3 sentence rationale and top 3 factors that drive the score.

Schema: {"rationale":"string","top_factors":["string","string","string"]}

Org Vector: ${JSON.stringify(orgVector)}
Candidate Signals: ${JSON.stringify(candidateVector)}
Match Score: ${matchScore}%`;

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
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    let factors = { rationale: 'Culture match computed', top_factors: [] };
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        factors = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
      }
    }

    // Save culture match
    const { data: match, error: matchError } = await supabase
      .from('culture_matches')
      .upsert({
        org_id,
        candidate_id,
        match_score: matchScore,
        factors,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (matchError) throw matchError;

    return new Response(JSON.stringify(match), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compute-culture-match:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});