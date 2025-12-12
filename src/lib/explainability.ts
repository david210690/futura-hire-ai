// Trust & Explainability Layer - Shared utilities

export const FAIRNESS_POLICY_VERSION = "v1.0";

export interface ExplainabilityBlock {
  what_was_evaluated: string;
  key_factors_considered: string[];
  factors_not_considered: string[];
  confidence_level: "low" | "medium" | "high";
  limitations: string[];
}

export interface FairnessChecks {
  protected_attributes_excluded: boolean;
  non_linear_careers_penalized: boolean;
  nd_safe_language: boolean;
  policy_version: string;
}

export interface AuditLogEntry {
  decision_type: string;
  job_twin_job_id?: string;
  candidate_user_id?: string;
  recruiter_user_id?: string;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  explanation: string;
  fairness_checks: FairnessChecks;
  model_metadata: {
    model: string;
    temperature?: number;
    version: string;
    policy_version: string;
  };
}

// Standard factors NOT considered (protected attributes)
export const FACTORS_NOT_CONSIDERED = [
  "Age",
  "Gender",
  "Ethnicity",
  "Accent or speech patterns",
  "Disability status",
  "Religion",
  "Family or marital status",
  "Socio-economic background",
  "Career gaps by themselves"
];

// Standard fairness checks that all AI modules apply
export const DEFAULT_FAIRNESS_CHECKS: FairnessChecks = {
  protected_attributes_excluded: true,
  non_linear_careers_penalized: false,
  nd_safe_language: true,
  policy_version: FAIRNESS_POLICY_VERSION
};

// Protected attribute patterns to detect and strip from AI output
const PROTECTED_ATTRIBUTE_PATTERNS = [
  /\bage\s*:?\s*\d+/gi,
  /\b(male|female|gender|man|woman)\b(?!\s*(role|position|candidate|manager))/gi,
  /\b(ethnicity|ethnic|race|racial)\b/gi,
  /\b(accent|accented)\b/gi,
  /\b(disability|disabled)\b/gi,
  /\b(religion|religious)\b/gi,
  /\b(married|single|divorced|spouse|children)\b/gi
];

/**
 * Sanitize AI output to remove any protected attribute mentions
 * Returns sanitized text and whether sanitization occurred
 */
export function sanitizeAIOutput(text: string): { sanitized: string; wasModified: boolean } {
  let sanitized = text;
  let wasModified = false;

  for (const pattern of PROTECTED_ATTRIBUTE_PATTERNS) {
    if (pattern.test(sanitized)) {
      wasModified = true;
      sanitized = sanitized.replace(pattern, "[REDACTED]");
      console.warn(`[Fairness Guard] Detected and removed protected attribute mention: ${pattern.source}`);
    }
  }

  return { sanitized, wasModified };
}

/**
 * Create a standard explainability block for an AI decision
 */
export function createExplainabilityBlock(params: {
  whatWasEvaluated: string;
  keyFactors: string[];
  confidenceLevel: "low" | "medium" | "high";
  limitations: string[];
}): ExplainabilityBlock {
  return {
    what_was_evaluated: params.whatWasEvaluated,
    key_factors_considered: params.keyFactors,
    factors_not_considered: FACTORS_NOT_CONSIDERED,
    confidence_level: params.confidenceLevel,
    limitations: params.limitations
  };
}

/**
 * Format explainability block as human-readable text
 */
export function formatExplanationText(block: ExplainabilityBlock): string {
  return `
**What was evaluated:**
${block.what_was_evaluated}

**Key factors considered:**
${block.key_factors_considered.map(f => `• ${f}`).join('\n')}

**Factors explicitly NOT considered:**
${block.factors_not_considered.map(f => `• ${f}`).join('\n')}

**Confidence level:** ${block.confidence_level}

**Limitations:**
${block.limitations.map(l => `• ${l}`).join('\n')}
`.trim();
}

// Decision type constants
export const DECISION_TYPES = {
  ROLE_DNA_GENERATION: "role_dna_generation",
  ROLE_DNA_FIT: "role_dna_fit",
  SHORTLIST_SCORE: "shortlist_score",
  OFFER_LIKELIHOOD: "offer_likelihood",
  PIPELINE_HEALTH: "pipeline_health",
  HIRING_AUTOPILOT: "hiring_autopilot"
} as const;

// Standard disclaimers
export const DISCLAIMERS = {
  RECRUITER_STANDARD: "AI insights in FuturHire are designed to support decision-making, not replace human judgment. They are directional, explainable, and exclude protected attributes by design.",
  CANDIDATE_FRIENDLY: "This is guidance to help you prepare, not a judgment of your worth or potential. Everyone's path is different, and that's okay.",
  INTERVIEW_PREP: "This prep plan is based on role expectations and your visible signals. It does not judge your intelligence, personality, or potential."
};
