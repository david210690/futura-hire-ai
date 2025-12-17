export const HowItWorksLanding = () => {
  const steps = [
    {
      number: "1",
      title: "Define Role DNA",
      description: "Clarify what success looks like before interviews begin.",
    },
    {
      number: "2",
      title: "Candidates do warm-ups",
      description: "Optional voice practice and reflection exercises.",
    },
    {
      number: "3",
      title: "Recruiters get Interview Kits",
      description: "Structured questions with rubrics and Decision Room access.",
    },
    {
      number: "4",
      title: "Hire with consistency",
      description: "Make decisions with explainability and confidence.",
    },
  ];

  return (
    <section className="px-4 py-20 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
          How It Works
        </h2>
        
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center">
                {step.number}
              </div>
              <div className="pt-2">
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
