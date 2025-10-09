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

    const { attempt_id, responses } = await req.json();
    console.log('Submitting attempt:', attempt_id);

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('started_at, assignment_id')
      .eq('id', attempt_id)
      .single();

    if (attemptError) throw attemptError;

    // Calculate time spent
    const timeSpent = Math.floor((new Date().getTime() - new Date(attempt.started_at).getTime()) / 1000);

    // Insert all answers
    const answerInserts = responses.map((r: any) => ({
      attempt_id,
      question_id: r.question_id,
      response: r.response
    }));

    const { error: insertError } = await supabase
      .from('attempt_answers')
      .insert(answerInserts);

    if (insertError) throw insertError;

    // Update attempt
    const { error: updateError } = await supabase
      .from('attempts')
      .update({
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeSpent,
        ip_addr: req.headers.get('x-forwarded-for') || 'unknown',
        ua: req.headers.get('user-agent') || 'unknown'
      })
      .eq('id', attempt_id);

    if (updateError) throw updateError;

    // Update assignment status
    await supabase
      .from('assignments')
      .update({ status: 'submitted' })
      .eq('id', attempt.assignment_id);

    // Trigger grading via edge function
    const gradeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/grade-assessment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attempt_id })
    });

    if (!gradeResponse.ok) {
      console.error('Grading failed:', await gradeResponse.text());
    }

    return new Response(
      JSON.stringify({ success: true, time_spent_seconds: timeSpent }),
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
