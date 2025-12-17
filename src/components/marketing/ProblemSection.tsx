export const ProblemSection = () => {
  const problems = [
    "You pay for candidates, not outcomes",
    "Interview quality depends on who shows up",
    "Decisions rely on gut feeling, not structure",
    "Candidates walk in unprepared and anxious",
  ];

  return (
    <section className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">
          Why hiring tools feel expensive — even when they fail
        </h2>
        
        <ul className="space-y-4 mb-10">
          {problems.map((problem, index) => (
            <li 
              key={index}
              className="flex items-start gap-3 text-lg text-muted-foreground"
            >
              <span className="text-destructive mt-1">•</span>
              <span>{problem}</span>
            </li>
          ))}
        </ul>
        
        <p className="text-xl text-foreground font-medium text-center">
          Hiring is noisy. But payment shouldn't be.
        </p>
      </div>
    </section>
  );
};
