// First-visit gate. Sets clinical context in a sentence or two, then a single CTA that generates the clientId and opens the first session. It's a gate, not a tutorial: no close button, and clicking outside or pressing Escape won't dismiss it — the only way out is "Begin Intake".

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OnboardingDialogProps {
  open: boolean;
  onBegin: () => void;
  // True while the first session is being created, so the CTA can show progress and not be double-clicked.
  pending?: boolean;
}

export function OnboardingDialog({ open, onBegin, pending = false }: OnboardingDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to Triage</DialogTitle>
          <DialogDescription>
            Triage is a health intake assistant. It will ask a few questions about your symptoms
            and history, then prepare a summary for your clinician to review at your visit. Please
            answer as accurately as you can. This is not a diagnosis.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onBegin} disabled={pending}>
            {pending ? "Starting…" : "Begin Intake"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
