import { FolderOpen, Layers } from "lucide-react";
import { useSelectedProject, ALL_PROJECTS_NAME } from "@/hooks/use-selected-project";
import { cn } from "@/lib/utils";

interface SelectedProjectBadgeProps {
  className?: string;
  variant?: "default" | "compact";
  label?: string;
}

export default function SelectedProjectBadge({
  className = "",
  variant = "default",
  label = "البيانات المعروضة",
}: SelectedProjectBadgeProps) {
  const { selectedProjectName, isAllProjects, isLoading } = useSelectedProject();

  if (isLoading) return null;

  const displayName = isAllProjects
    ? ALL_PROJECTS_NAME
    : selectedProjectName || "اختر مشروعاً";

  const Icon = isAllProjects ? Layers : FolderOpen;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
          isAllProjects
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
          className
        )}
        dir="rtl"
        data-testid="badge-selected-project"
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{displayName}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border",
        isAllProjects
          ? "bg-blue-50/60 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50"
          : "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50",
        className
      )}
      dir="rtl"
      role="status"
      aria-live="polite"
      data-testid="badge-selected-project"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0",
            isAllProjects
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-muted-foreground font-medium leading-tight">
            {label}
          </span>
          <span
            className={cn(
              "text-sm font-semibold truncate leading-tight",
              isAllProjects
                ? "text-blue-900 dark:text-blue-200"
                : "text-emerald-900 dark:text-emerald-200"
            )}
            data-testid="text-selected-project-name"
          >
            {displayName}
          </span>
        </div>
      </div>
    </div>
  );
}
