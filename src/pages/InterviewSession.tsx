import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mic, MicOff, Play, Pause, SkipForward, CheckCircle, Loader2, Volume2, 
  AlertCircle, ChevronRight, XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_index: number;
  question_text: string;
  question_type: string;
  ideal_answer_points: string | null;
}

interface Answer {
  id: string;
  question_id: string;
  transcript: string | null;
  score: number | null;
  feedback: string | null;
}

interface Session {
  id: string;
  role_title: string;
  mode: string;
  difficulty: string;
  status: string;
  total_questions: number | null;
}

export default function InterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [manualTranscript, setManualTranscript] = useState("");
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    loadSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.speechSynthesis.cancel();
    };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from("interview_simulation_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (sessionError || !sessionData) {
        toast({ title: "Session not found", variant: "destructive" });
        navigate("/interview-practice");
        return;
      }

      setSession(sessionData as Session);

      // Load questions
      const { data: questionsData } = await supabase
        .from("interview_simulation_questions")
        .select("*")
        .eq("session_id", sessionId)
        .order("question_index");

      setQuestions((questionsData as Question[]) || []);

      // Load existing answers
      const { data: answersData } = await supabase
        .from("interview_simulation_answers")
        .select("*")
        .eq("session_id", sessionId);

      setAnswers((answersData as Answer[]) || []);

      // Set current index to first unanswered question
      const answeredIds = new Set((answersData || []).map((a: any) => a.question_id));
      const firstUnanswered = (questionsData || []).findIndex((q: any) => !answeredIds.has(q.id));
      setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);

    } catch (error) {
      console.error("Error loading session:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find(a => a.question_id === currentQuestion?.id);
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // TTS for playing question
  const playQuestion = useCallback(() => {
    if (!currentQuestion || isPlaying) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.question_text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [currentQuestion, isPlaying]);

  const stopPlaying = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

    } catch (error) {
      console.error("Error starting recording:", error);
      toast({ 
        title: "Microphone access denied", 
        description: "Please allow microphone access to record your answer",
        variant: "destructive" 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!currentQuestion) return;
    
    // Use manual transcript if provided, or indicate audio was recorded
    const transcript = manualTranscript.trim() || (audioBlob ? "[Audio recorded]" : "");
    
    if (!transcript) {
      toast({ title: "Please record your answer or type it", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      // Evaluate answer
      const response = await supabase.functions.invoke("interview-evaluate-answer", {
        headers: { Authorization: `Bearer ${authSession?.access_token}` },
        body: {
          session_id: sessionId,
          question_id: currentQuestion.id,
          transcript: manualTranscript.trim() || transcript,
          audio_url: null, // Could upload audio here if needed
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { answer, evaluation } = response.data;
      setAnswers(prev => [...prev, answer]);
      
      toast({ 
        title: `Score: ${evaluation.score}/10`, 
        description: "Answer evaluated! See feedback below."
      });

      // Reset for next question
      setAudioBlob(null);
      setManualTranscript("");
      setRecordingTime(0);

    } catch (error: any) {
      console.error("Error submitting answer:", error);
      toast({ title: "Failed to evaluate answer", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAudioBlob(null);
      setManualTranscript("");
    }
  };

  const endSession = async () => {
    setIsProcessing(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("interview-complete-session", {
        headers: { Authorization: `Bearer ${authSession?.access_token}` },
        body: { session_id: sessionId },
      });

      if (response.error) throw new Error(response.error.message);

      toast({ title: "Session completed!" });
      navigate(`/interview-practice/session/${sessionId}/review`);
    } catch (error: any) {
      console.error("Error completing session:", error);
      toast({ title: "Failed to complete session", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
          <Button onClick={() => navigate("/interview-practice")}>Back to Practice</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{session.role_title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline" className="capitalize">{session.mode}</Badge>
                <Badge variant="secondary" className="capitalize">{session.difficulty}</Badge>
              </div>
            </div>
            <Button variant="outline" onClick={endSession} disabled={isProcessing}>
              {answers.length === questions.length ? "View Results" : "End Session"}
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{answers.length} answered</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="capitalize">{currentQuestion?.question_type}</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={isPlaying ? stopPlaying : playQuestion}
              >
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                {isPlaying ? "Stop" : "Play Question"}
              </Button>
            </div>
            <CardTitle className="text-xl leading-relaxed mt-2">
              {currentQuestion?.question_text}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Answer Section */}
        {currentAnswer ? (
          // Show existing answer
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Your Answer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{currentAnswer.transcript}</p>
              </div>
              
              {currentAnswer.score !== null && (
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-primary">
                    {currentAnswer.score}/10
                  </div>
                  <div className="flex-1">
                    <Progress value={currentAnswer.score * 10} className="h-3" />
                  </div>
                </div>
              )}
              
              {currentAnswer.feedback && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <h4 className="font-medium mb-2">Feedback</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {currentAnswer.feedback}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Recording interface
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Answer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voice Recording */}
              <div className="flex items-center justify-center gap-4 py-6">
                {!isRecording ? (
                  <Button 
                    size="lg" 
                    onClick={startRecording}
                    disabled={isProcessing}
                    className="h-16 px-8"
                  >
                    <Mic className="h-6 w-6 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-950/50 rounded-lg">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
                    </div>
                    <Button 
                      size="lg" 
                      variant="destructive"
                      onClick={stopRecording}
                    >
                      <MicOff className="h-6 w-6 mr-2" />
                      Stop Recording
                    </Button>
                  </div>
                )}
              </div>

              {audioBlob && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Audio recorded ({formatTime(recordingTime)})
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or type your answer</span>
                </div>
              </div>

              <Textarea
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                placeholder="Type your answer here if you prefer not to record..."
                rows={4}
                disabled={isProcessing}
              />

              <Button 
                className="w-full" 
                onClick={submitAnswer}
                disabled={isProcessing || (!audioBlob && !manualTranscript.trim())}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                {isProcessing ? "Evaluating..." : "Submit Answer"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          
          {currentIndex < questions.length - 1 ? (
            <Button onClick={nextQuestion}>
              Next Question
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={endSession} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Complete Session
            </Button>
          )}
        </div>

        {/* Ideal Answer Hints (collapsible) */}
        {currentQuestion?.ideal_answer_points && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Show ideal answer points (hints)
            </summary>
            <Card className="mt-2">
              <CardContent className="py-4">
                <p className="text-sm whitespace-pre-wrap">{currentQuestion.ideal_answer_points}</p>
              </CardContent>
            </Card>
          </details>
        )}
      </main>
    </div>
  );
}
