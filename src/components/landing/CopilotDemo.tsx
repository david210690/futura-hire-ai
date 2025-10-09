import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowRight, Sparkles } from "lucide-react";

export const CopilotDemo = () => {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
            <Sparkles className="w-3 h-3 mr-1" />
            Intelligent Assistant
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Copilot & Predictive <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Intelligence</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI hiring assistant that understands context and delivers instant insights
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-card/50 backdrop-blur-xl border-primary/20 shadow-2xl overflow-hidden">
              <CardContent className="p-0">
                {/* Chat Interface */}
                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-6 space-y-4">
                  {/* User Message */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="flex justify-end"
                  >
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-6 py-3 max-w-md">
                      <p className="text-sm font-medium">Show top React devs &gt; 85 fit score</p>
                    </div>
                  </motion.div>

                  {/* AI Response */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="flex justify-start"
                  >
                    <div className="bg-card border border-primary/20 rounded-2xl rounded-tl-sm px-6 py-4 max-w-md">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">FuturaHire Copilot</span>
                      </div>
                      <p className="text-sm mb-3">Found 12 React developers with fit score &gt; 85:</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-success/10 rounded-lg">
                          <span className="text-xs font-medium">Sarah Chen</span>
                          <Badge variant="outline" className="text-xs border-success text-success">Score: 94</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-success/10 rounded-lg">
                          <span className="text-xs font-medium">Alex Kumar</span>
                          <Badge variant="outline" className="text-xs border-success text-success">Score: 91</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-success/10 rounded-lg">
                          <span className="text-xs font-medium">Jordan Lee</span>
                          <Badge variant="outline" className="text-xs border-success text-success">Score: 88</Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* CTA */}
                <div className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-t border-primary/20">
                  <Button className="w-full bg-primary hover:bg-primary/90 shadow-[var(--glow-blue)]" size="lg">
                    Meet Your Hiring Copilot
                    <ArrowRight className="ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
