import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloatingButton } from "./floating-button-context";
import { cn } from "@/lib/utils";

export default function FloatingAddButton() {
  const { floatingAction, floatingLabel, refreshAction } = useFloatingButton();
  
  // إذا لم يتم تعيين أي إجراء، لا نعرض شيئاً
  if (!floatingAction && !refreshAction) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom,0px))] right-6 z-[110] flex flex-col gap-3 pointer-events-auto items-center">
      {/* زر التحديث العائم */}
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

      {/* زر الإضافة العائم */}
      {floatingAction && (
        <Button
          onClick={() => floatingAction()}
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