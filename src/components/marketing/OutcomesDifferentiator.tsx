export const OutcomesDifferentiator = () => {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10">
          Pay for outcomes, not pipeline noise.
        </h2>
        
        <div className="bg-card border border-border rounded-xl p-8 md:p-12 mb-6">
          <p className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            No offer accepted = no hire counted.
          </p>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            Interview freely. Prepare candidates. Decide calmly.
            <br />
            Value is counted only when an offer is accepted.
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Candidates are always free.
        </p>
      </div>
    </section>
  );
};
