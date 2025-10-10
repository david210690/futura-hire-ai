import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const FinalCTA = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(0,0,0,0))]" />

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-4xl lg:text-6xl font-bold mb-6">
            Your Next Great Hire Deserves{" "}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Future-Grade Intelligence
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of companies using AI-powered hiring to build exceptional teams
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/pricing">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 shadow-[var(--glow-blue)]">
                Request Live Demo
                <ArrowRight className="ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" className="bg-card border-2 border-primary text-foreground hover:bg-primary hover:text-primary-foreground text-lg px-8 py-6 transition-all">
                Try FuturaHire Free
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <footer className="mt-24 pt-12 border-t border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <div>© 2025 FuturaHire. All rights reserved.</div>
              <div>Built by ShipMyMVP Studio</div>
              <div>hello@futurahire.app</div>
            </div>
          </footer>
        </motion.div>
      </div>
    </section>
  );
};
