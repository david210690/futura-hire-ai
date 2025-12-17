import { Check } from "lucide-react";

export const CandidateTrust = () => {
  const points = [
    "No automated scoring or ranking",
    "No resume filtering",
    "No auto-rejection",
    "Candidates control what they share",
  ];

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10">
          Built for candidate trust
        </h2>
        
        <ul className="space-y-4 mb-10 inline-block text-left">
          {points.map((point, index) => (
            <li key={index} className="flex items-center gap-3 text-lg text-foreground">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        
        <p className="text-xl font-semibold text-foreground">
          FuturHire supports preparation — not judgment.
        </p>
      </div>
    </section>
  );
};
