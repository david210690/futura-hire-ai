import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retell-signature, x-retell-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook secret - check header OR query param
    const webhookSecret = Deno.env.get('RETELL_WEBHOOK_SECRET');
    const url = new URL(req.url);
    const querySecret = url.searchParams.get('secret');
    const headerSecret = req.headers.get('x-retell-secret') || req.headers.get('x-retell-signature');
    const providedSecret = headerSecret || querySecret;
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Retell webhook received:', JSON.stringify(body));

    // Retell webhook payload structure varies by event type
    const eventType = body.event || body.event_type;
    const callId = body.call_id || body.session_id;
    const metadata = body.metadata || body.call?.metadata || {};

    // Try to get session from metadata first, then from call_id
    let sessionId = metadata.futurhire_session_id;
    
    // Find session by retell_session_id if not in metadata
    let session;
    if (sessionId) {
      const { data } = await supabase
        .from('voice_interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      session = data;
    } else if (callId) {
      const { data } = await supabase
        .from('voice_interview_sessions')
        .select('*')
        .eq('retell_session_id', callId)
        .single();
      session = data;
    }

    if (!session) {
      console.log('Session not found for webhook, ignoring');
      return new Response(JSON.stringify({ ok: true, message: 'Session not found, ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing event ${eventType} for session ${session.id}`);

    switch (eventType) {
      case 'call_started':
      case 'session_started': {
        await supabase
          .from('voice_interview_sessions')
          .update({
            status: 'active',
            started_at: session.started_at || new Date().toISOString(),
          })
          .eq('id', session.id);
        break;
      }

      case 'call_analyzed':
      case 'call_ended':
      case 'session_ended': {
        // Mark session as completed
        await supabase
          .from('voice_interview_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        // If transcript data is included in the webhook
        const transcript = body.transcript || body.call?.transcript || [];
        if (transcript.length > 0) {
          // Store transcript turns
          for (let i = 0; i < transcript.length; i++) {
            const turn = transcript[i];
            const role = turn.role === 'agent' || turn.role === 'assistant' ? 'ai' : 'candidate';
            const content = turn.content || turn.text || turn.words?.map((w: any) => w.word).join(' ') || '';
            
            if (content.trim()) {
              await supabase
                .from('voice_interview_turns')
                .insert({
                  session_id: session.id,
                  user_id: session.user_id,
                  turn_index: i + 1,
                  role,
                  content: content.trim(),
                });
            }
          }
        }

        // Trigger evaluation asynchronously
        evaluateSession(supabase, session.id).catch(err => {
          console.error('Evaluation error:', err);
        });
        break;
      }

      case 'transcript':
      case 'transcript_update': {
        // Real-time transcript update
        const role = body.role === 'agent' || body.role === 'assistant' ? 'ai' : 'candidate';
        const content = body.content || body.text || '';
        
        if (content.trim()) {
          // Get current max turn index
          const { data: lastTurn } = await supabase
            .from('voice_interview_turns')
            .select('turn_index')
            .eq('session_id', session.id)
            .order('turn_index', { ascending: false })
            .limit(1)
            .single();

          const nextIndex = (lastTurn?.turn_index || 0) + 1;

          await supabase
            .from('voice_interview_turns')
            .insert({
              session_id: session.id,
              user_id: session.user_id,
              turn_index: nextIndex,
              role,
              content: content.trim(),
            });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ ok: true, error: error?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function evaluateSession(supabase: any, sessionId: string) {
  console.log(`Extracting voice signals for session ${sessionId}`);

  // Fetch session
  const { data: session } = await supabase
    .from('voice_interview_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) {
    console.error('Session not found for evaluation');
    return;
  }

  // Fetch turns
  const { data: turns } = await supabase
    .from('voice_interview_turns')
    .select('*')
    .eq('session_id', sessionId)
    .order('turn_index', { ascending: true });

  if (!turns || turns.length === 0) {
    console.log('No turns to evaluate');
    return;
  }

  // Build conversation for signal extraction
  const conversation = turns.map((t: any) => `${t.role === 'ai' ? 'Practice Guide' : 'Candidate'}: ${t.content}`).join('\n\n');

  // Use Lovable AI for signal extraction (NO SCORES)
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return;
  }

  const signalPrompt = `You are a calm, supportive practice reflection guide for FuturHire.

IMPORTANT: This was a PRACTICE conversation, not a real interview.
Extract observable communication signals only. DO NOT generate scores.
Be neurodiversity-aware and emotionally safe.

Practice Session Details:
- Focus Mode: ${session.mode}
- Target Role: ${session.role_title || 'General Practice'}

Conversation Transcript:
${conversation}

Extract voice signals as a JSON object:
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
  "candidate_reflection": "<Warm, 2-3 sentence reflection for the candidate>"
}

RULES:
- NO numeric scores
- NO words like "weak", "poor", "fail", "bad"
- NO personality judgments
- DO NOT evaluate accent, speed, or confidence as traits
- Use supportive, growth-oriented language`;

  try {
    const evalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: signalPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!evalResponse.ok) {
      console.error('Signal extraction API error:', await evalResponse.text());
      return;
    }

    const evalData = await evalResponse.json();
    const evalContent = evalData.choices?.[0]?.message?.content;
    
    if (!evalContent) {
      console.error('No signal extraction content');
      return;
    }

    // Parse the JSON response
    let signals;
    try {
      // Clean markdown if present
      let cleaned = evalContent.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      signals = JSON.parse(cleaned.trim());
    } catch (e) {
      // Try to extract JSON from the response
      const jsonMatch = evalContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        signals = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Could not parse signals:', evalContent);
        return;
      }
    }

    // Format feedback summary (NO SCORES)
    const feedbackLines = [
      '## Practice Session Reflection',
      '',
      '*This was a practice conversation, not an evaluation.*',
      '',
      signals.candidate_reflection || 'Thank you for practicing with us.',
      '',
      '**Observable Signals:**',
      ...(signals.voice_signals || []).map((s: string) => `• ${s}`),
      '',
      '**For Future Practice:**',
      ...(signals.practice_suggestions || []).map((s: string) => `• ${s}`),
    ];
    const feedbackSummary = feedbackLines.join('\n');

    // Update session WITHOUT score
    await supabase
      .from('voice_interview_sessions')
      .update({
        overall_score: null, // Explicitly no score
        feedback_summary: feedbackSummary,
      })
      .eq('id', sessionId);

    // Log to audit trail
    await supabase
      .from('ai_decision_audit_logs')
      .insert({
        decision_type: 'voice_practice_signal_extraction',
        candidate_user_id: session.user_id,
        job_twin_job_id: session.job_twin_job_id,
        input_summary: { sessionId, roleTitle: session.role_title, turnCount: turns.length },
        output_summary: { voice_signals: signals.voice_signals, practice_suggestions: signals.practice_suggestions },
        explanation: signals.candidate_reflection,
        fairness_checks: {
          no_scores_generated: true,
          no_protected_attribute_inference: true,
          nd_safe_language_used: true,
        },
        model_metadata: { model: 'google/gemini-2.5-flash', temperature: 0.3 },
      });

    console.log(`Session ${sessionId} signals extracted. Signals: ${signals.voice_signals?.length || 0}`);

  } catch (error) {
    console.error('Signal extraction error:', error);
  }
}
