import { supabase } from "@/integrations/supabase/client";

export type AutopilotActionType = 
  | 'email_sent'
  | 'linkedin_message_sent'
  | 'fit_request_sent'
  | 'voice_interview_requested'
  | 'stage_updated';

export interface AutopilotActionPayload {
  subject?: string;
  body?: string;
  template?: string;
  newStage?: string;
  previousStage?: string;
  roleTitle?: string;
  [key: string]: unknown;
}

export interface AutopilotActionResult {
  success: boolean;
  status: 'completed' | 'skipped' | 'failed';
  logId?: string;
  message?: string;
  error?: string;
}

export async function executeAutopilotAction(
  actionType: AutopilotActionType,
  jobId: string,
  candidateId?: string,
  payload?: AutopilotActionPayload
): Promise<AutopilotActionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('execute-autopilot-action', {
      body: {
        actionType,
        jobId,
        candidateId,
        payload
      }
    });

    if (error) {
      console.error('Autopilot action error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message
      };
    }

    return data;
  } catch (error) {
    console.error('Autopilot action exception:', error);
    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function skipAutopilotAction(
  actionType: AutopilotActionType,
  jobId: string,
  candidateId?: string,
  reason?: string
): Promise<AutopilotActionResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, status: 'failed', error: 'Not authenticated' };
    }

    // Directly log the skipped action
    const { data, error } = await supabase
      .from('autopilot_action_logs')
      .insert({
        recruiter_user_id: session.user.id,
        job_twin_job_id: jobId,
        candidate_user_id: candidateId || null,
        action_type: actionType,
        action_payload: { skipped: true, reason },
        status: 'skipped'
      })
      .select()
      .single();

    if (error) {
      console.error('Skip action log error:', error);
      return { success: false, status: 'failed', error: error.message };
    }

    return {
      success: true,
      status: 'skipped',
      logId: data?.id,
      message: 'Action skipped'
    };
  } catch (error) {
    console.error('Skip action exception:', error);
    return {
      success: false,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function getActionTypeLabel(actionType: string): string {
  const labels: Record<string, string> = {
    'email_sent': 'Email Sent',
    'linkedin_message_sent': 'LinkedIn Message Sent',
    'fit_request_sent': 'Fit Request Sent',
    'voice_interview_requested': 'Voice Interview Requested',
    'stage_updated': 'Stage Updated'
  };
  return labels[actionType] || actionType;
}

export function getActionTypeIcon(actionType: string): string {
  const icons: Record<string, string> = {
    'email_sent': 'mail',
    'linkedin_message_sent': 'linkedin',
    'fit_request_sent': 'dna',
    'voice_interview_requested': 'mic',
    'stage_updated': 'arrow-right'
  };
  return icons[actionType] || 'zap';
}
