import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportAssessmentProps {
  onSuccess: () => void;
}

export const ImportAssessment = ({ onSuccess }: ImportAssessmentProps) => {
  const { currentOrg } = useCurrentOrg();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      
      return {
        type: obj.type || 'mcq',
        difficulty: obj.difficulty || 'medium',
        skill_tags: obj.skill_tags ? obj.skill_tags.split('|') : [],
        question: obj.question || '',
        options: obj.options ? obj.options.split('||') : null,
        answer_key: obj.answer_key ? { index: parseInt(obj.answer_key) } : null,
        rubric: obj.rubric_json ? JSON.parse(obj.rubric_json) : null,
        points: parseInt(obj.points) || 10,
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      
      try {
        let parsed: any[] = [];
        
        if (selectedFile.name.endsWith('.csv')) {
          parsed = parseCSV(text);
        } else if (selectedFile.name.endsWith('.json')) {
          const json = JSON.parse(text);
          parsed = Array.isArray(json) ? json : json.questions || [];
        }
        
        setPreview(parsed.slice(0, 5)); // Show first 5 questions
      } catch (error: any) {
        toast({
          title: "Parse error",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || !currentOrg?.id) return;

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        
        let questions: any[] = [];
        
        if (file.name.endsWith('.csv')) {
          questions = parseCSV(text);
        } else if (file.name.endsWith('.json')) {
          const json = JSON.parse(text);
          questions = Array.isArray(json) ? json : json.questions || [];
        }

        if (questions.length === 0) {
          throw new Error("No questions found in file");
        }

        // Insert questions into question_bank
        const questionInserts = questions.map(q => ({
          org_id: currentOrg.id,
          source: 'manual' as const,
          role_tag: 'imported',
          skill_tags: q.skill_tags || [],
          type: q.type as 'mcq' | 'free_text' | 'coding',
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          question: q.question,
          options: q.options ? JSON.stringify(q.options) : null,
          answer_key: q.answer_key ? JSON.stringify(q.answer_key) : null,
          rubric: q.rubric ? JSON.stringify(q.rubric) : null,
          points: q.points || 10,
        }));

        const { data: insertedQuestions, error: insertError } = await supabase
          .from('question_bank')
          .insert(questionInserts)
          .select();

        if (insertError) throw insertError;

        // Create assessment
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);
        
        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .insert({
            org_id: currentOrg.id,
            name: `Imported: ${file.name.replace(/\.[^/.]+$/, "")}`,
            purpose: 'skills',
            description: `Imported from ${file.name}`,
            duration_minutes: 60,
            total_points: totalPoints,
            passing_score: 70,
            shuffle: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (assessmentError) throw assessmentError;

        // Link questions to assessment
        const questionLinks = insertedQuestions!.map((q: any, index: number) => ({
          assessment_id: assessment.id,
          question_id: q.id,
          order_index: index,
        }));

        const { error: linkError } = await supabase
          .from('assessment_questions')
          .insert(questionLinks);

        if (linkError) throw linkError;

        // Record import
        await supabase.from('imports').insert({
          org_id: currentOrg.id,
          file_url: file.name,
          format: file.name.endsWith('.csv') ? 'csv' : 'json',
          parsed: { count: questions.length },
        });

        toast({
          title: "Import successful",
          description: `Imported ${questions.length} questions`,
        });

        setFile(null);
        setPreview([]);
        onSuccess();
      };

      reader.readAsText(file);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Import Assessment
        </CardTitle>
        <CardDescription>
          Upload existing assessments from CSV or JSON files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>CSV Format:</strong> type, difficulty, skill_tags (pipe-separated), question, 
            options (||-separated), answer_key (index), rubric_json, points
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Choose File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Preview (first 5 questions):</h4>
              {preview.map((q, i) => (
                <div key={i} className="border rounded p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">{q.question}</span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{q.type}</span>
                    <span>•</span>
                    <span>{q.difficulty}</span>
                    <span>•</span>
                    <span>{q.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {file && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? "Importing..." : `Import ${file.name}`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
