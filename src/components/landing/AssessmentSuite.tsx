import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, Video, Shield, ArrowRight } from "lucide-react";

const features = [
  {
    icon: FileText,
    text: "Auto-generate skill tests from any JD or upload your own",
  },
  {
    icon: Brain,
    text: "AI grades answers objectively with instant feedback",
  },
  {
    icon: Video,
    text: "Integrated Proctoring + Rules: HD Webcam ≥ 720px and Professional Attire Required",
  },
  {
    icon: Shield,
    text: "Real-time plagiarism check and behavioral flags",
  },
];

export const AssessmentSuite = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-secondary/20 text-secondary border-secondary/30">
            AI-Powered Testing
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            AI Assessment <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Suite</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Evaluate candidates with precision using AI-generated tests and real-time proctoring
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-muted-foreground pt-2">{feature.text}</p>
                    </motion.div>
                  ))}
                </div>

                <Button className="w-full mt-8 bg-secondary hover:bg-secondary/90 shadow-[var(--glow-purple)]" size="lg">
                  Create Your First AI Assessment
                  <ArrowRight className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-square bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl border border-purple-500/20 p-8 backdrop-blur-sm">
              <div className="h-full flex flex-col justify-center space-y-4">
                <div className="h-4 bg-primary/20 rounded w-3/4" />
                <div className="h-4 bg-primary/20 rounded w-full" />
                <div className="h-4 bg-primary/20 rounded w-5/6" />
                <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl mt-4" />
                <div className="flex gap-2 mt-4">
                  <div className="h-10 bg-success/20 rounded flex-1 flex items-center justify-center text-success text-sm font-medium">
                    ✓ Correct
                  </div>
                  <div className="h-10 bg-primary/20 rounded flex-1 flex items-center justify-center text-primary text-sm font-medium">
                    Score: 95
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
