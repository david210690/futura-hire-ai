import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MarkAsHiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function MarkAsHiredModal({
  open,
  onOpenChange,
  candidateName,
  onConfirm,
  isLoading,
}: MarkAsHiredModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm hire (offer accepted)</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Please confirm that <span className="font-medium text-foreground">{candidateName}</span> has accepted the offer.
              </p>
              <p>
                This will record one successful hire for your current plan.
              </p>
              <p>
                Interviews, evaluations, and rejected candidates are not counted.
              </p>
              <p className="text-xs text-muted-foreground/80 pt-2 border-t">
                You can undo this within 24 hours if needed. No billing changes happen immediately.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Confirming..." : "Confirm hire"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
