import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloatingButton } from "./floating-button-context";

export default function FloatingAddButton() {
  const { floatingAction, floatingLabel } = useFloatingButton();
  
  // إذا لم يتم تعيين action، لا نعرض الزر
  if (!floatingAction) {
    return null;
  }

  const handleClick = () => {
    if (floatingAction) {
      floatingAction();
    }
  };

  return (
    <div className="fixed bottom-20 left-6 z-40 pointer-events-auto">
      <Button
        onClick={handleClick}
        className="h-14 w-14 rounded-full shadow-2xl hover:shadow-xl transition-all duration-300 hover:scale-110 bg-primary hover:bg-primary/90 border-2 border-primary-foreground/20"
        size="icon"
        title={floatingLabel}
        data-testid="button-floating-add"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}