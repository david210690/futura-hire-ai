export const KeyFeatures = () => {
  const features = [
    {
      title: "Role DNA before interviews begin",
      description: "Define what success looks like for a role before anyone asks questions. Align interviewers early and reduce subjective drift.",
    },
    {
      title: "Structured interview kits, not scripted calls",
      description: "Consistent questions and probing guidance for every interviewer — without scoring or automation.",
    },
    {
      title: "A calm preparation space for candidates",
      description: "Candidates prepare through reflection and optional voice practice. No scoring. No pass/fail. No hidden evaluation.",
    },
    {
      title: "Clear decisions without pressure",
      description: "Summarized signals help teams discuss alignment clearly. Hiring remains a human decision.",
    },
  ];

  return (
    <section className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-16 text-center">
          What FuturHire actually does
        </h2>
        
        <div className="space-y-12">
          {features.map((feature, index) => (
            <div key={index} className="border-l-2 border-primary/30 pl-6 md:pl-8">
              <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
