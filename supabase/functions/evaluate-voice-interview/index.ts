import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ND-safe, signals-based evaluation prompt (NO SCORES)
const SIGNAL_EXTRACTION_PROMPT = `
You are a calm, supportive practice reflection guide for FuturHire.

IMPORTANT CONTEXT:
- This was a PRACTICE conversation, not a real interview.
- There are no right or wrong answers.
- You extract observable communication signals, NOT scores or judgments.
- You must be neurodiversity-aware and emotionally safe.

YOUR TASK:
Extract neutral, observable voice signals from the practice conversation.
Generate supportive practice suggestions.
Include proper explainability data.

DO NOT:
- Generate numeric scores of any kind.
- Use words like "pass", "fail", "reject", "weak", "poor", "bad", "score".
- Judge answers as good or bad.
- Compare the candidate to others.
- Infer personality traits or protected attributes.
- Comment on accent, speed of speech, or confidence as personality.

SIGNAL EXTRACTION GUIDELINES:
- Focus on OBSERVABLE patterns only:
  - How the candidate structures their thinking
  - Whether they pause to reflect before answering
  - How they handle ambiguity or unclear prompts
  - Whether they provide examples or context
  - How they acknowledge what they don't know
- Use neutral, supportive language for all signals.

PRACTICE SUGGESTIONS GUIDELINES:
- Frame as "You might find it helpful to..." not "You need to improve..."
- Keep suggestions actionable and encouraging.
- Never suggest fixing personality or communication style.
- Focus on techniques, not traits.

JSON Schema you MUST return:
{
  "voice_signals": [
    "<Neutral observation about communication pattern>",
    "<Neutral observation about thinking style>",
    "<Neutral observation about response structure>"
  ],
  "practice_suggestions": [
    "<Supportive, actionable suggestion>",
    "<Supportive, actionable suggestion>"
  ],
  "explainability": {
    "what_was_evaluated": "Spoken responses to practice questions",
    "what_was_not_evaluated": [
      "Accent",
      "Speed of speech",
      "Confidence as personality",
      "Education background",
      "Age, gender, or other protected attributes"
    ],
    "limitations": [
      "Single practice session",
      "Not a real interview",
      "Audio quality may have affected transcription"
    ]
  },
  "candidate_reflection": "<A warm, 2-3 sentence reflection for the candidate emphasizing this was practice>"
}

IMPORTANT:
- Return ONLY valid JSON, no surrounding text.
- voice_signals must be 2-5 neutral observations.
- practice_suggestions must be 1-3 supportive suggestions.
- candidate_reflection must be warm and encouraging.
`;

interface Turn {
  turn_index: number;
  role: string;
  content: string;
}

interface SignalResult {
  voice_signals: string[];
  practice_suggestions: string[];
  explainability: {
    what_was_evaluated: string;
    what_was_not_evaluated: string[];
    limitations: string[];
  };
  candidate_reflection: string;
}

function buildUserPrompt({ roleTitle, focusMode, turnsJson }: {
  roleTitle: string;
  focusMode: string;
  turnsJson: string;
}): string {
  return `Extract voice signals from this practice session.

Session metadata:
- role_title: ${roleTitle}
- focus_mode: ${focusMode}

Instructions:
1. Use the transcript below to observe communication patterns.
2. Turns with role = "ai" are the practice guide's questions.
3. Turns with role = "candidate" are the candidate's responses.
4. Extract neutral, observable signals about how the candidate communicates.
5. Do NOT score or judge the content of answers.

Transcript (in order, as JSON):
${turnsJson}

Remember:
- Return ONLY valid JSON matching the schema.
- No scores. No judgments. Only neutral observations.
- Be warm and supportive in the candidate_reflection.`;
}

