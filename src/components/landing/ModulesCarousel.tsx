import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Target, Users, TrendingUp, Trophy, Video, CreditCard, Puzzle } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const modules = [
  {
    icon: Puzzle,
    title: "Role Designer",
    description: "AI-powered job role creation with instant JD generation",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: Brain,
    title: "Predictive Hire Score",
    description: "Know candidate success probability before hiring",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: Users,
    title: "Culture DNA",
    description: "Deep organizational culture mapping and matching",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    icon: Target,
    title: "Team Optimizer",
    description: "Build balanced teams with complementary skills",
    color: "from-orange-500/20 to-red-500/20",
  },
  {
    icon: TrendingUp,
    title: "Retention Predictor",
    description: "Identify flight risks and retention opportunities",
    color: "from-yellow-500/20 to-orange-500/20",
  },
  {
    icon: Trophy,
    title: "Gamification Dashboard",
    description: "Engage recruiters with achievements and leaderboards",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    icon: Video,
    title: "AI Assessments & Video Tests",
    description: "Comprehensive candidate evaluation suite",
    color: "from-indigo-500/20 to-purple-500/20",
  },
  {
    icon: CreditCard,
    title: "Razorpay Billing",
    description: "Seamless payment processing and subscription management",
    color: "from-teal-500/20 to-cyan-500/20",
  },
];

export const ModulesCarousel = () => {
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
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Advanced <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Modules</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to transform your hiring process
          </p>
        </motion.div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-6xl mx-auto"
        >
          <CarouselContent>
            {modules.map((module, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-1"
                >
                  <Card className="h-full bg-card/50 backdrop-blur-xl border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-[var(--glow-blue)] group">
                    <CardHeader>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <module.icon className="w-7 h-7 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{module.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm mb-4">
                        {module.description}
                      </CardDescription>
                      <Button variant="ghost" size="sm" className="w-full">
                        Learn More
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};
