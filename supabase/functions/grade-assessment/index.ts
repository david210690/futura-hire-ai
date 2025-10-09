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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { attempt_id } = await req.json();
    console.log('Grading attempt:', attempt_id);

    // Get attempt with answers
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*, attempt_answers(*), assignments!inner(assessment_id)')
      .eq('id', attempt_id)
      .single();

    if (attemptError) throw attemptError;

    // Get passing score
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('passing_score, total_points')
      .eq('id', attempt.assignments.assessment_id)
      .single();

    if (assessmentError) throw assessmentError;

    let totalScore = 0;

    // Grade each answer
    for (const answer of attempt.attempt_answers) {
      // Get question details
      const { data: question, error: questionError } = await supabase
        .from('question_bank')
        .select('*')
        .eq('id', answer.question_id)
        .single();

      if (questionError) continue;

      let score = 0;
      let feedback = '';

      if (question.type === 'mcq') {
        // Auto-grade MCQ
        const answerKey = typeof question.answer_key === 'string' 
          ? JSON.parse(question.answer_key) 
          : question.answer_key;
        const response = typeof answer.response === 'string'
          ? JSON.parse(answer.response)
          : answer.response;
        
        if (response.index === answerKey.index) {
          score = question.points;
          feedback = 'Correct answer';
        } else {
          score = 0;
          feedback = 'Incorrect answer';
        }
      } else {
        // AI-grade free_text and coding
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        const rubric = typeof question.rubric === 'string'
          ? JSON.parse(question.rubric)
          : question.rubric;

        const response = typeof answer.response === 'string'
          ? JSON.parse(answer.response)
          : answer.response;

        const systemPrompt = `You are a strict but fair assessment grader. Grade answers according to the rubric. Award partial credit when appropriate. Return ONLY valid JSON.`;

        const userPrompt = `Grade this candidate's answer:

Question: ${question.question}
Rubric: ${JSON.stringify(rubric)}
Candidate Answer: ${response.text || response}

Return JSON: {"score": number, "feedback": "string"}`;

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

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices[0].message.content;
          
          try {
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : content;
            const gradeResult = JSON.parse(jsonStr);
            score = Math.min(gradeResult.score, question.points);
            feedback = gradeResult.feedback;
          } catch (e) {
            console.error('Failed to parse AI grading:', content);
            score = 0;
            feedback = 'Auto-grading failed';
          }
        }
      }

      // Update answer with score and feedback
      await supabase
        .from('attempt_answers')
        .update({
          auto_score: score,
          ai_feedback: feedback
        })
        .eq('id', answer.id);

      totalScore += score;
    }

    // Calculate final grade
    const finalGrade = Math.round((totalScore / assessment.total_points) * 100);
    const pass = finalGrade >= assessment.passing_score;

    // Update attempt
    await supabase
      .from('attempts')
      .update({
        ai_grade: finalGrade,
        final_grade: finalGrade,
        pass
      })
      .eq('id', attempt_id);

    // Update assignment status
    await supabase
      .from('assignments')
      .update({ status: 'graded' })
      .eq('id', attempt.assignment_id);

    return new Response(
      JSON.stringify({ final_grade: finalGrade, pass, total_score: totalScore }),
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
