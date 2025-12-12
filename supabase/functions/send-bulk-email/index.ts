import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Candidate {
  applicationId: string;
  candidateName: string;
}

interface BulkEmailRequest {
  candidates: Candidate[];
  subject: string;
  body: string;
  jobTitle: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { candidates, subject, body, jobTitle }: BulkEmailRequest = await req.json();

    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates provided");
    }

    // Fetch candidate emails from applications
    const applicationIds = candidates.map((c) => c.applicationId);
    
    const { data: applications, error: appError } = await supabaseClient
      .from("applications")
      .select(`
        id,
        candidates (
          id,
          full_name,
          user_id
        )
      `)
      .in("id", applicationIds);

    if (appError) throw appError;

    // Get user emails
    const userIds = applications
      ?.map((app: any) => app.candidates?.user_id)
      .filter(Boolean) || [];

    // For now, we'll use the candidate info we have
    // In production, you'd fetch actual emails from auth.users
    
    let sentCount = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      try {
        // Personalize the email
        const personalizedBody = body
          .replace(/\{\{name\}\}/g, candidate.candidateName)
          .replace(/\{\{job_title\}\}/g, jobTitle);

        const personalizedSubject = subject
          .replace(/\{\{name\}\}/g, candidate.candidateName)
          .replace(/\{\{job_title\}\}/g, jobTitle);

        // Note: In production, you'd send to actual candidate email
        // For demo, we log the email that would be sent
        console.log(`Would send email to ${candidate.candidateName}:`, {
          subject: personalizedSubject,
          body: personalizedBody,
        });

        // Uncomment below to actually send emails when you have verified domain
        /*
        await resend.emails.send({
          from: "FuturHire <noreply@yourdomain.com>",
          to: [candidateEmail],
          subject: personalizedSubject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Hello ${candidate.candidateName},</h2>
              <div style="white-space: pre-wrap; color: #555; line-height: 1.6;">
                ${personalizedBody}
              </div>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888;">
                This email was sent regarding your application for ${jobTitle}.
              </p>
            </div>
          `,
        });
        */

        sentCount++;
      } catch (emailError: any) {
        console.error(`Error sending to ${candidate.candidateName}:`, emailError);
        errors.push(`${candidate.candidateName}: ${emailError.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        total: candidates.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully processed ${sentCount} of ${candidates.length} emails`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
