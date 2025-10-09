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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { problem_statement, org_id } = await req.json();

    if (!problem_statement || !org_id) {
      throw new Error('Missing required fields');
    }

    // Fetch org context
    const { data: company } = await supabase
      .from('companies')
      .select('values_text, size_band, name')
      .eq('org_id', org_id)
      .maybeSingle();

    const orgContext = company ? `Organization: ${company.name || 'Unknown'}
Size: ${company.size_band || 'N/A'}
Values: ${company.values_text || 'Not specified'}` : '';

    const systemPrompt = `You are a role designer for startups. Output ONLY valid JSON.`;
    
    const userPrompt = `Convert this business problem into hiring artifacts: 3 role title options, a skills matrix (must/plus/nice), a concise JD draft (4-6 bullets + responsibilities), and 6-8 interview questions (mix fundamentals, scenario, culture).

Schema:
{
  "titles": ["string","string","string"],
  "skills_matrix": {
    "must_have": ["string"],
    "plus": ["string"],
    "nice_to_have": ["string"]
  },
  "jd_draft": "string",
  "interview_kit": ["string"]
}

Problem: ${problem_statement}

${orgContext ? `Org Context:\n${orgContext}` : ''}`;

    const startTime = Date.now();
    
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
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const latency = Date.now() - startTime;
    
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON from AI');
    }

    // Insert role design
    const { data: roleDesign, error: insertError } = await supabase
      .from('role_designs')
      .insert({
        org_id,
        user_id: user.id,
        problem_statement,
        suggested_titles: parsed.titles,
        skills_matrix: parsed.skills_matrix,
        jd_draft: parsed.jd_draft,
        interview_kit: parsed.interview_kit,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Create version 1
    await supabase
      .from('role_design_versions')
      .insert({
        role_design_id: roleDesign.id,
        version: 1,
        jd_draft: parsed.jd_draft,
        interview_kit: parsed.interview_kit,
        notes: 'Initial design',
      });

    // Log AI run
    await supabase
      .from('ai_runs')
      .insert({
        kind: 'role_designer',
        model_name: 'google/gemini-2.5-flash',
        latency_ms: latency,
        status: 'ok',
        created_by: user.id,
        input_ref: roleDesign.id,
        output_json: parsed,
      });

    return new Response(JSON.stringify(roleDesign), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in design-role function:', error);
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