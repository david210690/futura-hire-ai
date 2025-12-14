import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin or recruiter role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'recruiter'])
      .maybeSingle();

    if (!userRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin or recruiter role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const questionId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;
    const isArchiveAction = url.pathname.includes('/archive');

    // Handle different methods
    if (req.method === 'GET') {
      return await handleGet(supabase, url);
    } else if (req.method === 'POST' && isArchiveAction && questionId) {
      return await handleArchive(supabase, questionId, req);
    } else if (req.method === 'POST') {
      return await handleCreate(supabase, req, user.id);
    } else if (req.method === 'PUT' && questionId) {
      return await handleUpdate(supabase, questionId, req);
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleGet(supabase: any, url: URL) {
  const params = url.searchParams;
  const page = parseInt(params.get('page') || '1');
  const pageSize = parseInt(params.get('pageSize') || '20');
  const includeArchived = params.get('includeArchived') === 'true';
  const department = params.get('department');
  const category = params.get('category');
  const seniority = params.get('seniority');
  const roleDnaDimension = params.get('roleDnaDimension');
  const difficulty = params.get('difficulty');
  const ndSafe = params.get('ndSafe');
  const search = params.get('search');

  let query = supabase
    .from('question_bank_questions')
    .select(`
      *,
      question_bank_answer_rubrics (*)
    `, { count: 'exact' });

  // Filter by archive status
  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  // Apply filters
  if (department) query = query.eq('department', department);
  if (category) query = query.eq('category', category);
  if (seniority) query = query.eq('seniority', seniority);
  if (roleDnaDimension) query = query.eq('role_dna_dimension', roleDnaDimension);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (ndSafe === 'true') query = query.eq('nd_safe', true);

  // Search
  if (search) {
    query = query.or(`question_text.ilike.%${search}%,intent.ilike.%${search}%`);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Query error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const items = (data || []).map((q: any) => ({
    question: {
      id: q.id,
      department: q.department,
      category: q.category,
      seniority: q.seniority,
      question_text: q.question_text,
      intent: q.intent,
      role_dna_dimension: q.role_dna_dimension,
      difficulty: q.difficulty,
      nd_safe: q.nd_safe,
      is_archived: q.is_archived,
      archived_at: q.archived_at,
      created_at: q.created_at,
      updated_at: q.updated_at,
      created_by_user_id: q.created_by_user_id,
    },
    rubric: q.question_bank_answer_rubrics?.[0] || null,
  }));

  return new Response(JSON.stringify({
    success: true,
    items,
    page,
    pageSize,
    totalItems: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleCreate(supabase: any, req: Request, userId: string) {
  const body = await req.json();
  const { question, rubric } = body;

  // Validate required fields
  if (!question.question_text || !question.department || !question.category || 
      !question.seniority || !question.role_dna_dimension) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create question
  const { data: newQuestion, error: questionError } = await supabase
    .from('question_bank_questions')
    .insert({
      department: question.department,
      category: question.category,
      seniority: question.seniority,
      role_dna_dimension: question.role_dna_dimension,
      question_text: question.question_text,
      intent: question.intent || null,
      difficulty: question.difficulty || 'medium',
      nd_safe: question.nd_safe || false,
      is_archived: false,
      created_by_user_id: userId,
    })
    .select()
    .single();

  if (questionError) {
    console.error('Create question error:', questionError);
    return new Response(JSON.stringify({ error: questionError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create rubric if provided
  let newRubric = null;
  if (rubric) {
    const { data: rubricData, error: rubricError } = await supabase
      .from('question_bank_answer_rubrics')
      .insert({
        question_id: newQuestion.id,
        what_good_looks_like: rubric.what_good_looks_like || [],
        followup_probes: rubric.followup_probes || [],
        bias_traps_to_avoid: rubric.bias_traps_to_avoid || [],
        notes_for_interviewer: rubric.notes_for_interviewer || null,
      })
      .select()
      .single();

    if (rubricError) {
      console.error('Create rubric error:', rubricError);
    } else {
      newRubric = rubricData;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    item: { question: newQuestion, rubric: newRubric },
  }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleUpdate(supabase: any, questionId: string, req: Request) {
  const body = await req.json();
  const { question, rubric } = body;

  // Update question
  const { data: updatedQuestion, error: questionError } = await supabase
    .from('question_bank_questions')
    .update({
      department: question.department,
      category: question.category,
      seniority: question.seniority,
      role_dna_dimension: question.role_dna_dimension,
      question_text: question.question_text,
      intent: question.intent,
      difficulty: question.difficulty,
      nd_safe: question.nd_safe,
    })
    .eq('id', questionId)
    .select()
    .single();

  if (questionError) {
    console.error('Update question error:', questionError);
    return new Response(JSON.stringify({ error: questionError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Upsert rubric
  let updatedRubric = null;
  if (rubric) {
    // Check if rubric exists
    const { data: existingRubric } = await supabase
      .from('question_bank_answer_rubrics')
      .select('id')
      .eq('question_id', questionId)
      .maybeSingle();

    if (existingRubric) {
      const { data, error } = await supabase
        .from('question_bank_answer_rubrics')
        .update({
          what_good_looks_like: rubric.what_good_looks_like || [],
          followup_probes: rubric.followup_probes || [],
          bias_traps_to_avoid: rubric.bias_traps_to_avoid || [],
          notes_for_interviewer: rubric.notes_for_interviewer,
        })
        .eq('question_id', questionId)
        .select()
        .single();
      updatedRubric = data;
    } else {
      const { data, error } = await supabase
        .from('question_bank_answer_rubrics')
        .insert({
          question_id: questionId,
          what_good_looks_like: rubric.what_good_looks_like || [],
          followup_probes: rubric.followup_probes || [],
          bias_traps_to_avoid: rubric.bias_traps_to_avoid || [],
          notes_for_interviewer: rubric.notes_for_interviewer,
        })
        .select()
        .single();
      updatedRubric = data;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    item: { question: updatedQuestion, rubric: updatedRubric },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleArchive(supabase: any, questionId: string, req: Request) {
  const body = await req.json();
  const { archive } = body;

  const { data, error } = await supabase
    .from('question_bank_questions')
    .update({
      is_archived: archive,
      archived_at: archive ? new Date().toISOString() : null,
    })
    .eq('id', questionId)
    .select()
    .single();

  if (error) {
    console.error('Archive error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    item: data,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
