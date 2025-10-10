import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(RESEND_API_KEY);
    const { type, email, data } = await req.json();

    let emailContent;
    
    if (type === "application_received") {
      emailContent = {
        from: "FuturaHire <onboarding@resend.dev>",
        to: [email],
        subject: `Application Received - ${data.jobTitle} at ${data.orgName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">Thank you for applying!</h1>
            <p>Dear ${data.candidateName},</p>
            <p>We have received your application for <strong>${data.jobTitle}</strong> at <strong>${data.orgName}</strong>.</p>
            <p>Track your application status and complete the next steps by clicking below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.statusUrl}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                View Application Status
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Best regards,<br>FuturaHire Team</p>
          </div>
        `,
      };
    } else if (type === "assessment_invitation") {
      emailContent = {
        from: "FuturaHire <onboarding@resend.dev>",
        to: [email],
        subject: `Start Your Assessment - ${data.jobTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">Assessment Ready</h1>
            <p>Dear ${data.candidateName},</p>
            <p>You're invited to complete the AI-powered assessment for <strong>${data.jobTitle}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Important Requirements:</h3>
              <ul style="line-height: 1.8;">
                <li>Stable internet connection required</li>
                <li>Find a quiet environment</li>
                <li>Duration: ${data.duration} minutes</li>
                <li>Do not refresh or close browser during assessment</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.assessmentUrl}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Start Assessment Now
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Best regards,<br>FuturaHire Team</p>
          </div>
        `,
      };
    } else if (type === "video_invitation") {
      emailContent = {
        from: "FuturaHire <onboarding@resend.dev>",
        to: [email],
        subject: `Video Introduction Required - ${data.jobTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #3b82f6;">Record Your Video Introduction</h1>
            <p>Dear ${data.candidateName},</p>
            <p>Please record a 2-minute video introduction for <strong>${data.jobTitle}</strong>.</p>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">Technical Requirements:</h3>
              <ul style="line-height: 1.8; color: #78350f;">
                <li><strong>HD webcam</strong> (≥720p resolution)</li>
                <li><strong>Professional attire</strong></li>
                <li><strong>Good lighting</strong> and neutral background</li>
                <li><strong>Quiet environment</strong></li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.videoUrl}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Record Video Now
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Best regards,<br>FuturaHire Team</p>
          </div>
        `,
      };
    } else {
      throw new Error("Unknown email type");
    }

    const result = await resend.emails.send(emailContent);
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
