import { Card, CardContent } from "@/components/ui/card";

export const DifferentiatorSection = () => {
  const differentiators = [
    {
      title: "Preparation, not evaluation",
      text: "Candidates use FuturHire to prepare and reflect. No scores. No rankings. No hidden judgments.",
    },
    {
      title: "Structure without rigidity",
      text: "Interview kits, role DNA, and decision rooms bring consistency — without forcing templates.",
    },
    {
      title: "Outcome-based pricing",
      text: "No offer accepted? No hire counted. Interview freely without worrying about usage.",
    },
  ];

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
          FuturHire is interview intelligence — not an ATS
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          We help you hire better, not just faster.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6">
          {differentiators.map((item, index) => (
            <Card key={index} className="border-border/50 bg-card/50">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
