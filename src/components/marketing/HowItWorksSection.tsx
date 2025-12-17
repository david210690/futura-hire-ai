export const HowItWorksSection = () => {
  const steps = [
    "Define the role and interview focus",
    "Run consistent interviews",
    "Invite candidates to prepare (optional)",
    "Discuss alignment calmly",
    "Mark a hire only when an offer is accepted",
  ];

  return (
    <section id="how-it-works" className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12 text-center">
          How hiring teams use FuturHire
        </h2>
        
        <div className="space-y-6 mb-10">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                {index + 1}
              </div>
              <p className="text-lg text-foreground pt-0.5">
                {step}
              </p>
            </div>
          ))}
        </div>
        
        <p className="text-center text-muted-foreground">
          That's it. No pipelines to manage. No noise to track.
        </p>
      </div>
    </section>
  );
};
