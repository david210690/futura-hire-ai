import { supabase } from "@/integrations/supabase/client";

export interface QuestionFilters {
  department?: string;
  category?: string;
  seniority?: string;
  roleDnaDimension?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

export interface QuestionWithRubric {
  id: string;
  department: string;
  category: string;
  seniority: string;
  question_text: string;
  intent: string;
  role_dna_dimension: string;
  difficulty: string;
  nd_safe: boolean;
  rubric?: {
    what_good_looks_like: string[];
    followup_probes: string[];
    bias_traps_to_avoid: string[];
  };
}

export async function getQuestions(filters: QuestionFilters): Promise<QuestionWithRubric[]> {
  let query = supabase
    .from('question_bank_questions')
    .select(`
      *,
      question_bank_answer_rubrics (
        what_good_looks_like,
        followup_probes,
        bias_traps_to_avoid
      )
    `);

  if (filters.department) {
    query = query.eq('department', filters.department);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.seniority) {
    query = query.eq('seniority', filters.seniority);
  }
  if (filters.roleDnaDimension) {
    query = query.eq('role_dna_dimension', filters.roleDnaDimension);
  }
  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  query = query.order('department').order('category').order('seniority');

  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }

  return (data || []).map((q: any) => ({
    id: q.id,
    department: q.department,
    category: q.category,
    seniority: q.seniority,
    question_text: q.question_text,
    intent: q.intent,
    role_dna_dimension: q.role_dna_dimension,
    difficulty: q.difficulty,
    nd_safe: q.nd_safe,
    rubric: q.question_bank_answer_rubrics?.[0] ? {
      what_good_looks_like: q.question_bank_answer_rubrics[0].what_good_looks_like || [],
      followup_probes: q.question_bank_answer_rubrics[0].followup_probes || [],
      bias_traps_to_avoid: q.question_bank_answer_rubrics[0].bias_traps_to_avoid || []
    } : undefined
  }));
}

export async function getDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from('question_bank_questions')
    .select('department')
    .order('department');

  if (error) throw error;
  
  const unique = [...new Set((data || []).map(d => d.department))];
  return unique;
}

export const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'HR/People',
  'Customer Success',
  'Leadership'
];

export const CATEGORIES = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'role_specific', label: 'Role Specific' },
  { value: 'execution', label: 'Execution & Judgment' },
  { value: 'culture_nd_safe', label: 'Culture (ND-Safe)' }
];

export const SENIORITY_LEVELS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'exec', label: 'Executive' }
];

export const ROLE_DNA_DIMENSIONS = [
  { value: 'cognitive_patterns', label: 'Cognitive Patterns' },
  { value: 'communication_style', label: 'Communication Style' },
  { value: 'execution_style', label: 'Execution Style' },
  { value: 'problem_solving_vectors', label: 'Problem Solving' },
  { value: 'culture_alignment', label: 'Culture Alignment' },
  { value: 'success_signals', label: 'Success Signals' }
];
