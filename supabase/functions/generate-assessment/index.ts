import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { org_id, role_or_jd, options } = await req.json();
    const { duration_minutes = 60, num_questions = 15, include_culture = false, include_coding = false } = options || {};

    console.log('Generating assessment for org:', org_id);

    // Check usage limits
    const usage = await supabase.rpc('increment_usage', {
      _org_id: org_id,
      _metric: 'assessment_generation'
    });

    if (usage.error) throw usage.error;
    if (usage.data && usage.data.remaining < 0) {
      return new Response(
        JSON.stringify({ error: 'Daily limit reached for assessment generation' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call AI to generate questions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are a professional hiring assessment generator. Generate practical, job-relevant test questions. 
Output ONLY valid JSON with no additional text or markdown formatting.`;

    const userPrompt = `Create a ${num_questions}-question assessment for this role/JD.

Requirements:
- Mix of difficulty levels (easy: 30%, medium: 50%, hard: 20%)
- Question types: MCQ for knowledge, free_text for analysis, coding for technical roles
- ${include_culture ? 'Include 2-3 culture fit questions' : ''}
- ${include_coding ? 'Include 3-4 coding challenges' : ''}
- Keep questions practical and scenario-based
- Provide clear rubrics for free_text and coding questions

Role/JD: ${role_or_jd}

Return JSON in this exact schema:
{
  "questions": [
    {
      "type": "mcq|free_text|coding",
      "difficulty": "easy|medium|hard",
      "skill_tags": ["string"],
      "question": "string",
      "options": ["option1", "option2", "option3", "option4"],
      "answer_key": {"index": 0},
      "rubric": {"criteria": ["criterion1", "criterion2"], "max_points": 10},
      "points": 10
    }
  ],
  "recommended_duration_minutes": 60
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
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
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      throw new Error('Failed to generate assessment');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Extract JSON from response (handle markdown code blocks)
    let parsedContent;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedContent = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid AI response format');
    }

    const { questions } = parsedContent;

    // Insert questions into question_bank
    const questionInserts = questions.map((q: any) => ({
      org_id,
      source: 'auto' as const,
      role_tag: role_or_jd.substring(0, 100),
      skill_tags: q.skill_tags || [],
      type: q.type,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options ? JSON.stringify(q.options) : null,
      answer_key: q.answer_key ? JSON.stringify(q.answer_key) : null,
      rubric: q.rubric ? JSON.stringify(q.rubric) : null,
      points: q.points || 10
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('question_bank')
      .insert(questionInserts)
      .select();

    if (insertError) throw insertError;

    // Create assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        org_id,
        name: `Assessment for ${role_or_jd.substring(0, 50)}`,
        purpose: include_coding ? 'coding' : 'skills',
        description: `Auto-generated assessment`,
        duration_minutes: parsedContent.recommended_duration_minutes || duration_minutes,
        total_points: questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0),
        shuffle: true,
        passing_score: 70,
        created_by: user.id
      })
      .select()
      .single();

    if (assessmentError) throw assessmentError;

    // Link questions to assessment
    const questionLinks = insertedQuestions!.map((q: any, index: number) => ({
      assessment_id: assessment.id,
      question_id: q.id,
      order_index: index
    }));

    const { error: linkError } = await supabase
      .from('assessment_questions')
      .insert(questionLinks);

    if (linkError) throw linkError;

    return new Response(
      JSON.stringify({ assessment_id: assessment.id, questions_generated: questions.length }),
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
