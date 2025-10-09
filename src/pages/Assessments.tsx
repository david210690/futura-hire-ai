import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Upload, Database } from "lucide-react";
import { CreateAssessmentFromAI } from "@/components/assessments/CreateAssessmentFromAI";
import { CreateAssessmentFromBank } from "@/components/assessments/CreateAssessmentFromBank";
import { ImportAssessment } from "@/components/assessments/ImportAssessment";
import { AssessmentsList } from "@/components/assessments/AssessmentsList";

const Assessments = () => {
  const [activeTab, setActiveTab] = useState("list");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Assessments</h1>
          <p className="text-muted-foreground">
            Create, manage, and analyze candidate assessments with AI-powered grading
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="list">
              <FileText className="w-4 h-4 mr-2" />
              My Assessments
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Plus className="w-4 h-4 mr-2" />
              Generate with AI
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Database className="w-4 h-4 mr-2" />
              Question Bank
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            <AssessmentsList />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <CreateAssessmentFromAI onSuccess={() => setActiveTab("list")} />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <ImportAssessment onSuccess={() => setActiveTab("list")} />
          </TabsContent>

          <TabsContent value="bank" className="space-y-6">
            <CreateAssessmentFromBank onSuccess={() => setActiveTab("list")} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Assessments;
