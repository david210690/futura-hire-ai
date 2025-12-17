import { Shield, Check } from "lucide-react";

export const TrustFairnessSection = () => {
  const points = [
    "ND-safe language & rubrics",
    "No protected attribute inference",
    "Transparency banner: what signals were used / not used",
    "Candidates control visibility of practice reflections",
  ];

  return (
    <section className="px-4 py-20 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Trust, Fairness & Privacy
          </h2>
        </div>
        
        <ul className="space-y-4 mb-8">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-foreground text-lg">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
