export const ProblemSection = () => {
  return (
    <section className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
          Most hiring tools measure activity.
          <br />
          <span className="text-muted-foreground">Hiring teams need clarity.</span>
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
          Traditional hiring tools charge for resumes, seats, and pipeline activity — even when hiring doesn't happen. Interviews become inconsistent, candidates feel judged, and decisions rely too much on gut feeling.
        </p>
        
        <p className="text-xl font-semibold text-foreground">
          FuturHire was built to fix the interview — not the pipeline.
        </p>
      </div>
    </section>
  );
};