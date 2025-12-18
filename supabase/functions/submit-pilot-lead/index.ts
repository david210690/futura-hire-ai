import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PilotLeadRequest {
  company_name: string;
  name: string;
  email: string;
  phone?: string;
  hiring_volume: string;
  note?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PilotLeadRequest = await req.json();
    const { company_name, name, email, phone, hiring_volume, note } = body;

    // Validate required fields
    if (!company_name || !name || !email || !hiring_volume) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("pilot_leads")
      .insert({
        company_name,
        name,
        email,
        phone,
        hiring_volume,
        note,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting lead:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit lead" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Lead saved successfully:", lead.id);

    // Send notification email to admin if Resend is configured
    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "FuturaHire <hello@futurahire.app>",
            to: ["sales@feelivacation.com"],
            subject: `New Pilot Lead: ${company_name}`,
            html: `
              <h2>New Pilot Application</h2>
              <p><strong>Company:</strong> ${company_name}</p>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
              <p><strong>Hiring Volume:</strong> ${hiring_volume}</p>
              <p><strong>Note:</strong> ${note || "None"}</p>
              <hr/>
              <p style="color: #666; font-size: 12px;">Submitted at ${new Date().toISOString()}</p>
            `,
          }),
        });

        if (emailResponse.ok) {
          console.log("Admin notification email sent");
        } else {
          console.error("Failed to send email:", await emailResponse.text());
        }
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email notification");
    }

    return new Response(
      JSON.stringify({ success: true, id: lead.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in submit-pilot-lead:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
