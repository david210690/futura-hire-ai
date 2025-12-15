import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INTERVIEW_EVAL_SYSTEM_PROMPT = `
You are a calm, supportive practice reflection guide for an AI job platform called FuturHire.

IMPORTANT CONTEXT:
- This was a PRACTICE conversation, not a real interview.
- There are no right or wrong answers.
- Your goal is to help the candidate see patterns and feel encouraged.
- You must be neurodiversity-aware and emotionally safe.

YOUR ROLE:
- Generate supportive, growth-oriented feedback.
- Identify observable communication signals (not personality traits).
- Suggest areas the candidate may want to practice more.
- Use warm, neutral language throughout.

DO NOT:
- Use words like "pass", "fail", "reject", "weak", "poor", "bad".
- Judge answers as good or bad.
- Compare the candidate to others.
- Infer personality traits or protected attributes.
- Be harsh or discouraging.

LANGUAGE GUIDELINES:
- Instead of "weak communication" → "still developing clarity"
- Instead of "failed to answer" → "may want to practice this type of question"
- Instead of "poor structure" → "opportunity to add more structure"
- Validate effort, not performance.
- Frame everything as "practice focus" not "weaknesses".

SCORING (for internal tracking only):
- Scores are directional signals, NOT pass/fail judgments.
- Per-dimension scores: 0–10 (observation scale, not quality scale)
- overall_score: 0–100 (readiness indicator, not judgment)
- Present scores as "where you are now" not "how you did".

IMPORTANT CONSTRAINTS:
- YOU MUST RETURN ONLY VALID JSON, no surrounding text.
- Use the exact JSON schema provided.
- All numeric scores must be integers.

OBSERVATION DIMENSIONS:
- communication_clarity: How clearly ideas were expressed.
- structure_and_flow: Use of logical structure in responses.
- technical_depth: Specificity of technical content (if applicable).
- behavioral_maturity: Self-awareness and reflection in answers.
- role_fit: Alignment with the role being practiced for.
- confidence_and_tone: Presence and composure observed.

FEEDBACK STYLE:
- Be specific and actionable.
- Use supportive phrasing: "You might find it helpful to..." not "You need to improve..."
- Practice focus should be encouraging tasks: "Try practicing..." not "Work on your weaknesses..."

If the transcript is short or incomplete:
- Acknowledge limited data warmly.
- Provide whatever supportive observations are possible.
- Never penalize the candidate for technical issues.

JSON Schema you must return:
{
  "overall_score": 0,
  "scores": {
    "communication_clarity": 0,
    "structure_and_flow": 0,
    "technical_depth": 0,
    "behavioral_maturity": 0,
    "role_fit": 0,
    "confidence_and_tone": 0
  },
  "summary": {
    "one_line_summary": "",
    "strengths": [],
    "improvement_areas": [],
    "recommended_practice_focus": []
  },
  "per_question_feedback": [
    {
      "question_index": 1,
      "question_text": "",
      "answer_summary": "",
      "score": 0,
      "feedback": ""
    }
  ]
}
`;

interface Turn {
  turn_index: number;
  role: string;
  content: string;
}

interface EvaluationResult {
  overall_score: number;
  scores: {
    communication_clarity: number;
    structure_and_flow: number;
    technical_depth: number;
    behavioral_maturity: number;
    role_fit: number;
    confidence_and_tone: number;
  };
  summary: {
    one_line_summary: string;
    strengths: string[];
    improvement_areas: string[];
    recommended_practice_focus: string[];
  };
  per_question_feedback: Array<{
    question_index: number;
    question_text: string;
    answer_summary: string;
    score: number;
    feedback: string;
  }>;
}

function buildUserPrompt({ roleTitle, mode, difficulty, turnsJson }: {
  roleTitle: string;
  mode: string;
  difficulty: string;
  turnsJson: string;
}): string {
  return `You are evaluating an interview practice session for a candidate on FuturHire.

Session metadata:
- role_title: ${roleTitle}
- mode: ${mode}
- difficulty: ${difficulty}

Instructions:
1. Use the transcript below to infer questions and answers.
2. Assume turns with role = "ai" are the interviewer questions/prompts.
3. Assume turns with role = "candidate" are the candidate's answers.
4. Group the conversation into question–answer pairs based on order:
   - First "ai" chunk → the question.
   - Following "candidate" chunks until the next "ai" → the answer to that question.
5. If the candidate speaks without a preceding AI question, treat it as an answer to a generic "Tell me about yourself" question.

Here is the transcript array, in order, as JSON:

${turnsJson}

Your task:
- Build question–answer pairs from this transcript.
- Then evaluate the candidate using the scoring guidelines and JSON schema from the system prompt.

Remember:
- Return ONLY valid JSON, nothing else.
- It must match the schema exactly.`;
}

