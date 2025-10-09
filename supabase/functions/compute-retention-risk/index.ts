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

    const { hire_id } = await req.json();
    if (!hire_id) {
      throw new Error('Missing hire_id');
    }

    // Get hire details
    const { data: hire, error: hireError } = await supabase
      .from('hires')
      .select('*, applications(*)')
      .eq('id', hire_id)
      .single();

    if (hireError) throw hireError;

    const application = hire.applications;
    
    // Get culture match
    const { data: cultureMatch } = await supabase
      .from('culture_matches')
      .select('*')
      .eq('org_id', hire.org_id)
      .eq('candidate_id', application.candidate_id)
      .maybeSingle();

    // Get predictive score
    const { data: predictiveScore } = await supabase
      .from('predictive_scores')
      .select('*')
      .eq('application_id', hire.application_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get pulse checks
    const { data: pulseChecks } = await supabase
      .from('pulse_checks')
      .select('*')
      .eq('hire_id', hire_id)
      .order('day', { ascending: false });

    // Compute heuristic retention risk for each horizon
    const horizons: Array<'30d' | '60d' | '90d'> = ['30d', '60d', '90d'];
    const results = [];

    for (const horizon of horizons) {
      let base = 50;

      // Culture match contribution
      if (cultureMatch) {
        base += 0.2 * (cultureMatch.match_score - 50);
      }

      // Predictive hire score contribution
      if (predictiveScore) {
        base += 0.2 * (predictiveScore.success_probability - 50);
      }

      // Pulse checks contribution
      if (pulseChecks && pulseChecks.length > 0) {
        const teamSupportScores: number[] = [];
        const clarityScores: number[] = [];

        for (const check of pulseChecks) {
          const selfReport = check.self_report as any;
          if (selfReport?.team_support) teamSupportScores.push(selfReport.team_support);
          if (selfReport?.clarity) clarityScores.push(selfReport.clarity);
        }

        if (teamSupportScores.length > 0) {
          const avgTeamSupport = teamSupportScores.reduce((a, b) => a + b, 0) / teamSupportScores.length;
          base += -0.1 * (avgTeamSupport - 3) * 20; // More support lowers risk
        }

        if (clarityScores.length > 0) {
          const avgClarity = clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length;
          base += -0.1 * (avgClarity - 3) * 20; // More clarity lowers risk
        }
      }

      // Clamp to 0-100
      const risk = Math.max(0, Math.min(100, Math.round(base)));

      // Generate AI tips
      const contextJson = JSON.stringify({
        risk,
        culture_match: cultureMatch?.match_score || 'N/A',
        hire_score: predictiveScore?.success_probability || 'N/A',
        pulse_checks: pulseChecks?.length || 0,
        org_id: hire.org_id,
      });

      const systemPrompt = `You suggest specific retention interventions for new hires. Output ONLY JSON.`;
      const userPrompt = `Given risk drivers and horizon, return 3-5 actionable tips for manager.

Schema: {"tips":["string"],"rationale":"string"}

Context: ${contextJson}
Horizon: ${horizon}`;

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

      let tips: string[] = [];
      let rationale = 'Retention risk computed';

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
            tips = parsed.tips || [];
            rationale = parsed.rationale || rationale;
          } catch (e) {
            console.error('Failed to parse AI response:', content);
          }
        }
      }

      // Upsert retention score
      const { data: score, error: scoreError } = await supabase
        .from('retention_scores')
        .upsert({
          hire_id,
          horizon,
          risk,
          rationale,
          tips,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (scoreError) throw scoreError;
      results.push(score);
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compute-retention-risk:', error);
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