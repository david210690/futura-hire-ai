import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface DimensionScores {
  skills_match: number;
  experience_relevance: number;
  growth_potential: number;
  communication_quality: number;
  role_alignment: number;
}

interface CandidateEvaluation {
  candidate_id: string;
  overall_fit_score: number;
  dimension_scores?: DimensionScores;
  summary: string;
  strengths?: string[];
  risks: string[];
  interview_probes?: string[];
  recommended_next_action: string;
  fairness_note?: string;
}

interface Cluster {
  name: string;
  description: string;
  candidate_ids: string[];
}

interface GlobalSummary {
  market_insight: string;
  hiring_recommendation: string;
  fairness_advisory?: string;
}

interface SnapshotData {
  clusters: Cluster[];
  candidates: CandidateEvaluation[];
  global_summary: GlobalSummary;
}

interface CandidateDetails {
  id: string;
  full_name: string;
  headline: string | null;
  skills: string | null;
  years_experience: number | null;
}

interface ExportDecisionPDFProps {
  jobTitle: string;
  companyName: string;
  snapshotDate: string;
  snapshotData: SnapshotData;
  candidatesMap: Map<string, CandidateDetails>;
}

const dimensionLabels: Record<string, string> = {
  skills_match: "Skills Match",
  experience_relevance: "Experience",
  growth_potential: "Growth Potential",
  communication_quality: "Communication",
  role_alignment: "Role Alignment",
};

export function exportDecisionPDF({
  jobTitle,
  companyName,
  snapshotDate,
  snapshotData,
  candidatesMap,
}: ExportDecisionPDFProps) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  const getCandidateName = (id: string) => candidatesMap.get(id)?.full_name || "Unknown";

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("AI Decision Room Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`${jobTitle} at ${companyName}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(snapshotDate), "PPp")}`, pageWidth / 2, yPos, { align: "center" });
  doc.setTextColor(0);
  yPos += 15;

  // Strategic Overview
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Strategic Overview", 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Market Insight:", 14, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  const marketLines = doc.splitTextToSize(snapshotData.global_summary.market_insight, pageWidth - 28);
  doc.text(marketLines, 14, yPos);
  yPos += marketLines.length * 5 + 5;

  doc.setFont("helvetica", "bold");
  doc.text("Hiring Recommendation:", 14, yPos);
  yPos += 5;
  doc.setFont("helvetica", "normal");
  const recLines = doc.splitTextToSize(snapshotData.global_summary.hiring_recommendation, pageWidth - 28);
  doc.text(recLines, 14, yPos);
  yPos += recLines.length * 5 + 5;

  if (snapshotData.global_summary.fairness_advisory) {
    doc.setFont("helvetica", "bold");
    doc.text("Fairness Advisory:", 14, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    const fairLines = doc.splitTextToSize(snapshotData.global_summary.fairness_advisory, pageWidth - 28);
    doc.text(fairLines, 14, yPos);
    yPos += fairLines.length * 5 + 5;
  }

  yPos += 10;

  // Candidate Clusters
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Candidate Clusters", 14, yPos);
  yPos += 10;

  snapshotData.clusters.forEach((cluster) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(cluster.name, 14, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const descLines = doc.splitTextToSize(cluster.description, pageWidth - 28);
    doc.text(descLines, 14, yPos);
    yPos += descLines.length * 4 + 3;

    doc.setFont("helvetica", "normal");
    cluster.candidate_ids.forEach((id) => {
      const candidate = snapshotData.candidates.find((c) => c.candidate_id === id);
      if (candidate) {
        doc.text(`• ${getCandidateName(id)} (Score: ${candidate.overall_fit_score})`, 18, yPos);
        yPos += 5;
      }
    });
    yPos += 5;
  });

  // All Candidates Table
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("All Candidates Summary", 14, yPos);
  yPos += 10;

  const tableData = snapshotData.candidates
    .sort((a, b) => b.overall_fit_score - a.overall_fit_score)
    .map((c) => [
      getCandidateName(c.candidate_id),
      c.overall_fit_score.toString(),
      c.recommended_next_action,
      c.summary.substring(0, 80) + (c.summary.length > 80 ? "..." : ""),
    ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Candidate", "Score", "Recommended Action", "Summary"]],
    body: tableData,
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 35 },
      3: { cellWidth: "auto" },
    },
  });

  // Detailed Candidate Profiles
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Candidate Profiles", 14, yPos);
  yPos += 15;

  snapshotData.candidates
    .sort((a, b) => b.overall_fit_score - a.overall_fit_score)
    .forEach((candidate, idx) => {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      // Candidate header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${getCandidateName(candidate.candidate_id)}`, 14, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`Score: ${candidate.overall_fit_score}/100`, pageWidth - 40, yPos);
      yPos += 8;

      // Summary
      doc.setFontSize(9);
      const summaryLines = doc.splitTextToSize(candidate.summary, pageWidth - 28);
      doc.text(summaryLines, 14, yPos);
      yPos += summaryLines.length * 4 + 3;

      // Dimension scores
      if (candidate.dimension_scores) {
        doc.setFont("helvetica", "bold");
        doc.text("Dimension Scores:", 14, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        Object.entries(candidate.dimension_scores).forEach(([key, value]) => {
          doc.text(`  ${dimensionLabels[key] || key}: ${value}/10`, 14, yPos);
          yPos += 4;
        });
        yPos += 2;
      }

      // Strengths
      if (candidate.strengths && candidate.strengths.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Strengths:", 14, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        candidate.strengths.slice(0, 3).forEach((s) => {
          const sLines = doc.splitTextToSize(`✓ ${s}`, pageWidth - 32);
          doc.text(sLines, 18, yPos);
          yPos += sLines.length * 4;
        });
        yPos += 2;
      }

      // Risks
      if (candidate.risks.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Risks:", 14, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        candidate.risks.slice(0, 3).forEach((r) => {
          const rLines = doc.splitTextToSize(`• ${r}`, pageWidth - 32);
          doc.text(rLines, 18, yPos);
          yPos += rLines.length * 4;
        });
        yPos += 2;
      }

      // Interview Probes
      if (candidate.interview_probes && candidate.interview_probes.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Interview Questions:", 14, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        candidate.interview_probes.slice(0, 2).forEach((p) => {
          const pLines = doc.splitTextToSize(`"${p}"`, pageWidth - 32);
          doc.text(pLines, 18, yPos);
          yPos += pLines.length * 4;
        });
      }

      // Recommended action
      doc.setFont("helvetica", "bold");
      doc.text(`Recommended: ${candidate.recommended_next_action}`, 14, yPos);
      yPos += 10;

      // Separator
      doc.setDrawColor(200);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 8;
    });

  // Footer on all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `FuturHire AI Decision Room - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const fileName = `decision-room-${jobTitle.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
