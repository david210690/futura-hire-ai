import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Video, StopCircle, Upload, AlertCircle, CheckCircle2, Camera } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
export default function CandidateVideo() {
  const [user, setUser] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingCamera, setCheckingCamera] = useState(false);
  const [checkingAttire, setCheckingAttire] = useState(false);
  const [cameraValid, setCameraValid] = useState(false);
  const [attireValid, setAttireValid] = useState(false);
  const [attireResult, setAttireResult] = useState<any>(null);
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

  const checkCameraResolution = async () => {
    setCheckingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      console.log('Camera settings:', settings);
      
      const width = settings.width || 0;
      const height = settings.height || 0;
      
      // Check if resolution is at least 720p (1280x720)
      const isHD = height >= 720 && width >= 1280;
      
      if (!isHD) {
        stream.getTracks().forEach(track => track.stop());
        toast({
          title: "Camera resolution too low",
          description: `Your camera resolution is ${width}x${height}. Minimum required is 1280x720 (HD).`,
          variant: "destructive",
        });
        setCameraValid(false);
        return;
      }
      
      // Camera is valid, keep stream for preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setCameraValid(true);
      toast({
        title: "Camera validated",
        description: `Camera resolution: ${width}x${height} ✓`,
      });
    } catch (error: any) {
      console.error('Error checking camera:', error);
      toast({
        title: "Camera error",
        description: "Failed to access camera. Please ensure you have an HD webcam connected.",
        variant: "destructive",
      });
      setCameraValid(false);
    } finally {
      setCheckingCamera(false);
    }
  };

  const captureSnapshot = (): string => {
    if (!videoRef.current) return '';
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const checkAttire = async () => {
    if (!cameraValid) {
      toast({
        title: "Camera not ready",
        description: "Please check your camera first",
        variant: "destructive",
      });
      return;
    }

    setCheckingAttire(true);
    try {
      const snapshot = captureSnapshot();
      
      if (!snapshot) {
        throw new Error('Failed to capture snapshot');
      }

      const { data, error } = await supabase.functions.invoke('check-professional-attire', {
        body: { image_data: snapshot }
      });

      if (error) throw error;

      setAttireResult(data);
      setAttireValid(data.is_professional && data.confidence >= 70);

      if (data.is_professional && data.confidence >= 70) {
        toast({
          title: "Professional attire confirmed",
          description: data.feedback,
        });
      } else {
        toast({
          title: "Attire needs improvement",
          description: data.feedback,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error checking attire:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to check attire",
        variant: "destructive",
      });
      setAttireValid(false);
    } finally {
      setCheckingAttire(false);
    }
  };

  const startRecording = async () => {
    if (!cameraValid || !attireValid) {
      toast({
        title: "Requirements not met",
        description: "Please ensure camera is HD and attire is professional",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = videoRef.current?.srcObject as MediaStream;
      if (!stream) {
        throw new Error('No video stream available');
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
        description: "Failed to start recording",
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
    setCameraValid(false);
    setAttireValid(false);
    setAttireResult(null);
    
    // Stop current stream
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar userName={user?.user_metadata?.name} userRole="candidate" />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Preparing video recorder" size="sm" />
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
            <CardTitle>Video Recording Requirements</CardTitle>
            <CardDescription>
              Before recording, please ensure your setup meets our requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Camera Check */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  <h3 className="font-semibold">Step 1: Camera Resolution Check</h3>
                </div>
                {cameraValid && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              </div>
              
              {!cameraValid && !checkingCamera && (
                <Button onClick={checkCameraResolution} variant="outline" className="w-full">
                  Check Camera
                </Button>
              )}
              
              {checkingCamera && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking camera resolution...
                </div>
              )}
              
              {cameraValid && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Camera Validated</AlertTitle>
                  <AlertDescription>
                    Your camera meets the HD requirements (minimum 1280x720)
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Step 2: Attire Check */}
            {cameraValid && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <h3 className="font-semibold">Step 2: Professional Attire Check</h3>
                  </div>
                  {attireValid && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
                
                {!attireValid && !checkingAttire && (
                  <Button onClick={checkAttire} variant="outline" className="w-full">
                    Check My Attire
                  </Button>
                )}
                
                {checkingAttire && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing your professional attire...
                  </div>
                )}
                
                {attireResult && (
                  <Alert variant={attireValid ? "default" : "destructive"}>
                    {attireValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>
                      {attireValid ? "Professional Attire Confirmed" : "Attire Needs Improvement"}
                    </AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">{attireResult.feedback}</p>
                      {attireResult.suggestions && attireResult.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold text-sm">Suggestions:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm mt-1">
                            {attireResult.suggestions.map((suggestion: string, i: number) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-xs mt-2">Confidence: {attireResult.confidence}%</p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Video Preview */}
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
              {!recording && !recordedBlob && !cameraValid && (
                <Button onClick={checkCameraResolution} size="lg" disabled={checkingCamera}>
                  {checkingCamera ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Checking Camera...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-5 w-5" />
                      Start Setup
                    </>
                  )}
                </Button>
              )}

              {!recording && !recordedBlob && cameraValid && attireValid && (
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

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Requirements for recording:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>HD webcam (minimum 1280x720 resolution)</li>
                <li>Professional business attire</li>
                <li>Good lighting and quiet environment</li>
                <li>Keep video under 2 minutes</li>
              </ul>
              
              <h3 className="font-semibold mt-4">Professional attire guidelines:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Business formal or business casual preferred</li>
                <li>Collared shirts, blouses, or blazers</li>
                <li>Avoid t-shirts, hoodies, or casual wear</li>
                <li>No visible graphics or logos</li>
                <li>Clean, well-fitted clothing</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
