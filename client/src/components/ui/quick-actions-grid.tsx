import { useLocation } from "wouter";
import { 
  Clock, 
  Receipt, 
  ShoppingCart, 
  ArrowLeftRight,
  Users,
  FolderKanban,
  Wallet,
  Building2,
  Wrench,
  UserPlus,
  FolderPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  route?: string;
  action?: () => void;
  gradient: string;
  iconColor: string;
}

interface QuickActionsGridProps {
  onAddWorker?: () => void;
  onAddProject?: () => void;
}

export function QuickActionsGrid({ onAddWorker, onAddProject }: QuickActionsGridProps) {
  const [, setLocation] = useLocation();

  const quickActions: QuickAction[] = [
    {
      id: "attendance",
      label: "تسجيل حضور",
      icon: Clock,
      route: "/worker-attendance",
      gradient: "from-blue-500 to-blue-600",
      iconColor: "text-white",
    },
    {
      id: "daily-expenses",
      label: "مصروفات يومية",
      icon: Receipt,
      route: "/daily-expenses",
      gradient: "from-emerald-500 to-emerald-600",
      iconColor: "text-white",
    },
    {
      id: "material-purchase",
      label: "شراء مواد",
      icon: ShoppingCart,
      route: "/material-purchase",
      gradient: "from-orange-500 to-orange-600",
      iconColor: "text-white",
    },
    {
      id: "add-worker",
      label: "إضافة عامل",
      icon: UserPlus,
      action: onAddWorker,
      gradient: "from-teal-500 to-teal-600",
      iconColor: "text-white",
    },
    {
      id: "add-project",
      label: "إضافة مشروع",
      icon: FolderPlus,
      action: onAddProject,
      gradient: "from-violet-500 to-violet-600",
      iconColor: "text-white",
    },
    {
      id: "transfers",
      label: "ترحيل أموال",
      icon: ArrowLeftRight,
      route: "/project-transfers",
      gradient: "from-purple-500 to-purple-600",
      iconColor: "text-white",
    },
    {
      id: "workers",
      label: "إدارة العمال",
      icon: Users,
      route: "/workers",
      gradient: "from-cyan-500 to-cyan-600",
      iconColor: "text-white",
    },
    {
      id: "supplier-accounts",
      label: "حسابات الموردين",
      icon: Building2,
      route: "/supplier-accounts",
      gradient: "from-amber-500 to-amber-600",
      iconColor: "text-white",
    },
    {
      id: "equipment",
      label: "إدارة المعدات",
      icon: Wrench,
      route: "/equipment",
      gradient: "from-slate-500 to-slate-600",
      iconColor: "text-white",
    },
  ];

  const handleClick = (action: QuickAction) => {
    if (action.action) {
      action.action();
    } else if (action.route) {
      setLocation(action.route);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" dir="rtl">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            className={cn(
              "flex flex-col items-center justify-center",
              "p-3 sm:p-4 rounded-xl",
              "bg-gradient-to-br",
              action.gradient,
              "shadow-md hover:shadow-lg",
              "transform hover:scale-[1.02] active:scale-[0.98]",
              "transition-all duration-200 ease-out",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "min-h-[80px] sm:min-h-[90px]"
            )}
          >
            <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7 mb-1.5 sm:mb-2", action.iconColor)} />
            <span className={cn(
              "text-[11px] sm:text-xs font-medium text-center leading-tight",
              action.iconColor
            )}>
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
