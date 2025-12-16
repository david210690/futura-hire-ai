import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { SEOHead } from "@/components/shared/SEOHead";
import { CheckCircle, XCircle, AlertTriangle, Zap, Users, Shield, DollarSign } from "lucide-react";

const SalesPitch = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Sales Pitch Guide | FuturaHire"
        description="The complete FuturaHire sales pitch guide for teams."
      />
      <LandingNav />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-2">FUTURAHIRE — THE PROPER SALES PITCH</h1>
        <p className="text-muted-foreground text-center mb-12">Internal guide for sales conversations</p>

        {/* Section 1: Opening */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
            Opening (15 seconds)
          </h2>
          <blockquote className="border-l-4 border-primary pl-4 italic text-lg mb-4">
            "FuturHire helps companies make better hiring decisions by fixing the interview — not by adding another ATS."
          </blockquote>
          <p className="text-muted-foreground">
            We bring structure, fairness, and clarity to interviews so teams stop guessing and start hiring with confidence.
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">(Stop. Let them acknowledge.)</p>
        </section>

        {/* Section 2: The Problem */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
            The Problem (Why FuturHire Exists)
          </h2>
          <p className="font-medium mb-3">Hiring today is broken at the interview stage.</p>
          <ul className="space-y-2 text-muted-foreground mb-4">
            <li>• Resumes don't predict performance.</li>
            <li>• Interviews change with every interviewer.</li>
            <li>• And most tools charge you even when hiring doesn't happen.</li>
          </ul>
          <p className="text-muted-foreground">
            ATS systems track candidates.<br />
            <strong>They don't improve decisions.</strong>
          </p>
        </section>

        {/* Section 3: What FuturHire Actually Is */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
            What FuturHire Actually Is
          </h2>
          <p className="text-lg font-semibold mb-2">FuturHire is interview intelligence.</p>
          <p className="text-muted-foreground mb-4">We sit around the interview, not just before or after it.</p>
          <p className="mb-2">We help teams:</p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-primary mt-0.5" />
              <span>Define what success looks like for a role <strong>(Role DNA)</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-primary mt-0.5" />
              <span>Run consistent, structured interviews <strong>(Interview Kits)</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-primary mt-0.5" />
              <span>Prepare candidates without pressure or bias <strong>(always free)</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-primary mt-0.5" />
              <span>Make decisions with transparency <strong>(Decision Room)</strong></span>
            </li>
          </ul>
          <p className="text-muted-foreground">
            No black-box scoring.<br />
            No auto-rejections.<br />
            <strong>Humans stay in control.</strong>
          </p>
        </section>

        {/* Section 4: Candidates Are Always Free */}
        <section className="mb-10 bg-accent/30 p-6 rounded-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
            Candidates Are Always Free
            <span className="text-sm font-normal text-muted-foreground">(Say This Clearly)</span>
          </h2>
          <p className="font-semibold text-lg mb-2">Candidates never pay.</p>
          <p className="text-muted-foreground mb-4">
            Practice, preparation, and optional voice practice are always free.
          </p>
          <p className="text-muted-foreground">
            This is intentional — charging candidates creates bias and breaks trust.<br />
            <strong>Hiring teams sponsor the system.</strong>
          </p>
        </section>

        {/* Section 5: The Differentiator */}
        <section className="mb-10 border-2 border-primary p-6 rounded-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
            The Differentiator
            <span className="text-sm font-normal text-destructive">(THIS IS THE CORE)</span>
          </h2>
          <p className="text-xl font-bold">
            We don't charge you for interviews, resumes, or pipeline activity.<br />
            We charge only when hiring actually happens.
          </p>
          <p className="text-sm text-muted-foreground mt-4 font-medium italic">Pause. Let this sink in.</p>
        </section>

        {/* Section 6: Define "Hiring" */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
            Define "Hiring"
            <span className="text-sm font-normal text-destructive">(NO AMBIGUITY)</span>
          </h2>
          <p className="text-lg font-bold mb-4">In FuturHire, a hire means an offer accepted.</p>
          <p className="mb-2">That's it.</p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium mb-2">Not counted:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Interviews</li>
              <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Rejections</li>
              <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Withdrawn offers</li>
              <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Practice sessions</li>
            </ul>
          </div>
          <p className="mt-4 font-medium">Only when an offer is accepted and your team confirms it.</p>
        </section>

        {/* Section 7: How Billing Works */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
            How Billing Works
            <span className="text-sm font-normal text-muted-foreground">(Very Simple)</span>
          </h2>
          <p className="mb-4">
            You pay an annual subscription that includes a fixed number of hires per year.<br />
            If you hire more, it's <strong>₹1,500 per additional hire</strong>.
          </p>
          <div className="bg-accent/30 p-4 rounded-lg">
            <p className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Important reassurance:
            </p>
            <p className="text-muted-foreground">
              There is no auto-detection.<br />
              Your recruiter explicitly marks "Offer Accepted" in the system.
            </p>
            <p className="font-semibold mt-2">No guessing. No surprise billing.</p>
          </div>
        </section>

        {/* Section 8: What If Hiring Doesn't Happen */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
            What If Hiring Doesn't Happen?
          </h2>
          <p className="text-lg font-semibold mb-2">Then you don't pay anything extra.</p>
          <p className="text-muted-foreground mb-4">
            If hiring doesn't happen, the system isn't considered "used" beyond the base plan.
          </p>
          <p className="font-medium">This removes risk from trying FuturHire.</p>
        </section>

        {/* Section 9: Why Teams Like This Model */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">9</span>
            Why Teams Like This Model
          </h2>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> You can interview freely</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> You're not penalized for exploration</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> You pay more only if you grow</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Pricing aligns with outcomes, not activity</li>
          </ul>
          <p className="text-muted-foreground">
            Most tools charge you even when hiring is frozen.<br />
            <strong>FuturHire doesn't.</strong>
          </p>
        </section>

        {/* Section 10: Trust, Fairness & Enterprise Safety */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">10</span>
            Trust, Fairness & Enterprise Safety
          </h2>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> No automated rejection</li>
            <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> No personality scoring</li>
            <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> No protected-attribute inference</li>
            <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> ND-safe language and flows</li>
            <li className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Full audit trail of what influenced interviews</li>
          </ul>
          <p className="font-medium">This makes FuturHire defensible, not just impressive.</p>
        </section>

        {/* Section 11: Pilot Positioning */}
        <section className="mb-10 bg-accent/30 p-6 rounded-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">11</span>
            Pilot Positioning
            <span className="text-sm font-normal text-muted-foreground">(If Applicable)</span>
          </h2>
          <p className="mb-2">We're onboarding our first <strong>50 companies</strong> through a pilot.</p>
          <p className="mb-2">You get up to <strong>3 months</strong> of full access.</p>
          <p>Convert within <strong>14 days</strong> after the pilot to unlock founding partner pricing for <strong>12 months</strong>.</p>
        </section>

        {/* Section 12: Closing Line */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">12</span>
            Closing Line
            <span className="text-sm font-normal text-muted-foreground">(USE ONLY ONE)</span>
          </h2>
          <p className="mb-2">Pick one and lock it:</p>
          <div className="space-y-3">
            <blockquote className="border-l-4 border-primary pl-4 text-lg font-medium">
              "Interview freely. Pay only when hiring happens."
            </blockquote>
            <p className="text-center text-muted-foreground">OR</p>
            <blockquote className="border-l-4 border-primary pl-4 text-lg font-medium">
              "FuturHire is hiring intelligence priced by outcomes."
            </blockquote>
          </div>
        </section>

        {/* What Sales Must NEVER Say */}
        <section className="mb-10 bg-destructive/10 p-6 rounded-lg border border-destructive/30">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 text-destructive">
            🚫 What Sales Must NEVER Say
          </h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2"><XCircle className="w-5 h-5 text-destructive" /> "AI decides who to hire"</li>
            <li className="flex items-center gap-2"><XCircle className="w-5 h-5 text-destructive" /> "Pay per candidate"</li>
            <li className="flex items-center gap-2"><XCircle className="w-5 h-5 text-destructive" /> "Automatic billing"</li>
            <li className="flex items-center gap-2"><XCircle className="w-5 h-5 text-destructive" /> "Voice interview replaces human interview"</li>
            <li className="flex items-center gap-2"><XCircle className="w-5 h-5 text-destructive" /> "ATS replacement"</li>
          </ul>
        </section>

        {/* Internal Rule */}
        <section className="mb-10 bg-primary/10 p-6 rounded-lg border border-primary/30">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            🧠 One-Line Internal Rule
            <span className="text-sm font-normal text-destructive">(Very Important)</span>
          </h2>
          <p className="text-lg font-medium">
            If a salesperson cannot explain what counts as a hire in one sentence, they should not pitch FuturHire.
          </p>
        </section>

        {/* Final Summary */}
        <section className="mb-10 border-2 border-primary p-6 rounded-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            ✅ Final Summary (For Reps)
          </h2>
          <ul className="space-y-3">
            <li><strong>What we sell:</strong> Interview clarity</li>
            <li><strong>Who pays:</strong> Hiring teams only</li>
            <li><strong>When they pay more:</strong> Only after an offer is accepted</li>
            <li><strong>What we never do:</strong> Auto-decide hiring</li>
          </ul>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default SalesPitch;
