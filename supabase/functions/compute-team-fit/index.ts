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

    const { team_id, candidate_id } = await req.json();
    if (!team_id || !candidate_id) {
      throw new Error('Missing team_id or candidate_id');
    }

    // Get team profile
    const { data: teamProfile, error: teamError } = await supabase
      .from('team_profiles')
      .select('*')
      .eq('team_id', team_id)
      .maybeSingle();

    if (teamError) throw teamError;
    if (!teamProfile) throw new Error('No team profile found');

    const teamVector = teamProfile.vector as Record<string, number>;

    // Build candidate trait vector from signals
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

    // Estimate candidate traits from available signals
    const candidateVector: Record<string, number> = {
      creativity: 50, // Default
      analysis: 50,
      execution: 50,
      communication: videoAnalysis?.comms_score || 50,
      empathy: videoAnalysis?.confidence_score || 50,
    };

    // Compute fit score
    const dimensions = Object.keys(teamVector);
    
    // Identify gaps (where team is weak)
    const gaps: string[] = [];
    const fills: string[] = [];
    let fitScore = 0;

    for (const dim of dimensions) {
      const teamVal = teamVector[dim] || 50;
      const candVal = candidateVector[dim] || 50;
      
      // If team lacks this trait and candidate has it, it's a fill
      if (teamVal < 40 && candVal > 60) {
        gaps.push(dim);
        fills.push(`Brings strong ${dim} (${candVal}) to complement team's ${teamVal}`);
        fitScore += 20; // Reward filling gaps
      }
      
      // If both high, potential crowding
      if (teamVal > 70 && candVal > 70) {
        fitScore -= 5; // Slight penalty for redundancy
      }
      
      // Base similarity score
      const similarity = 100 - Math.abs(teamVal - candVal);
      fitScore += similarity * 0.5;
    }

    fitScore = Math.max(0, Math.min(100, Math.round(fitScore / dimensions.length)));

    // Use LLM for detailed explanation
    const systemPrompt = `Explain team-candidate fit succinctly. Output ONLY JSON.`;
    const userPrompt = `Given team traits and candidate traits, list 3 gaps the candidate fills (if any) and 2 potential frictions to watch.

Schema: {"fills":["string","string","string"],"frictions":["string","string"],"note":"string"}

Team: ${JSON.stringify(teamVector)}
Candidate: ${JSON.stringify(candidateVector)}`;

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
        temperature: 0.6,
      }),
    });

    let aiData = { fills: fills.length > 0 ? fills : ['Balanced profile'], frictions: [], note: 'Team fit computed' };
    
    if (aiResponse.ok) {
      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          aiData = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (e) {
          console.error('Failed to parse AI response:', content);
        }
      }
    }

    // Save team fit score
    const { data: fitData, error: fitError } = await supabase
      .from('team_fit_scores')
      .upsert({
        team_id,
        candidate_id,
        fit: fitScore,
        gaps: gaps,
        fills: aiData.fills || [],
        frictions: aiData.frictions || [],
        note: aiData.note,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (fitError) throw fitError;

    // Log AI run
    await supabase
      .from('ai_runs')
      .insert({
        kind: 'team_fit',
        model_name: 'google/gemini-2.5-flash',
        latency_ms: 0,
        status: 'ok',
        input_ref: fitData.id,
        output_json: aiData,
      });

    return new Response(JSON.stringify(fitData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compute-team-fit:', error);
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