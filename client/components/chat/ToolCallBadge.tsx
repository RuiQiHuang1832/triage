import {
  Activity,
  Calculator,
  CircleAlert,
  ClipboardList,
  LoaderCircle,
  Pill,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ToolState = "running" | "done" | "error";

// Maps each tool name to the patient-facing wording and icon. The agent only ever emits these four, but we fall back gracefully so an unknown tool still renders something sensible.
const TOOL_META: Record<string, { label: string; icon: LucideIcon }> = {
  check_drug_interaction: { label: "Checking drug interactions", icon: Pill },
  lookup_condition_info: { label: "Looking up condition information", icon: Search },
  calculate_bmi: { label: "Calculating BMI", icon: Calculator },
  generate_intake_summary: { label: "Preparing your summary", icon: ClipboardList },
};

function metaFor(tool: string): { label: string; icon: LucideIcon } {
  return TOOL_META[tool] ?? { label: tool || "Working", icon: Activity };
}

export function ToolCallBadge({ tool, state }: { tool: string; state: ToolState }) {
  const { label, icon: Icon } = metaFor(tool);
  const isError = state === "error";

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
          isError
            ? "border-destructive/30 text-destructive"
            : "border-border text-muted-foreground",
        )}
      >
        {state === "running" ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : isError ? (
          <CircleAlert className="size-3.5" />
        ) : (
          <Icon className="size-3.5" />
        )}
        <span>
          {isError ? `${label} — unavailable` : state === "running" ? `${label}…` : label}
        </span>
      </div>
    </div>
  );
}
