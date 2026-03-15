import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { Users, ChevronDown, X } from "lucide-react";

interface TeamSelectorProps {
  project_id?: string;
  value: string[];
  onChange: (teams: string[]) => void;
  showLabel?: boolean;
}

export function TeamSelector({ project_id, value = [], onChange, showLabel = true }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: teams = [] } = useQuery<string[]>({
    queryKey: ['/api/wells/team-names', project_id],
    queryFn: async () => {
      try {
        const url = project_id
          ? `/api/wells/team-names?project_id=${project_id}`
          : '/api/wells/team-names';
        const response = await apiRequest(url, "GET");
        if (response && response.success && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTeam = (team: string) => {
    if (value.includes(team)) {
      onChange(value.filter(t => t !== team));
    } else {
      onChange([...value, team]);
    }
  };

  if (teams.length === 0) return null;

  return (
    <div className="space-y-1" ref={dropdownRef}>
      {showLabel && (
        <Label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
          <Users className="h-3 w-3" />
          الفريق <span className="text-muted-foreground/60 font-normal">(اختياري)</span>
        </Label>
      )}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between h-9 text-right font-normal"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-team-selector"
        >
          <span className="truncate text-xs">
            {value.length === 0 ? (
              <span className="text-muted-foreground">اختر الفريق...</span>
            ) : (
              <span className="flex items-center gap-1 flex-wrap">
                {value.map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    {t}
                    <X
                      className="h-2.5 w-2.5 cursor-pointer hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); toggleTeam(t); }}
                    />
                  </Badge>
                ))}
              </span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {teams.map((team) => (
              <label
                key={team}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                data-testid={`checkbox-team-${team}`}
              >
                <Checkbox
                  checked={value.includes(team)}
                  onCheckedChange={() => toggleTeam(team)}
                />
                <span>{team}</span>
              </label>
            ))}
            {value.length > 0 && (
              <div className="border-t px-3 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs h-7 text-muted-foreground"
                  onClick={() => { onChange([]); setIsOpen(false); }}
                  data-testid="button-clear-teams"
                >
                  مسح الكل
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
