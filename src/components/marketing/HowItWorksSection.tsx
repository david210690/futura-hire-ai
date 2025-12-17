export const HowItWorksSection = () => {
  const steps = [
    {
      number: "1",
      title: "Define what success looks like",
      description: "Create Role DNA before interviews begin.",
    },
    {
      number: "2",
      title: "Interview with shared structure",
      description: "Every interviewer sees the same intent.",
    },
    {
      number: "3",
      title: "Candidates prepare with confidence",
      description: "Preparation tools are private and optional.",
    },
    {
      number: "4",
      title: "Decide deliberately",
      description: "Mark a hire only when an offer is accepted.",
    },
  ];

  return (
    <section className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
          A calm, human hiring flow
        </h2>
        
        <div className="space-y-8 mb-12">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                {step.number}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Highlight box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
          <p className="text-xl font-semibold text-foreground">
            No offer accepted = no hire counted.
          </p>
        </div>
      </div>
    </section>
  );
};
