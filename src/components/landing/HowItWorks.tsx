import { motion } from "framer-motion";
import { Check } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Define Role DNA",
    description: "Capture what success looks like beyond the job description.",
  },
  {
    number: "02",
    title: "Candidates do warm-ups",
    description: "Optional scenarios + voice practice to prepare without pressure.",
  },
  {
    number: "03",
    title: "Recruiters get Interview Kits",
    description: "Structured questions, rubrics, and Decision Room insights.",
  },
  {
    number: "04",
    title: "Hire with consistency",
    description: "Make decisions with explainability and audit trails.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="px-4 py-20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Four simple steps to structured hiring
          </p>
        </motion.div>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-start gap-6 p-6 rounded-xl bg-muted/30 border border-border/50"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                {step.number}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <div className="flex-shrink-0 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                <Check className="h-4 w-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
