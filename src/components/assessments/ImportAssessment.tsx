import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface ImportAssessmentProps {
  onSuccess: () => void;
}

export const ImportAssessment = ({ onSuccess }: ImportAssessmentProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Import Assessment
        </CardTitle>
        <CardDescription>
          Upload existing assessments from CSV, JSON, or PDF files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Import functionality coming soon
        </div>
      </CardContent>
    </Card>
  );
};
