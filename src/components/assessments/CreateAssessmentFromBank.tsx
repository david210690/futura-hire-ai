import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database, Filter, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useToast } from "@/hooks/use-toast";

interface CreateAssessmentFromBankProps {
  onSuccess: () => void;
}

export const CreateAssessmentFromBank = ({ onSuccess }: CreateAssessmentFromBankProps) => {
  const { currentOrg } = useCurrentOrg();
  const { toast } = useToast();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [assessmentName, setAssessmentName] = useState("");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(70);
  const [purpose, setPurpose] = useState<"screening" | "skills" | "culture" | "coding">("skills");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterTag, setFilterTag] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["question-bank", currentOrg?.id, filterType, filterDifficulty, filterTag],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      let query = supabase
        .from("question_bank")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (filterType !== "all") {
        query = query.eq("type", filterType as "mcq" | "free_text" | "coding");
      }
      if (filterDifficulty !== "all") {
        query = query.eq("difficulty", filterDifficulty as "easy" | "medium" | "hard");
      }
      if (filterTag) {
        query = query.contains("skill_tags", [filterTag]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleCreateAssessment = async () => {
    if (!currentOrg?.id || !assessmentName || selectedQuestions.length === 0) {
      toast({
        title: "Missing information",
        description: "Please provide assessment name and select at least one question",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedQuestionsData = questions?.filter(q => selectedQuestions.includes(q.id));
      const totalPoints = selectedQuestionsData?.reduce((sum, q) => sum + (q.points || 10), 0) || 100;

      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          org_id: currentOrg.id,
          name: assessmentName,
          purpose,
          description: `Custom assessment with ${selectedQuestions.length} questions`,
          duration_minutes: duration,
          total_points: totalPoints,
          passing_score: passingScore,
          shuffle: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      const questionLinks = selectedQuestions.map((questionId, index) => ({
        assessment_id: assessment.id,
        question_id: questionId,
        order_index: index,
      }));

      const { error: linkError } = await supabase
        .from("assessment_questions")
        .insert(questionLinks);

      if (linkError) throw linkError;

      toast({
        title: "Assessment created",
        description: `${assessmentName} has been created successfully`,
      });

      setSelectedQuestions([]);
      setAssessmentName("");
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error creating assessment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const allTags = Array.from(
    new Set(questions?.flatMap(q => q.skill_tags || []) || [])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Create from Question Bank
        </CardTitle>
        <CardDescription>
          Select questions from your organization's question bank to create a custom assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Question type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="free_text">Free Text</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          {allTags.length > 0 && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Skill tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Separator />

        {/* Questions List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
          ) : !questions || questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No questions found. Generate or import questions first.
            </div>
          ) : (
            questions.map((question) => (
              <div
                key={question.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedQuestions.includes(question.id)}
                  onCheckedChange={() => handleToggleQuestion(question.id)}
                />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">{question.question}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{question.type}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <Badge variant="secondary">{question.points} pts</Badge>
                    {question.skill_tags?.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedQuestions.length > 0 && (
          <>
            <Separator />
            
            {/* Assessment Creation Form */}
            <div className="space-y-4">
              <h3 className="font-semibold">Create Assessment ({selectedQuestions.length} questions selected)</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Assessment Name</Label>
                  <Input
                    id="name"
                    value={assessmentName}
                    onChange={(e) => setAssessmentName(e.target.value)}
                    placeholder="e.g., Senior Frontend Developer Test"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Select value={purpose} onValueChange={(v: any) => setPurpose(v)}>
                    <SelectTrigger id="purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="screening">Screening</SelectItem>
                      <SelectItem value="skills">Skills</SelectItem>
                      <SelectItem value="culture">Culture</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                    min={10}
                    max={180}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passing">Passing Score (%)</Label>
                  <Input
                    id="passing"
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateAssessment}
                disabled={isCreating || !assessmentName}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
