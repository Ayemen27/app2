import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { Users, X, Search } from "lucide-react";

interface TeamSelectorProps {
  project_id?: string;
  value: string[];
  onChange: (teams: string[]) => void;
  showLabel?: boolean;
}

export function TeamSelector({ project_id, value = [], onChange, showLabel = true }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: teams = [], isLoading } = useQuery<string[]>({
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
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) return teams;
    const term = searchTerm.toLowerCase().trim();
    return teams.filter(team => team.toLowerCase().includes(term));
  }, [teams, searchTerm]);

  const toggleTeam = (team: string) => {
    if (value.includes(team)) {
      onChange(value.filter(t => t !== team));
    } else {
      onChange([...value, team]);
    }
  };

  return (
    <div className="space-y-1" ref={dropdownRef}>
      {showLabel && (
        <Label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
          <Users className="h-3 w-3" />
          الفريق
        </Label>
      )}
      <div className="relative">
        <div
          className={`flex items-center border rounded-md h-9 px-2 cursor-pointer bg-background ${isLoading || teams.length === 0 ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}`}
          onClick={() => teams.length > 0 && setIsOpen(!isOpen)}
          data-testid="button-team-selector"
        >
          <span className="truncate text-xs flex-1">
            {isLoading ? (
              <span className="text-muted-foreground">تحميل...</span>
            ) : teams.length === 0 ? (
              <span className="text-muted-foreground">لا توجد</span>
            ) : value.length === 0 ? (
              <span className="text-muted-foreground">اختر...</span>
            ) : (
              <span className="flex items-center gap-0.5 flex-wrap">
                {value.slice(0, 1).map(t => (
                  <Badge key={t} variant="secondary" className="text-[9px] px-1 py-0 h-4 gap-0.5 max-w-[80px] truncate">
                    {t}
                    <X
                      className="h-2 w-2 cursor-pointer hover:text-destructive shrink-0"
                      onClick={(e) => { e.stopPropagation(); toggleTeam(t); }}
                    />
                  </Badge>
                ))}
                {value.length > 1 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">+{value.length - 1}</Badge>
                )}
              </span>
            )}
          </span>
          <Search className="h-3 w-3 shrink-0 opacity-40" />
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 bg-popover border rounded-md shadow-lg min-w-[200px] right-0">
            <div className="p-1.5 border-b">
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم..."
                className="h-7 text-xs"
                data-testid="input-team-search"
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredTeams.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">لا توجد نتائج</div>
              ) : (
                filteredTeams.map((team) => (
                  <label
                    key={team}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent cursor-pointer text-xs whitespace-nowrap"
                    data-testid={`checkbox-team-${team}`}
                  >
                    <Checkbox
                      checked={value.includes(team)}
                      onCheckedChange={() => toggleTeam(team)}
                    />
                    <span>{team}</span>
                  </label>
                ))
              )}
            </div>
            {value.length > 0 && (
              <div className="border-t px-2 py-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-[10px] h-6 text-muted-foreground"
                  onClick={() => { onChange([]); setIsOpen(false); setSearchTerm(""); }}
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
