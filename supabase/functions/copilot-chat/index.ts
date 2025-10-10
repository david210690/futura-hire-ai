import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Copilot chat function called');
    
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('User auth result:', { userId: user?.id, error: userError?.message });
    
    if (userError || !user) {
      console.error('Auth failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { threadId, message, orgId, jobId, candidateId } = await req.json();
    console.log('Request data:', { hasThreadId: !!threadId, hasMessage: !!message, orgId });

    // Check usage limits with service role key to bypass RLS
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: usageData } = await adminClient.rpc('increment_usage', {
      _org_id: orgId,
      _metric: 'copilot_calls'
    });

    if (usageData && usageData.remaining <= 0) {
      return new Response(JSON.stringify({ error: 'Daily copilot limit reached', code: 'quota_exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create thread using admin client
    let currentThreadId = threadId;
    if (!currentThreadId) {
      const { data: newThread, error: threadError } = await adminClient
        .from('copilot_threads')
        .insert({ org_id: orgId, user_id: user.id, title: message.slice(0, 50) })
        .select()
        .single();

      if (threadError) throw threadError;
      currentThreadId = newThread.id;
    }

    // Save user message using admin client
    await adminClient.from('copilot_messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: message
    });

    // Assemble context using admin client
    const context = await assembleContext(adminClient, orgId, jobId, candidateId);

    // Call Lovable AI with tool calling
    const response = await callCopilotAI(message, context, adminClient, orgId, user.id, jobId, candidateId);

    // Save assistant response using admin client
    await adminClient.from('copilot_messages').insert({
      thread_id: currentThreadId,
      role: 'assistant',
      content: response.answer
    });

    return new Response(JSON.stringify({ 
      threadId: currentThreadId,
      response,
      usage: usageData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Copilot error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function assembleContext(supabase: any, orgId: string, jobId?: string, candidateId?: string) {
  let context = '';

  // Org context
  const { data: companies } = await supabase.from('companies').select('*').eq('org_id', orgId);
  const { data: jobs } = await supabase.from('jobs').select('*').eq('org_id', orgId).eq('status', 'open');
  context += `\nOrg has ${companies?.length || 0} companies and ${jobs?.length || 0} open jobs.`;

  // Job context
  if (jobId) {
    const { data: job } = await supabase.from('jobs').select('*, companies(*)').eq('id', jobId).single();
    if (job) {
      const { data: apps } = await supabase.from('applications').select('*').eq('job_id', jobId);
      context += `\n\nJob: "${job.title}" at ${job.companies?.name}. ${apps?.length || 0} applications.`;
      context += `\nJD: ${job.jd_text.slice(0, 500)}`;
    }
  }

  // Candidate context
  if (candidateId) {
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*, resumes(*), video_analysis(*)')
      .eq('id', candidateId)
      .single();
    
    if (candidate) {
      context += `\n\nCandidate: ${candidate.full_name}, ${candidate.headline || 'N/A'}`;
      context += `\nSkills: ${candidate.skills || 'N/A'}`;
      if (candidate.video_analysis && candidate.video_analysis.length > 0) {
        const va = candidate.video_analysis[0];
        context += `\nVideo summary: ${va.summary || 'N/A'}`;
      }
    }
  }

  return context;
}

async function callCopilotAI(
  message: string,
  context: string,
  supabase: any,
  orgId: string,
  userId: string,
  jobId?: string,
  candidateId?: string
) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `You are FuturaHire's in-app Hiring Copilot. Be concise, professional, and helpful.

You can call tools by returning STRICT JSON matching this schema:
{
  "answer": "one-paragraph natural language reply for the user",
  "actions": [
    {"tool": "FILTER_CANDIDATES", "params": {"min_overall": 70, "days": "7"}},
    {"tool": "DRAFT_REJECTION_EMAIL", "params": {"candidate_name": "Alice"}}
  ],
  "open_links": [{"route": "/jobs/{job_id}/shortlist"}]
}

Available tools:
- FILTER_CANDIDATES: Filter candidates by score/date
- SUMMARIZE_JOB: Summarize job details
- SUMMARIZE_CANDIDATE: Summarize candidate profile
- DRAFT_REJECTION_EMAIL: Draft polite rejection
- DRAFT_OUTREACH: Draft outreach message

Context: ${context}

If you don't need tools, return actions: []. Never hallucinate IDs.`;

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
        { role: 'user', content: message }
      ],
      temperature: 0.7,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('AI API error:', aiResponse.status, errorText);
    throw new Error('AI API error');
  }

  const aiData = await aiResponse.json();
  const rawAnswer = aiData.choices[0].message.content;

  // Parse JSON response
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(rawAnswer);
  } catch {
    parsedResponse = { answer: rawAnswer, actions: [], open_links: [] };
  }

  // Execute actions
  const actionResults = [];
  for (const action of (parsedResponse.actions || [])) {
    const result = await executeAction(action, supabase, orgId, jobId, candidateId);
    actionResults.push({ action: action.tool, result });

    // Log action
    await supabase.from('copilot_actions_log').insert({
      org_id: orgId,
      user_id: userId,
      action: action.tool,
      params: action.params,
      result_ref: JSON.stringify(result)
    });
  }

  return {
    answer: parsedResponse.answer,
    actions: actionResults,
    open_links: parsedResponse.open_links || []
  };
}

async function executeAction(action: any, supabase: any, orgId: string, jobId?: string, candidateId?: string) {
  const { tool, params } = action;

  switch (tool) {
    case 'FILTER_CANDIDATES': {
      const { min_overall = 70, days = '30' } = params;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

      let query = supabase
        .from('applications')
        .select('*, candidates(*), jobs(title)')
        .eq('org_id', orgId)
        .gte('overall_score', min_overall)
        .gte('created_at', cutoffDate.toISOString());

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data } = await query.order('overall_score', { ascending: false }).limit(10);
      return { candidates: data || [] };
    }

    case 'SUMMARIZE_JOB': {
      if (!jobId) return { error: 'No job specified' };
      const { data: job } = await supabase
        .from('jobs')
        .select('*, companies(*)')
        .eq('id', jobId)
        .single();
      
      if (!job) return { error: 'Job not found' };

      const { data: apps } = await supabase.from('applications').select('*').eq('job_id', jobId);
      const summary = `${job.title} at ${job.companies?.name}. ${apps?.length || 0} applications. Key requirements: ${job.jd_text.slice(0, 300)}...`;
      return { summary };
    }

    case 'SUMMARIZE_CANDIDATE': {
      if (!candidateId) return { error: 'No candidate specified' };
      const { data: candidate } = await supabase
        .from('candidates')
        .select('*, resumes(*), video_analysis(*)')
        .eq('id', candidateId)
        .single();

      if (!candidate) return { error: 'Candidate not found' };

      const summary = `${candidate.full_name}: ${candidate.headline || 'N/A'}. Skills: ${candidate.skills || 'N/A'}. ${candidate.video_analysis?.[0]?.summary || 'No video analysis'}`;
      return { summary };
    }

    case 'DRAFT_REJECTION_EMAIL': {
      const { candidate_name = 'Candidate' } = params;
      const subject = `Thank you for your application`;
      const body = `Dear ${candidate_name},\n\nThank you for taking the time to apply and interview with us. After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.\n\nWe appreciate your interest in our company and wish you the best in your job search.\n\nBest regards,\nThe Hiring Team`;
      return { subject, body };
    }

    case 'DRAFT_OUTREACH': {
      const { candidate_name = 'there', skills = '' } = params;
      const body = `Hi ${candidate_name},\n\nI came across your profile and was impressed by your background in ${skills}. We have an exciting opportunity that might be a great fit for you.\n\nWould you be open to a quick conversation about it?\n\nBest,\nThe Team`;
      return { body };
    }

    default:
      return { error: 'Unknown tool' };
  }
}
