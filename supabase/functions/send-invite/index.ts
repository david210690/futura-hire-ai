import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header provided');
      throw new Error('No authorization header');
    }

    // Extract token from Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Create admin client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user's token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }
    if (!user) {
      console.error('No user found');
      throw new Error('Unauthorized');
    }
    
    console.log('User authenticated:', user.id);

    const { orgId, email, role } = await req.json();

    // Verify user is a member of org (any role can invite)
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      throw new Error('You must be a member of this organization to send invites');
    }

    // Get organization name for email
    const { data: org } = await supabase
      .from('orgs')
      .select('name')
      .eq('id', orgId)
      .single();

    // Get inviter name
    const { data: inviterUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours

    // Create invite
    const { error: inviteError } = await supabase
      .from('invites')
      .insert({
        org_id: orgId,
        email,
        role,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      });

    if (inviteError) throw inviteError;

    // Build invite link - use the app URL
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovableproject.com') 
      || 'https://futurahire.app';
    const inviteLink = `${appUrl}/accept-invite?token=${inviteToken}`;

    // Send invitation email
    const orgName = org?.name || 'an organization';
    const inviterName = inviterUser?.name || 'A team member';

    console.log(`Sending invite email to ${email} for org ${orgName}`);

    const emailResponse = await resend.emails.send({
      from: "FuturaHire <hello@futurahire.app>",
      to: [email],
      subject: `You've been invited to join ${orgName} on FuturaHire`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a1a; margin-bottom: 10px;">You're Invited!</h1>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on FuturaHire as a <strong>${role}</strong>.
            </p>
            <p style="margin: 0; font-size: 14px; color: #666;">
              FuturaHire helps teams make better hiring decisions with interview intelligence.
            </p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            This invitation will expire in 72 hours.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            If you didn't expect this invitation, you can safely ignore this email.
            <br><br>
            © FuturaHire. Operated by KSuiteLabs OPC Private Limited.
          </p>
        </body>
        </html>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, token: inviteToken }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
