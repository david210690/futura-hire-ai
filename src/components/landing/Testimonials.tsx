import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const testimonials = [
  {
    quote: "Reduced time-to-hire by 62%. FuturaHire's AI assessment suite is a game-changer.",
    author: "Sarah Johnson",
    role: "VP of HR, TechCorp",
    rating: 5,
    initials: "SJ",
  },
  {
    quote: "95% recruiter satisfaction. The predictive hire score has dramatically improved our quality of hire.",
    author: "Michael Chen",
    role: "Talent Director, InnovateLabs",
    rating: 5,
    initials: "MC",
  },
  {
    quote: "Used by HR teams in 7 countries. The culture DNA mapping helps us build truly cohesive teams.",
    author: "Priya Sharma",
    role: "CHRO, GlobalTech Solutions",
    rating: 5,
    initials: "PS",
  },
];

const stats = [
  { value: "62%", label: "Faster Hiring" },
  { value: "95%", label: "Satisfaction Rate" },
  { value: "7+", label: "Countries" },
  { value: "10k+", label: "Assessments" },
];

export const Testimonials = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Trusted by <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Industry Leaders</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See what HR professionals are saying about FuturaHire
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="bg-card/50 backdrop-blur-xl border-primary/20 text-center p-6">
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Testimonials Carousel */}
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="p-1"
                >
                  <Card className="h-full bg-card/50 backdrop-blur-xl border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-lg mb-6 leading-relaxed">{testimonial.quote}</p>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {testimonial.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{testimonial.author}</div>
                          <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        </div>
                      </div>
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
