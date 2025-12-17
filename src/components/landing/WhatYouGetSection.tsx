import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dna, FileText, Users } from "lucide-react";

export const WhatYouGetSection = () => {
  const pillars = [
    {
      icon: Dna,
      title: "Role DNA",
      description: "Define what success looks like for a role — beyond resumes.",
    },
    {
      icon: FileText,
      title: "Interview Kits",
      description: "Auto-curated 8–12 questions with rubrics, probes, and bias traps.",
    },
    {
      icon: Users,
      title: "Decision Room",
      description: "All signals in one place with transparency on what influenced the kit.",
    },
  ];

  return (
    <section className="px-4 py-20 bg-background">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
          What You Get
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="border-border/50">
              <CardHeader>
                <pillar.icon className="w-10 h-10 text-primary mb-2" />
                <CardTitle className="text-xl">{pillar.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{pillar.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <p className="text-center text-muted-foreground">
          No scoring. No pass/fail automation. Just structured clarity.
        </p>
      </div>
    </section>
  );
};
