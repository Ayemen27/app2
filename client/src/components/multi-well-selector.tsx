import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { ChevronDown, X, Droplets } from "lucide-react";

interface MultiWellSelectorProps {
  project_id?: string;
  value: number[];
  onChange: (well_ids: number[]) => void;
  showLabel?: boolean;
  disabled?: boolean;
  optional?: boolean;
}

export function MultiWellSelector({
  project_id,
  value = [],
  onChange,
  showLabel = true,
  disabled = false,
  optional = true
}: MultiWellSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: wells = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.wellsByProject(project_id ?? ''),
    queryFn: async () => {
      if (!project_id) return [];
      try {
        const response = await apiRequest(`/api/wells?project_id=${project_id}`);
        if (response && response.success && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : (response.data || []);
      } catch (error) {
        console.error('Error fetching wells:', error);
        return [];
      }
    },
    enabled: !!project_id,
    staleTime: 5 * 60 * 1000
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

  const toggleWell = (wellId: number) => {
    if (value.includes(wellId)) {
      onChange(value.filter(id => id !== wellId));
    } else {
      onChange([...value, wellId]);
    }
  };

  const getWellLabel = (wellId: number) => {
    const well = wells.find((w: any) => w.id === wellId);
    return well ? `بئر #${well.wellNumber}` : `بئر #${wellId}`;
  };

  if (!project_id) {
    return null;
  }

  return (
    <div className="space-y-1" ref={dropdownRef}>
      {showLabel && (
        <Label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
          <Droplets className="h-3 w-3" />
          الآبار {optional && <span className="text-muted-foreground/60 font-normal">(اختياري - يمكن اختيار أكثر من بئر)</span>}
        </Label>
      )}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between h-9 text-right font-normal"
          onClick={() => !disabled && wells.length > 0 && setIsOpen(!isOpen)}
          disabled={disabled || isLoading || wells.length === 0}
          data-testid="button-multi-well-selector"
        >
          <span className="truncate text-xs">
            {isLoading ? (
              <span className="text-muted-foreground">جاري تحميل الآبار...</span>
            ) : wells.length === 0 ? (
              <span className="text-muted-foreground">لا توجد آبار</span>
            ) : value.length === 0 ? (
              <span className="text-muted-foreground">اختر الآبار...</span>
            ) : (
              <span className="flex items-center gap-1 flex-wrap">
                {value.map(id => (
                  <Badge key={id} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    {getWellLabel(id)}
                    <X
                      className="h-2.5 w-2.5 cursor-pointer hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWell(id);
                      }}
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
            {wells.map((well: any) => (
              <label
                key={well.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                data-testid={`checkbox-well-${well.id}`}
              >
                <Checkbox
                  checked={value.includes(well.id)}
                  onCheckedChange={() => toggleWell(well.id)}
                />
                <span>بئر #{well.wellNumber} - {well.ownerName}</span>
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
                  data-testid="button-clear-wells"
                >
                  مسح الكل
                </Button>
              </div>
            )}
            {value.length >= 2 && (
              <div className="border-t px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 text-center">
                  سيتم تقسيم الأجور وأيام العمل تلقائياً على {value.length} آبار
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiWellSelector;