function buildFeedbackSummary(evaluation: EvaluationResult): string {
  const lines: string[] = [];
  
  // One-line summary
  if (evaluation.summary.one_line_summary) {
    lines.push(evaluation.summary.one_line_summary);
    lines.push('');
  }
  
  // Overall score
  lines.push(`**Overall Score: ${evaluation.overall_score}/100**`);
  lines.push('');
  
  // Dimension scores
  lines.push('**Dimension Scores:**');
  lines.push(`- Communication Clarity: ${evaluation.scores.communication_clarity}/10`);
  lines.push(`- Structure & Flow: ${evaluation.scores.structure_and_flow}/10`);
  lines.push(`- Technical Depth: ${evaluation.scores.technical_depth}/10`);
  lines.push(`- Behavioral Maturity: ${evaluation.scores.behavioral_maturity}/10`);
  lines.push(`- Role Fit: ${evaluation.scores.role_fit}/10`);
  lines.push(`- Confidence & Tone: ${evaluation.scores.confidence_and_tone}/10`);
  lines.push('');
  
  // Strengths
  if (evaluation.summary.strengths && evaluation.summary.strengths.length > 0) {
    lines.push('**Strengths:**');
    evaluation.summary.strengths.forEach(s => lines.push(`• ${s}`));
    lines.push('');
  }
  
  // Improvement areas
  if (evaluation.summary.improvement_areas && evaluation.summary.improvement_areas.length > 0) {
    lines.push('**Areas for Improvement:**');
    evaluation.summary.improvement_areas.forEach(s => lines.push(`• ${s}`));
    lines.push('');
  }
  
  // Practice focus
  if (evaluation.summary.recommended_practice_focus && evaluation.summary.recommended_practice_focus.length > 0) {
    lines.push('**Recommended Practice Focus:**');
    evaluation.summary.recommended_practice_focus.forEach(s => lines.push(`• ${s}`));
    lines.push('');
  }
  
  // Per-question feedback
  if (evaluation.per_question_feedback && evaluation.per_question_feedback.length > 0) {
    lines.push('**Question-by-Question Feedback:**');
    evaluation.per_question_feedback.forEach(q => {
      lines.push(`\nQ${q.question_index}: ${q.question_text}`);
      lines.push(`Score: ${q.score}/10`);
      lines.push(`Answer Summary: ${q.answer_summary}`);
      lines.push(`Feedback: ${q.feedback}`);
    });
  }
  
  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      console.error('Missing sessionId');
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Evaluating voice interview session: ${sessionId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from('voice_interview_sessions')
      .select('*, job_twin_jobs(title)')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('Error fetching session:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to fetch session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!session) {
      console.log('Session not found');
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch all turns for the session
    const { data: turns, error: turnsError } = await supabase
      .from('voice_interview_turns')
      .select('turn_index, role, content')
      .eq('session_id', sessionId)
      .order('turn_index', { ascending: true });

    if (turnsError) {
      console.error('Error fetching turns:', turnsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch turns' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. If no turns exist, return early
    if (!turns || turns.length === 0) {
      console.log('No turns found for session');
      
      await supabase
        .from('voice_interview_sessions')
        .update({
          overall_score: 0,
          feedback_summary: 'No interview transcript available for evaluation.',
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No turns to evaluate',
        overall_score: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Build turns JSON array
    const turnsArray: Turn[] = turns.map(t => ({
      turn_index: t.turn_index,
      role: t.role,
      content: t.content,
    }));
    const turnsJson = JSON.stringify(turnsArray, null, 2);

    // 5. Determine role title
    const roleTitle = session.role_title || 
      (session.job_twin_jobs as any)?.title || 
      'General Interview';

    // 6. Build user prompt
    const userPrompt = buildUserPrompt({
      roleTitle,
      mode: session.mode,
      difficulty: session.difficulty,
      turnsJson,
    });

    console.log(`Calling LLM for evaluation. Role: ${roleTitle}, Mode: ${session.mode}, Difficulty: ${session.difficulty}, Turns: ${turns.length}`);

    // 7. Call LLM
    const llmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: INTERVIEW_EVAL_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('LLM API error:', llmResponse.status, errorText);
      
      if (llmResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (llmResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`LLM API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const responseContent = llmData.choices?.[0]?.message?.content;

    if (!responseContent) {
      console.error('Empty LLM response');
      throw new Error('Empty response from LLM');
    }

    console.log('LLM response received, parsing JSON...');

    // 8. Parse LLM response as JSON
    let evaluation: EvaluationResult;
    let overallScore: number;
    let feedbackSummary: string;

    try {
      // Clean potential markdown code blocks
      let cleanedResponse = responseContent.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      evaluation = JSON.parse(cleanedResponse);
      overallScore = Math.max(0, Math.min(100, evaluation.overall_score || 0));
      feedbackSummary = buildFeedbackSummary(evaluation);
      
      console.log(`Evaluation parsed successfully. Overall score: ${overallScore}`);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', responseContent);
      
      overallScore = 0;
      feedbackSummary = 'Evaluation failed due to parsing error. The AI response could not be processed correctly. Please try again or contact support if the issue persists.';
    }

    // 9. Update the session
    const { error: updateError } = await supabase
      .from('voice_interview_sessions')
      .update({
        overall_score: overallScore,
        feedback_summary: feedbackSummary,
        status: 'completed',
        ended_at: session.ended_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to save evaluation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Session ${sessionId} evaluation complete. Score: ${overallScore}`);

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      overall_score: overallScore,
      feedback_summary: feedbackSummary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Evaluation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
