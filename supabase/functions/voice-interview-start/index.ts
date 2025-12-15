import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Department-specific question packs (spoken-friendly, not heavy interview questions)
const QUESTION_PACKS: Record<string, string[]> = {
  engineering: [
    "Tell me about a time you worked with unclear technical requirements.",
    "How do you usually decide when something is 'good enough' to ship?",
    "Can you describe how you debug a problem you don't immediately understand?",
    "How do you approach learning a new technology or codebase?",
    "Tell me about a technical decision you made that you later reconsidered.",
  ],
  product: [
    "How do you usually balance user needs with business constraints?",
    "Tell me about a decision where tradeoffs weren't obvious.",
    "How do you decide what not to build?",
    "How do you handle conflicting feedback from different stakeholders?",
    "Tell me about a feature that evolved significantly from the original idea.",
  ],
  design: [
    "How do you usually explain design decisions to non-designers?",
    "Tell me about feedback you disagreed with.",
    "How do you balance usability and visual clarity?",
    "How do you approach designing for accessibility?",
    "Tell me about a design that required multiple iterations.",
  ],
  sales: [
    "How do you usually handle a conversation when a prospect is hesitant?",
    "Tell me about a deal that didn't move forward — what did you learn?",
    "How do you decide when to follow up and when to pause?",
    "How do you build trust with someone you've just met?",
    "Tell me about adapting your approach for different buyer types.",
  ],
  marketing: [
    "How do you decide which ideas are worth testing?",
    "Tell me about a campaign that didn't perform as expected.",
    "How do you interpret mixed performance signals?",
    "How do you balance brand consistency with creative experimentation?",
    "Tell me about collaborating with teams outside marketing.",
  ],
  operations: [
    "How do you usually handle competing priorities?",
    "Tell me about a process you improved.",
    "How do you notice when something is about to break?",
    "How do you communicate changes to people affected by them?",
    "Tell me about a time you had to make a quick decision with incomplete information.",
  ],
  leadership: [
    "How do you approach decisions when there's no clear right answer?",
    "Tell me about a time you had to support someone through change.",
    "How do you reflect after a difficult decision?",
    "How do you balance being supportive and being direct?",
    "Tell me about building alignment across a team with different perspectives.",
  ],
  general: [
    "Tell me about a time you faced an unexpected challenge at work.",
    "How do you usually approach learning something new?",
    "Tell me about a situation where you had to adapt quickly.",
    "How do you handle situations where priorities shift unexpectedly?",
    "Tell me about working with someone whose style was different from yours.",
  ],
};

// Focus mode to relevant question categories
const FOCUS_MODE_CATEGORIES: Record<string, string[]> = {
  behavioral: ['general', 'leadership'],
  execution: ['engineering', 'operations', 'product'],
  communication: ['sales', 'marketing', 'design'],
  leadership: ['leadership', 'operations'],
  mixed: ['general'],
};

