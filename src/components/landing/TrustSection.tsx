import { motion } from "framer-motion";
import { Shield, Eye, Lock, Heart } from "lucide-react";

const trustPoints = [
  {
    icon: Heart,
    title: "ND-safe language & rubrics",
    description: "Questions and evaluations designed for neurodivergent-friendly experiences.",
  },
  {
    icon: Shield,
    title: "No protected attribute inference",
    description: "We never infer age, gender, ethnicity, or other protected characteristics.",
  },
  {
    icon: Eye,
    title: "Transparency banners",
    description: "Clear visibility into what signals were used — and what was not.",
  },
  {
    icon: Lock,
    title: "Candidate-controlled visibility",
    description: "Candidates decide what practice reflections recruiters can see.",
  },
];

export const TrustSection = () => {
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
            Trust, Fairness & Privacy
          </h2>
          <p className="text-muted-foreground text-lg">
            Built with explainability and safety at the core
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {trustPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border/50"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <point.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {point.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
