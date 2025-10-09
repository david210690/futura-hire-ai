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

    const { org_id } = await req.json();
    if (!org_id) {
      throw new Error('Missing org_id');
    }

    // Fetch last 50 culture events for this org
    const { data: events, error: eventsError } = await supabase
      .from('culture_events')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      // No events yet, create default profile
      const defaultVector = {
        communication: 50,
        ownership: 50,
        collaboration: 50,
        stability: 50,
        risk_taking: 50,
      };

      const { data: profile, error: insertError } = await supabase
        .from('culture_profiles')
        .upsert({
          org_id,
          vector: defaultVector,
          notes: 'Default profile - no culture events yet',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify(profile), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Compute weighted average vector
    const dimensions = ['communication', 'ownership', 'collaboration', 'stability', 'risk_taking'];
    const accumulated: Record<string, number> = {};
    let totalWeight = 0;

    for (const dim of dimensions) {
      accumulated[dim] = 0;
    }

    for (const event of events) {
      const payload = event.payload as Record<string, any>;
      const weight = Number(event.weight);
      
      for (const dim of dimensions) {
        if (payload[dim] !== undefined) {
          accumulated[dim] += payload[dim] * weight;
        }
      }
      totalWeight += weight;
    }

    const vector: Record<string, number> = {};
    for (const dim of dimensions) {
      vector[dim] = totalWeight > 0 
        ? Math.round(accumulated[dim] / totalWeight) 
        : 50;
      // Clamp to 0-100
      vector[dim] = Math.max(0, Math.min(100, vector[dim]));
    }

    // Upsert culture profile
    const { data: profile, error: upsertError } = await supabase
      .from('culture_profiles')
      .upsert({
        org_id,
        vector,
        notes: `Updated from ${events.length} events`,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    console.log(`Updated culture profile for org ${org_id}:`, vector);

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-culture-profile:', error);
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