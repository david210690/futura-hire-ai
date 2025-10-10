import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { PlanPickerModal } from "./PlanPickerModal";
import { cn } from "@/lib/utils";

interface UpgradeFABProps {
  orgId: string;
  show: boolean;
}

export const UpgradeFAB = ({ orgId, show }: UpgradeFABProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!show) return null;

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl transition-all",
          "gap-2 px-4 py-6 text-base font-semibold",
          "animate-in slide-in-from-bottom-8 duration-500"
        )}
        size="lg"
      >
        <Crown className="h-5 w-5" />
        Upgrade
      </Button>

      <PlanPickerModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        orgId={orgId}
      />
    </>
  );
};
