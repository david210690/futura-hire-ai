export const PricingPhilosophy = () => {
  const points = [
    "Interviews are never billed",
    "Rejected candidates are never billed",
    "Candidates never pay",
    "Additional hires are billed only if hiring exceeds plan limits",
  ];

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Simple pricing, aligned with value
        </h2>
        
        <p className="text-lg text-muted-foreground mb-10">
          FuturHire is priced annually.
          <br />
          We count value only when hiring happens.
        </p>
        
        <ul className="space-y-3 mb-8 inline-block text-left">
          {points.map((point, index) => (
            <li key={index} className="text-foreground flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        
        <p className="text-sm text-muted-foreground">
          Most teams start with a short pilot before subscribing.
        </p>
      </div>
    </section>
  );
};