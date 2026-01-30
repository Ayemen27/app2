import { Badge } from "@/components/ui/badge";
import { Terminal, ShieldCheck } from "lucide-react";

export function EnvironmentBadge() {
  const isDev = import.meta.env.DEV;
  
  return (
    <div 
      title={isDev ? "DEVELOPMENT" : "PRODUCTION"}
      className={`p-1.5 rounded-lg transition-all duration-300 ${
        isDev 
          ? "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30" 
          : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30"
      }`}
    >
      {isDev ? (
        <Terminal className="h-4 w-4" />
      ) : (
        <ShieldCheck className="h-4 w-4" />
      )}
    </div>
  );
}