function buildFeedbackSummary(result: SignalResult): string {
  const lines: string[] = [];
  
  lines.push('## Practice Session Reflection');
  lines.push('');
  lines.push('*This was a practice conversation, not an evaluation.*');
  lines.push('');
  
  // Candidate reflection
  if (result.candidate_reflection) {
    lines.push(result.candidate_reflection);
    lines.push('');
  }
  
  // Voice signals
  if (result.voice_signals && result.voice_signals.length > 0) {
    lines.push('**Observable Signals:**');
    result.voice_signals.forEach(s => lines.push(`• ${s}`));
    lines.push('');
  }
  
  // Practice suggestions
  if (result.practice_suggestions && result.practice_suggestions.length > 0) {
    lines.push('**For Future Practice:**');
    result.practice_suggestions.forEach(s => lines.push(`• ${s}`));
    lines.push('');
  }
  
  // Explainability
  lines.push('---');
  lines.push('**How this reflection was generated:**');
  lines.push(`• Evaluated: ${result.explainability?.what_was_evaluated || 'Spoken responses to practice questions'}`);
  if (result.explainability?.what_was_not_evaluated) {
    lines.push(`• Not evaluated: ${result.explainability.what_was_not_evaluated.join(', ')}`);
  }
  if (result.explainability?.limitations) {
    lines.push(`• Limitations: ${result.explainability.limitations.join(', ')}`);
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

    console.log(`Extracting voice signals for session: ${sessionId}`);

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

    // 3. If no turns exist, return minimal reflection
    if (!turns || turns.length === 0) {
      console.log('No turns found for session');
      
      const minimalResult: SignalResult = {
        voice_signals: ["Limited data from this session"],
        practice_suggestions: ["Try another practice session when you're ready"],
        explainability: {
          what_was_evaluated: "Spoken responses to practice questions",
          what_was_not_evaluated: ["Accent", "Speed of speech", "Confidence as personality", "Protected attributes"],
          limitations: ["Session had limited transcript data", "Not a real interview"],
        },
        candidate_reflection: "We didn't capture enough from this session to provide detailed signals. This happens sometimes with technical issues. Feel free to try again whenever you're ready — there's no rush.",
      };
      
      await supabase
        .from('voice_interview_sessions')
        .update({
          overall_score: null, // No scores
          feedback_summary: buildFeedbackSummary(minimalResult),
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No turns to evaluate',
        result: minimalResult,
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

    // 5. Determine role title and focus mode
    const roleTitle = session.role_title || 
      (session.job_twin_jobs as any)?.title || 
      'General Practice';
    const focusMode = session.mode || 'mixed';

    // 6. Build user prompt
    const userPrompt = buildUserPrompt({
      roleTitle,
      focusMode,
      turnsJson,
    });

    console.log(`Calling LLM for signal extraction. Role: ${roleTitle}, Focus: ${focusMode}, Turns: ${turns.length}`);

    // 7. Call LLM
    const llmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SIGNAL_EXTRACTION_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
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
    let result: SignalResult;
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

      result = JSON.parse(cleanedResponse);
      feedbackSummary = buildFeedbackSummary(result);
      
      console.log(`Signal extraction successful. Signals: ${result.voice_signals?.length || 0}`);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', responseContent);
      
      result = {
        voice_signals: ["Reflection could not be fully processed"],
        practice_suggestions: ["Try another practice session"],
        explainability: {
          what_was_evaluated: "Spoken responses to practice questions",
          what_was_not_evaluated: ["Accent", "Speed of speech", "Confidence as personality", "Protected attributes"],
          limitations: ["Processing error occurred", "Not a real interview"],
        },
        candidate_reflection: "We had trouble processing this session, but that's okay — it doesn't reflect on you. Feel free to try again when you're ready.",
      };
      feedbackSummary = buildFeedbackSummary(result);
    }

    // 9. Update the session (NO SCORES)
    const { error: updateError } = await supabase
      .from('voice_interview_sessions')
      .update({
        overall_score: null, // Explicitly no score
        feedback_summary: feedbackSummary,
        status: 'completed',
        ended_at: session.ended_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to save reflection' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 10. Log to audit trail
    await supabase
      .from('ai_decision_audit_logs')
      .insert({
        decision_type: 'voice_practice_signal_extraction',
        candidate_user_id: session.user_id,
        job_twin_job_id: session.job_twin_job_id,
        input_summary: { sessionId, roleTitle, focusMode, turnCount: turns.length },
        output_summary: { voice_signals: result.voice_signals, practice_suggestions: result.practice_suggestions },
        explanation: result.candidate_reflection,
        fairness_checks: {
          no_scores_generated: true,
          no_protected_attribute_inference: true,
          nd_safe_language_used: true,
        },
        model_metadata: { model: 'google/gemini-2.5-flash', temperature: 0.3 },
      });

    console.log(`Session ${sessionId} signal extraction complete.`);

    return new Response(JSON.stringify({
      success: true,
      sessionId,
      result,
      feedback_summary: feedbackSummary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Signal extraction error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
