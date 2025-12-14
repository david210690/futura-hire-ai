import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface Blueprint {
  employee_summary: {
    current_positioning: string;
    growth_potential: string;
  };
  role_1_blueprint: {
    role_title: string;
    readiness_score: number;
    readiness_label: string;
    bridge_skills: Array<{ skill: string; relevance: string }>;
    growth_focus_areas: Array<{
      area: string;
      objective: string;
      current_level: string;
      target_level: string;
      actions: Array<{ action: string; type: string; timeline: string }>;
      quick_win: boolean;
    }>;
    timeline_summary: string;
    encouragement: string;
  };
  role_2_blueprint?: {
    role_title: string;
    readiness_score: number;
    readiness_label: string;
    bridge_skills: Array<{ skill: string; relevance: string }>;
    growth_focus_areas: Array<{
      area: string;
      objective: string;
      current_level: string;
      target_level: string;
      actions: Array<{ action: string; type: string; timeline: string }>;
      quick_win: boolean;
    }>;
    timeline_summary: string;
    encouragement: string;
  };
  overall_guidance: {
    recommended_path: string;
    key_theme: string;
    closing_message: string;
  };
}

interface ExportBlueprintPDFProps {
  blueprint: Blueprint;
  userName?: string;
}

export function ExportBlueprintPDF({ blueprint, userName }: ExportBlueprintPDFProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      let y = 20;
      const lineHeight = 7;
      const margin = 20;
      const pageWidth = doc.internal.pageSize.width;
      const maxWidth = pageWidth - margin * 2;

      const addWrappedText = (text: string, x: number, startY: number, maxW: number, fontSize: number = 10) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxW);
        doc.text(lines, x, startY);
        return startY + lines.length * (fontSize * 0.4);
      };

      const checkPageBreak = (neededSpace: number) => {
        if (y + neededSpace > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
      };

      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text("Career Growth Blueprint", margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated for ${userName || "Employee"} on ${new Date().toLocaleDateString()}`, margin, y);
      y += 15;

      // Current Profile
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Your Current Profile", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      y = addWrappedText(blueprint.employee_summary.current_positioning, margin, y, maxWidth);
      y += 3;
      doc.setTextColor(59, 130, 246);
      y = addWrappedText(blueprint.employee_summary.growth_potential, margin, y, maxWidth);
      y += 10;

      // Role 1 Blueprint
      const renderRoleBlueprint = (role: Blueprint['role_1_blueprint'], title: string) => {
        checkPageBreak(60);
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`${title}: ${role.role_title}`, margin, y);
        y += 8;

        doc.setFontSize(12);
        doc.setTextColor(59, 130, 246);
        doc.text(`Readiness: ${role.readiness_score}/100 (${role.readiness_label})`, margin, y);
        y += 8;

        if (role.bridge_skills?.length > 0) {
          doc.setFontSize(11);
          doc.setTextColor(34, 139, 34);
          doc.text("Bridge Skills:", margin, y);
          y += 6;
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          role.bridge_skills.forEach(skill => {
            checkPageBreak(10);
            y = addWrappedText(`• ${skill.skill}: ${skill.relevance}`, margin + 5, y, maxWidth - 10, 9);
            y += 2;
          });
          y += 5;
        }

        if (role.growth_focus_areas?.length > 0) {
          checkPageBreak(20);
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text("Growth Focus Areas:", margin, y);
          y += 6;
          
          role.growth_focus_areas.forEach(area => {
            checkPageBreak(30);
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            doc.text(`${area.area}${area.quick_win ? " (Quick Win)" : ""}`, margin + 5, y);
            y += 5;
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            y = addWrappedText(area.objective, margin + 10, y, maxWidth - 15, 9);
            y += 3;
            doc.text(`Now: ${area.current_level} → Target: ${area.target_level}`, margin + 10, y);
            y += 8;
          });
        }

        if (role.timeline_summary) {
          checkPageBreak(15);
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`Timeline: ${role.timeline_summary}`, margin, y);
          y += 10;
        }
      };

      renderRoleBlueprint(blueprint.role_1_blueprint, "Target Role");

      if (blueprint.role_2_blueprint) {
        y += 10;
        renderRoleBlueprint(blueprint.role_2_blueprint, "Stretch Role");
      }

      // Overall Guidance
      checkPageBreak(40);
      y += 5;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Your Growth Path", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      if (blueprint.overall_guidance.recommended_path) {
        doc.setFontSize(10);
        doc.text("Recommended Path:", margin, y);
        y += 5;
        y = addWrappedText(blueprint.overall_guidance.recommended_path, margin + 5, y, maxWidth - 10, 9);
        y += 5;
      }

      if (blueprint.overall_guidance.closing_message) {
        checkPageBreak(20);
        doc.setFontSize(10);
        doc.setTextColor(59, 130, 246);
        y = addWrappedText(blueprint.overall_guidance.closing_message, margin, y, maxWidth, 10);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("This blueprint is confidential and for personal development purposes only.", margin, doc.internal.pageSize.height - 10);

      doc.save(`career-blueprint-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Blueprint exported",
        description: "Your career blueprint has been saved as PDF."
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={exportPDF} disabled={exporting}>
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export PDF
    </Button>
  );
}
