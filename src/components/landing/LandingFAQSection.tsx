import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const LandingFAQSection = () => {
  const faqs = [
    {
      question: "Is this an ATS?",
      answer: "No. FuturHire is interview intelligence and preparation. We focus on helping teams run better interviews — not managing pipelines or applicant tracking.",
    },
    {
      question: "Do candidates pay?",
      answer: "Never. Candidates always use FuturHire for free. Hiring teams sponsor the system.",
    },
    {
      question: "Is the voice practice mandatory?",
      answer: "No. Voice practice is optional and supportive. Candidates can choose to prepare in whatever way feels comfortable to them.",
    },
    {
      question: "Does FuturHire auto-reject candidates?",
      answer: "Never. FuturHire does not automatically reject candidates. All hiring decisions are made by humans with structured support.",
    },
    {
      question: "When will payments be live?",
      answer: "Razorpay checkout is coming soon. Pilots are currently onboarded via invoice.",
    },
  ];

  return (
    <section className="px-4 py-20 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
          Frequently Asked Questions
        </h2>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-lg font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
