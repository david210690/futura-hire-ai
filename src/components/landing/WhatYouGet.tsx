import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Dna, FileQuestion, Users } from "lucide-react";

const pillars = [
  {
    icon: Dna,
    title: "Role DNA",
    description: "Define what success looks like for a role — beyond resumes.",
  },
  {
    icon: FileQuestion,
    title: "Interview Kits",
    description: "Auto-curated 8–12 questions with rubrics, probes, and bias traps.",
  },
  {
    icon: Users,
    title: "Decision Room",
    description: "All signals in one place with transparency on what influenced the kit.",
  },
];

export const WhatYouGet = () => {
  return (
    <section className="px-4 py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What You Get
          </h2>
          <p className="text-muted-foreground text-lg">
            Three pillars for structured, fair hiring
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
                <CardContent className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-6">
                    <pillar.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {pillar.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-muted-foreground text-sm"
        >
          No scoring. No pass/fail automation. Just structured clarity.
        </motion.p>
      </div>
    </section>
  );
};
