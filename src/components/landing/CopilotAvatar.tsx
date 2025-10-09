import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CopilotAvatar = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="fixed bottom-8 right-8 z-50"
    >
      <Button
        size="lg"
        className="rounded-full w-16 h-16 shadow-2xl bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 animate-pulse"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    </motion.div>
  );
};
