import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { team_id } = await req.json();
    if (!team_id) {
      throw new Error('Missing team_id');
    }

    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', team_id);

    if (membersError) throw membersError;

    if (!members || members.length === 0) {
      // No members yet, create default profile
      const defaultVector = {
        creativity: 50,
        analysis: 50,
        execution: 50,
        communication: 50,
        empathy: 50,
      };

      // Get org_id from team
      const { data: team } = await supabase
        .from('teams')
        .select('org_id')
        .eq('id', team_id)
        .single();

      if (!team) throw new Error('Team not found');

      const { data: profile, error: insertError } = await supabase
        .from('team_profiles')
        .upsert({
          team_id,
          org_id: team.org_id,
          vector: defaultVector,
          notes: 'Default profile - no team members yet',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute aggregated traits
    const dimensions = ['creativity', 'analysis', 'execution', 'communication', 'empathy'];
    const totals: Record<string, number> = {};

    for (const dim of dimensions) {
      totals[dim] = 0;
    }

    let validMembers = 0;
    for (const member of members) {
      if (!member.trait_vector) continue;
      
      const traits = member.trait_vector as Record<string, any>;
      for (const dim of dimensions) {
        if (traits[dim] !== undefined) {
          totals[dim] += traits[dim];
        }
      }
      validMembers++;
    }

    const vector: Record<string, number> = {};
    for (const dim of dimensions) {
      vector[dim] = validMembers > 0 
        ? Math.round(totals[dim] / validMembers) 
        : 50;
      vector[dim] = Math.max(0, Math.min(100, vector[dim]));
    }

    // Get org_id
    const { data: team } = await supabase
      .from('teams')
      .select('org_id')
      .eq('id', team_id)
      .single();

    if (!team) throw new Error('Team not found');

    // Upsert team profile
    const { data: profile, error: upsertError } = await supabase
      .from('team_profiles')
      .upsert({
        team_id,
        org_id: team.org_id,
        vector,
        notes: `Updated from ${validMembers} members`,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    console.log(`Updated team profile for team ${team_id}:`, vector);

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compute-team-profile:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});