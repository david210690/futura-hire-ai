import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Target, Users } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Role Designer",
    description: "Describe your problem, get a job role, JD, and interview kit instantly.",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: Target,
    title: "Predictive Hire Score",
    description: "Know who will thrive before you hire.",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: Users,
    title: "Culture DNA Mapping",
    description: "Build teams that truly align with your values.",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
];

export const WhyFuturaHire = () => {
  return (
    <section className="py-24 px-4 relative">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Why <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">FuturaHire</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The only hiring platform that combines ATS, AI assessments, and predictive intelligence
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              <Card className="h-full bg-card/50 backdrop-blur-xl border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-[var(--glow-blue)] group">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
