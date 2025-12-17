import { Check } from "lucide-react";

export const WhoItsFor = () => {
  const audiences = [
    "Startups and growing companies",
    "Founders and hiring managers",
    "Recruiters who want consistency",
    "Teams tired of resume-driven decisions",
  ];

  return (
    <section className="px-4 py-20 md:py-28 bg-muted/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10">
          Built for teams that care how they hire
        </h2>
        
        <ul className="space-y-4 mb-10 inline-block text-left">
          {audiences.map((audience, index) => (
            <li key={index} className="flex items-center gap-3 text-lg text-foreground">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span>{audience}</span>
            </li>
          ))}
        </ul>
        
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          FuturHire is not designed for mass screening or automated shortlisting.
        </p>
      </div>
    </section>
  );
};
