import { Plus, RefreshCw, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloatingButton } from "./floating-button-context";
import { cn } from "@/lib/utils";

export default function FloatingAddButton() {
  const { floatingAction, floatingLabel, refreshAction, showAddButton, secondaryAction, secondaryLabel, secondaryVariant } = useFloatingButton();
  
  if (!floatingAction && !refreshAction && !showAddButton && !secondaryAction) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom,0px))] right-6 z-[110] flex flex-col gap-3 pointer-events-auto items-center">
      {refreshAction && (
        <Button
          onClick={() => refreshAction()}
          className="h-10 w-10 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          size="icon"
          title="تحديث"
          data-testid="button-floating-refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}

      {secondaryAction && (
        <Button
          onClick={() => secondaryAction()}
          className={cn(
            "h-11 w-11 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 border-0",
            secondaryVariant === 'destructive'
              ? "bg-gradient-to-br from-red-500 via-red-600 to-rose-600 hover:from-red-600 hover:via-red-700 hover:to-rose-700 text-white"
              : "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white"
          )}
          size="icon"
          title={secondaryLabel}
          data-testid="button-floating-secondary"
        >
          <ArrowUpFromLine className="h-4 w-4" />
        </Button>
      )}

      {(floatingAction || showAddButton) && (
        <Button
          onClick={() => {
            if (floatingAction) floatingAction();
          }}
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 border-0 text-white"
          size="icon"
          title={floatingLabel}
          data-testid="button-floating-add"
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
