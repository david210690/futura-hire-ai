import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Check } from "lucide-react";

const requirements = [
  "HD Webcam (720p minimum)",
  "Professional Attire and Neutral Background",
  "Good Lighting & Eye Contact",
];

export const VideoStandards = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
              <Video className="w-3 h-3 mr-1" />
              Professional Standards
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Smart Interview <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Experience</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              HD Video, Authentic Presentation
            </p>
          </div>

          <Card className="bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Interview Requirements Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requirements.map((requirement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-lg bg-success/5 border border-success/20"
                >
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-lg">{requirement}</span>
                </motion.div>
              ))}

              <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">AI Real-Time Assessment</h4>
                    <p className="text-sm text-muted-foreground">
                      Our AI assesses communication, confidence, and composure in real time, providing instant feedback and scoring.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};
