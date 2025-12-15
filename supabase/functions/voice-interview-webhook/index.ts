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
  console.log(`Evaluating session ${sessionId}`);

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

  // Build conversation for evaluation
  const conversation = turns.map((t: any) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.content}`).join('\n\n');

  // Use Lovable AI for evaluation
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return;
  }

  const evaluationPrompt = `You are a calm, supportive practice reflection guide for FuturHire.

IMPORTANT: This was a PRACTICE conversation, not a real interview. There are no right or wrong answers.
Be neurodiversity-aware and emotionally safe. DO NOT use words like "weak", "poor", "fail", or "bad".

Interview Details:
- Mode: ${session.mode} (technical/behavioral/mixed)
- Difficulty: ${session.difficulty} (junior/mid/senior)
- Target Role: ${session.role_title || 'General'}

Conversation Transcript:
${conversation}

Please provide a supportive reflection as a JSON object:
{
  "overall_score": <number 0-100 as a readiness indicator, not judgment>,
  "strengths": [<list of 2-4 observable strengths using supportive language>],
  "improvements": [<list of 2-4 areas to practice more, framed encouragingly>],
  "summary": "<2-3 sentence supportive reflection emphasizing this was practice>"
}

LANGUAGE RULES:
- Instead of "weak at X" → "still developing X"
- Instead of "failed to" → "may want to practice"
- Instead of "needs improvement" → "opportunity to explore"
- Validate effort, not performance. Be warm and encouraging.`;

  try {
    const evalResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: evaluationPrompt }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!evalResponse.ok) {
      console.error('Evaluation API error:', await evalResponse.text());
      return;
    }

    const evalData = await evalResponse.json();
    const evalContent = evalData.choices?.[0]?.message?.content;
    
    if (!evalContent) {
      console.error('No evaluation content');
      return;
    }

    // Parse the JSON response
    let evaluation;
    try {
      evaluation = JSON.parse(evalContent);
    } catch (e) {
      // Try to extract JSON from the response
      const jsonMatch = evalContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Could not parse evaluation:', evalContent);
        return;
      }
    }

    // Format feedback summary
    const feedbackSummary = `**Overall Assessment**\n${evaluation.summary}\n\n**Strengths:**\n${(evaluation.strengths || []).map((s: string) => `• ${s}`).join('\n')}\n\n**Areas for Improvement:**\n${(evaluation.improvements || []).map((i: string) => `• ${i}`).join('\n')}`;

    // Update session with evaluation
    await supabase
      .from('voice_interview_sessions')
      .update({
        overall_score: evaluation.overall_score || 0,
        feedback_summary: feedbackSummary,
      })
      .eq('id', sessionId);

    console.log(`Session ${sessionId} evaluated with score: ${evaluation.overall_score}`);

  } catch (error) {
    console.error('Evaluation error:', error);
  }
}
