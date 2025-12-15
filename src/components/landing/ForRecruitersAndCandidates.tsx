import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, User, Check } from "lucide-react";

const recruiterFeatures = [
  "Interview Kits",
  "Decision Room",
  "Question Bank Admin",
  "Audit & explainability",
  "Hiring Plan Autopilot",
];

const candidateFeatures = [
  "Warm-up scenarios",
  "Voice practice (optional)",
  "Interview prep guidance",
  "Reflection notes (ND-safe)",
];

export const ForRecruitersAndCandidates = () => {
  return (
    <section className="px-4 py-20 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Both Sides
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Recruiters Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-full border-border/50 bg-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">For Recruiters</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {recruiterFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Candidates Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-full border-border/50 bg-card relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="text-xs">
                  Always Free
                </Badge>
              </div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/50 text-accent-foreground flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl">For Candidates</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {candidateFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-accent/30 text-accent-foreground flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-lg font-medium text-foreground"
        >
          Candidates never pay. Hiring teams sponsor the system.
        </motion.p>
      </div>
    </section>
  );
};
