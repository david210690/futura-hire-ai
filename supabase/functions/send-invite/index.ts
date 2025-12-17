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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header provided');
      throw new Error('No authorization header');
    }

    // Create client with user's auth token for permission checks
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }
    if (!user) {
      console.error('No user found');
      throw new Error('Unauthorized');
    }
    
    console.log('User authenticated:', user.id);

    // Create admin client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Generate invite token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours

    // Create invite
    const { error: inviteError } = await supabase
      .from('invites')
      .insert({
        org_id: orgId,
        email,
        role,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      });

    if (inviteError) throw inviteError;

    // TODO: Send email with magic link containing token
    // For now, just log it
    console.log(`Invite created for ${email} with token: ${token}`);
    console.log(`Invite link: ${Deno.env.get('SUPABASE_URL')}/auth/accept-invite?token=${token}`);

    return new Response(
      JSON.stringify({ success: true, token }),
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
