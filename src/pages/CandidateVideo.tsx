import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Video, StopCircle, Upload } from "lucide-react";

export default function CandidateVideo() {
  const [user, setUser] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      const { data: candidateData } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!candidateData) {
        toast({
          title: "Profile required",
          description: "Please create your profile first",
          variant: "destructive",
        });
        navigate('/candidate/profile');
        return;
      }

      setCandidate(candidateData);
      setLoading(false);
    };

    fetchData();
  }, [navigate, toast]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorder.start();
      setRecording(true);

      toast({
        title: "Recording started",
        description: "Introduce yourself! (max 2 minutes)",
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to access camera/microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadVideo = async () => {
    if (!recordedBlob || !candidate) return;

    setUploading(true);

    try {
      // Upload to storage
      const fileName = `${candidate.id}-${Date.now()}.webm`;
      const filePath = `${candidate.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, recordedBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // Create video record
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          candidate_id: candidate.id,
          file_url: publicUrl,
          duration_sec: 120, // You can calculate actual duration if needed
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // Trigger video analysis
      const { error: analysisError } = await supabase.functions.invoke('analyze-video', {
        body: { video_id: videoData.id }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        // Don't fail if analysis fails, just log it
      }

      toast({
        title: "Video uploaded",
        description: "Your intro video has been uploaded and is being analyzed.",
      });

      navigate('/candidate/dashboard');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const retake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Record Intro Video</h1>
          <p className="text-muted-foreground">
            Record a short video to introduce yourself and boost your culture-fit score
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Video Recording</CardTitle>
            <CardDescription>
              {recording ? 
                "Recording in progress... Click stop when done (max 2 minutes)" : 
                recordedBlob ? 
                  "Preview your recording below" : 
                  "Click start to begin recording your intro video"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {previewUrl ? (
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
              
              {!recording && !recordedBlob && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Camera preview will appear here</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              {!recording && !recordedBlob && (
                <Button onClick={startRecording} size="lg">
                  <Video className="mr-2 h-5 w-5" />
                  Start Recording
                </Button>
              )}

              {recording && (
                <Button onClick={stopRecording} variant="destructive" size="lg">
                  <StopCircle className="mr-2 h-5 w-5" />
                  Stop Recording
                </Button>
              )}

              {recordedBlob && !recording && (
                <>
                  <Button onClick={retake} variant="outline" size="lg">
                    Retake
                  </Button>
                  <Button onClick={uploadVideo} disabled={uploading} size="lg">
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Upload Video
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Tips for a great intro video:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Keep it under 2 minutes</li>
                <li>Introduce yourself and your background</li>
                <li>Mention your key skills and experience</li>
                <li>Share what you're passionate about</li>
                <li>Ensure good lighting and audio quality</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
