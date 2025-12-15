import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is this an ATS?",
    answer: "No. FuturHire is interview intelligence and preparation — not applicant tracking. We help you run structured interviews, not manage resumes.",
  },
  {
    question: "Do candidates pay?",
    answer: "Never. Candidates always access FuturaHire for free. Hiring teams sponsor the system.",
  },
  {
    question: "Is the voice practice mandatory?",
    answer: "No. Voice practice is completely optional and supportive. Candidates can skip it entirely.",
  },
  {
    question: "Does FuturaHire auto-reject candidates?",
    answer: "Never. FuturaHire provides structured signals and decision support — all hiring decisions are made by humans.",
  },
  {
    question: "When will payments be live?",
    answer: "Razorpay checkout is coming soon. For now, pilot companies are onboarded via manual invoice.",
  },
];

export const LandingFAQ = () => {
  return (
    <section className="px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-border/50 rounded-lg px-6 bg-card"
              >
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
