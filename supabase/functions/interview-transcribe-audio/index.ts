import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audio, session_id, question_id, save_audio } = await req.json();

    if (!audio) {
      return new Response(JSON.stringify({ error: "No audio data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Transcribing audio for session:", session_id);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Optionally save audio to storage
    let audioUrl = null;
    if (save_audio) {
      const fileName = `${user.id}/${session_id}/${question_id}_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("interview-recordings")
        .upload(fileName, binaryAudio, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
      } else {
        const { data: urlData } = supabase.storage
          .from("interview-recordings")
          .getPublicUrl(fileName);
        audioUrl = urlData?.publicUrl;
      }
    }

    // Use Lovable AI for transcription via a workaround
    // Since we don't have direct Whisper, we'll use Gemini's audio capabilities
    // For now, we'll send the audio as base64 to Gemini which can process audio
    
    // Alternative: Use a simple prompt-based approach
    // In production, you'd integrate with a proper STT service
    
    // For this implementation, we'll simulate transcription with Gemini
    // by sending audio context and asking for transcription
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Please transcribe the following audio recording. Return only the transcription text, nothing else."
              },
              {
                type: "input_audio",
                input_audio: {
                  data: audio,
                  format: "webm"
                }
              }
            ]
          },
        ],
      }),
    });

    let transcript = "";
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      transcript = aiData.choices?.[0]?.message?.content || "";
      console.log("Transcription successful");
    } else {
      // Fallback: If audio transcription fails, return a placeholder
      console.log("Audio transcription not available, using fallback");
      transcript = "[Audio transcription pending - please type your answer]";
    }

    return new Response(JSON.stringify({ 
      transcript,
      audio_url: audioUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
