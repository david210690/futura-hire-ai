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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const { image_data } = await req.json();

    if (!image_data) {
      throw new Error('No image data provided');
    }

    const systemPrompt = `You are a professional dress code analyzer. Analyze the person's attire in the image and determine if they are dressed professionally for a job interview video.

Professional attire includes:
- Business formal: suits, dress shirts, blazers, ties
- Business casual: collared shirts, blouses, neat sweaters
- Clean, well-fitted clothing
- Solid colors or subtle patterns
- No visible logos or graphics (unless corporate)

Unprofessional includes:
- T-shirts, tank tops, hoodies
- Sleepwear or athletic wear
- Torn or stained clothing
- Overly casual clothing
- Inappropriate graphics or text

Return ONLY a JSON object with this exact structure:
{
  "is_professional": boolean,
  "confidence": number (0-100),
  "feedback": "Brief explanation of the assessment",
  "suggestions": ["specific improvement tip 1", "specific improvement tip 2"]
}`;

    const userPrompt = "Analyze this person's attire and determine if it's appropriate for a professional job interview video.";

    const startTime = Date.now();

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image_url', 
                image_url: { url: image_data }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const latency = Date.now() - startTime;

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON from AI');
    }

    // Log AI run
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from('ai_runs')
      .insert({
        kind: 'attire_check',
        model_name: 'google/gemini-2.5-flash',
        latency_ms: latency,
        status: 'ok',
        output_json: result,
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-professional-attire:', error);
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
