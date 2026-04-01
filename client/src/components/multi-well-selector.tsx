import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { X, Droplets, Search } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const filteredWells = useMemo(() => {
    if (!searchTerm.trim()) return wells;
    const term = searchTerm.toLowerCase().trim();
    return wells.filter((well: any) => {
      const wellNumber = String(well.wellNumber || '');
      const ownerName = (well.ownerName || '').toLowerCase();
      const region = (well.region || '').toLowerCase();
      return wellNumber.includes(term) || ownerName.includes(term) || region.includes(term);
    });
  }, [wells, searchTerm]);

  const toggleWell = (wellId: number) => {
    if (value.includes(wellId)) {
      onChange(value.filter(id => id !== wellId));
    } else {
      onChange([...value, wellId]);
    }
  };

  const getWellLabel = (wellId: number) => {
    const well = wells.find((w: any) => w.id === wellId);
    return well ? `#${well.wellNumber}` : `#${wellId}`;
  };

  if (!project_id) {
    return null;
  }

  return (
    <div className="space-y-1" ref={dropdownRef}>
      {showLabel && (
        <Label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
          <Droplets className="h-3 w-3" />
          الآبار
        </Label>
      )}
      <div className="relative">
        <div
          className={`flex items-center border rounded-md h-9 px-2 cursor-pointer bg-background ${disabled || isLoading || wells.length === 0 ? 'opacity-50 pointer-events-none' : 'hover:border-primary/50'}`}
          onClick={() => !disabled && wells.length > 0 && setIsOpen(!isOpen)}
          data-testid="button-multi-well-selector"
        >
          <span className="truncate text-xs flex-1">
            {isLoading ? (
              <span className="text-muted-foreground">تحميل...</span>
            ) : wells.length === 0 ? (
              <span className="text-muted-foreground">لا توجد</span>
            ) : value.length === 0 ? (
              <span className="text-muted-foreground">اختر...</span>
            ) : (
              <span className="flex items-center gap-0.5 flex-wrap">
                {value.slice(0, 2).map(id => (
                  <Badge key={id} variant="secondary" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                    {getWellLabel(id)}
                    <X
                      className="h-2 w-2 cursor-pointer hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); toggleWell(id); }}
                    />
                  </Badge>
                ))}
                {value.length > 2 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">+{value.length - 2}</Badge>
                )}
              </span>
            )}
          </span>
          <Search className="h-3 w-3 shrink-0 opacity-40" />
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 bg-popover border rounded-md shadow-lg min-w-[220px] right-0">
            <div className="p-1.5 border-b">
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالرقم أو الاسم..."
                className="h-7 text-xs"
                data-testid="input-well-search"
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredWells.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">لا توجد نتائج</div>
              ) : (
                filteredWells.map((well: any) => (
                  <label
                    key={well.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent cursor-pointer text-xs whitespace-nowrap"
                    data-testid={`checkbox-well-${well.id}`}
                  >
                    <Checkbox
                      checked={value.includes(well.id)}
                      onCheckedChange={() => toggleWell(well.id)}
                    />
                    <span>#{well.wellNumber} - {well.ownerName}</span>
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
                  data-testid="button-clear-wells"
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

export default MultiWellSelector;