function selectQuestions(department: string | null, focusMode: string, count: number = 4): string[] {
  const normalizedDept = (department || 'general').toLowerCase().replace(/[^a-z]/g, '');
  const deptQuestions = QUESTION_PACKS[normalizedDept] || QUESTION_PACKS.general;
  
  // Get focus mode categories
  const focusCategories = FOCUS_MODE_CATEGORIES[focusMode] || FOCUS_MODE_CATEGORIES.mixed;
  
  // Collect questions from focus categories
  let focusQuestions: string[] = [];
  for (const cat of focusCategories) {
    if (QUESTION_PACKS[cat]) {
      focusQuestions = [...focusQuestions, ...QUESTION_PACKS[cat]];
    }
  }
  
  // Combine department-specific and focus-mode questions
  const combined = [...new Set([...deptQuestions, ...focusQuestions])];
  
  // Shuffle and take requested count
  const shuffled = combined.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { jobId, roleTitle, mode, difficulty, focusMode, department, source } = await req.json();

    // Validate required fields
    if (!jobId && !roleTitle) {
      return new Response(JSON.stringify({ success: false, message: 'Either jobId or roleTitle is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate focus mode
    const validFocusModes = ['behavioral', 'execution', 'communication', 'leadership', 'mixed'];
    const normalizedFocusMode = focusMode && validFocusModes.includes(focusMode) ? focusMode : 'mixed';

    // Validate mode (legacy support)
    const validModes = ['technical', 'behavioral', 'mixed'];
    const normalizedMode = mode && validModes.includes(mode) ? mode : 'mixed';

    // Validate difficulty
    const validDifficulties = ['junior', 'mid', 'senior'];
    const normalizedDifficulty = difficulty && validDifficulties.includes(difficulty) ? difficulty : 'mid';

    console.log(`Starting voice practice for user ${user.id}, job: ${jobId || 'N/A'}, focusMode: ${normalizedFocusMode}`);

    // Fetch job details if jobId provided
    let jobTitle = roleTitle;
    let jobDescription = '';
    let jobDepartment = department;
    if (jobId) {
      const { data: jobTwinJob } = await supabase
        .from('job_twin_jobs')
        .select(`
          id,
          job:jobs (
            title,
            jd_text,
            tags,
            companies (name)
          )
        `)
        .eq('id', jobId)
        .single();

      const job = jobTwinJob?.job as any;
      if (job) {
        jobTitle = job.title;
        jobDescription = job.jd_text || '';
        // Infer department from tags or title
        if (!jobDepartment && job.tags && job.tags.length > 0) {
          jobDepartment = job.tags[0];
        }
      }
    }

    // Fetch candidate profile for context
    let candidateSummary = '';
    const { data: profile } = await supabase
      .from('job_twin_profiles')
      .select('ideal_role, skills, career_goals')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      candidateSummary = `Role: ${profile.ideal_role || 'N/A'}, Skills: ${(profile.skills || []).join(', ')}`;
    }

    // Select dynamic questions based on department and focus mode
    const practiceQuestions = selectQuestions(jobDepartment, normalizedFocusMode, 4);
    console.log(`Selected ${practiceQuestions.length} questions for department: ${jobDepartment || 'general'}, focus: ${normalizedFocusMode}`);

    // Create voice interview session in DB
    const { data: session, error: sessionError } = await supabase
      .from('voice_interview_sessions')
      .insert({
        user_id: user.id,
        job_twin_job_id: jobId || null,
        mode: normalizedMode,
        difficulty: normalizedDifficulty,
        role_title: jobTitle || roleTitle,
        status: 'pending',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return new Response(JSON.stringify({ success: false, message: 'Failed to create session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Created session ${session.id}`);

    // Get Retell credentials
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    const retellAgentId = Deno.env.get('RETELL_AGENT_ID');

    if (!retellApiKey || !retellAgentId) {
      console.error('Retell credentials not configured');
      await supabase
        .from('voice_interview_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);

      return new Response(JSON.stringify({ success: false, message: 'Voice interview service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build Retell payload with dynamic questions
    const retellPayload = {
      agent_id: retellAgentId,
      metadata: {
        futurhire_session_id: session.id,
        user_id: user.id,
        job_twin_job_id: jobId || null,
        focus_mode: normalizedFocusMode,
        mode: normalizedMode,
        difficulty: normalizedDifficulty,
        role_title: jobTitle || roleTitle,
        department: jobDepartment || 'general',
        candidate_summary: candidateSummary,
        job_description: jobDescription?.substring(0, 500),
        source: source || 'candidate_initiated',
        // Dynamic questions for the agent to ask
        practice_questions: practiceQuestions,
      },
    };

    console.log('Calling Retell API with dynamic questions...');
    const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retellPayload),
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error('Retell API error:', retellResponse.status, errorText);
      
      await supabase
        .from('voice_interview_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);

      return new Response(JSON.stringify({ success: false, message: 'Failed to start voice practice session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const retellData = await retellResponse.json();
    console.log('Retell response:', JSON.stringify(retellData));

    // Update session with Retell data
    const retellSessionId = retellData.call_id || retellData.id;
    const joinUrl = retellData.web_call_link || retellData.url;

    await supabase
      .from('voice_interview_sessions')
      .update({
        retell_session_id: retellSessionId,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    console.log(`Session ${session.id} started with Retell ID: ${retellSessionId}`);

    return new Response(JSON.stringify({
      success: true,
      sessionId: session.id,
      retellSessionId: retellSessionId,
      joinUrl: joinUrl,
      accessToken: retellData.access_token,
      practiceQuestions: practiceQuestions, // Return questions for UI display
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in voice-interview-start:', error);
    return new Response(JSON.stringify({ success: false, message: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
