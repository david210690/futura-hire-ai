import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportTrajectoryPDFProps {
  snapshot: any;
  candidateName?: string;
}

export function ExportTrajectoryPDF({ snapshot, candidateName = "Candidate" }: ExportTrajectoryPDFProps) {
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'INR') {
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
      return `₹${amount.toLocaleString()}`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229);
      doc.text("Career Trajectory Report", 14, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated for ${candidateName}`, 14, yPos);
      yPos += 5;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);
      yPos += 15;

      // Disclaimer
      doc.setFontSize(9);
      doc.setTextColor(150, 100, 50);
      doc.text("Note: All projections are approximate guidance. Salary ranges and timelines are estimates, not guarantees.", 14, yPos);
      yPos += 15;

      // Current Position
      if (snapshot.current_position) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Current Position", 14, yPos);
        yPos += 8;

        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(`Level: ${snapshot.current_position.level_label}`, 14, yPos);
        yPos += 6;
        doc.text(`Confidence: ${snapshot.current_position.confidence}%`, 14, yPos);
        yPos += 6;

        const summaryLines = doc.splitTextToSize(snapshot.current_position.one_line_summary || '', 180);
        doc.text(summaryLines, 14, yPos);
        yPos += summaryLines.length * 5 + 10;
      }

      // Next Roles Table
      if (snapshot.next_roles && snapshot.next_roles.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Next Achievable Roles", 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Role', 'Readiness', 'Timeline', 'Key Gaps']],
          body: snapshot.next_roles.map((role: any) => [
            role.title,
            `${role.readiness_score}%`,
            `${role.time_estimate_months} months`,
            (role.key_gaps_to_fill || []).slice(0, 2).join('; ')
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [79, 70, 229] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Trajectories
      if (snapshot.trajectories && snapshot.trajectories.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Career Trajectories", 14, yPos);
        yPos += 8;

        snapshot.trajectories.forEach((trajectory: any) => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFontSize(11);
          doc.setTextColor(79, 70, 229);
          doc.text(trajectory.label, 14, yPos);
          yPos += 6;

          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          const descLines = doc.splitTextToSize(trajectory.description || '', 180);
          doc.text(descLines, 14, yPos);
          yPos += descLines.length * 4 + 8;
        });
      }

      // Breakthrough Skills
      if (snapshot.breakthrough_skills && snapshot.breakthrough_skills.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Breakthrough Skills", 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Skill', 'Impact']],
          body: snapshot.breakthrough_skills.map((skill: any) => [
            skill.skill_name,
            skill.impact
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [245, 158, 11] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // 6-Month Plan
      if (snapshot.six_month_plan && snapshot.six_month_plan.months) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("6-Month Action Plan", 14, yPos);
        yPos += 5;

        autoTable(doc, {
          startY: yPos,
          head: [['Month', 'Theme', 'Focus Items']],
          body: snapshot.six_month_plan.months.map((month: any) => [
            `Month ${month.month_index}`,
            month.theme,
            (month.focus_items || []).slice(0, 2).join('; ')
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Salary Projections
      if (snapshot.salary_projection) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Salary Projections (Approximate)", 14, yPos);
        yPos += 8;

        if (snapshot.salary_projection.current_band) {
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          const cb = snapshot.salary_projection.current_band;
          doc.text(`Current: ${formatCurrency(cb.annual_min)} - ${formatCurrency(cb.annual_max)}`, 14, yPos);
          yPos += 6;
        }

        if (snapshot.salary_projection.trajectory_bands) {
          snapshot.salary_projection.trajectory_bands.forEach((band: any) => {
            doc.text(`${band.level_label}: ${formatCurrency(band.annual_min)} - ${formatCurrency(band.annual_max)}`, 14, yPos);
            yPos += 6;
          });
        }
      }

      // Save
      doc.save(`career-trajectory-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={exportToPDF} disabled={exporting} className="gap-2">
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export PDF
    </Button>
  );
}
