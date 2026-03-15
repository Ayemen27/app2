import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, ChevronDown, X } from "lucide-react";

const CREW_TYPES = [
  { value: "welding", label: "لحام" },
  { value: "steel_installation", label: "تركيب حديد" },
  { value: "panel_installation", label: "تركيب ألواح" },
];

interface CrewTypeSelectorProps {
  value: string[];
  onChange: (values: string[]) => void;
  showLabel?: boolean;
}

export function CrewTypeSelector({ value = [], onChange, showLabel = true }: CrewTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleType = (type: string) => {
    if (value.includes(type)) {
      onChange(value.filter(v => v !== type));
    } else {
      onChange([...value, type]);
    }
  };

  const selectAll = () => {
    onChange(CREW_TYPES.map(t => t.value));
  };

  const getLabel = (val: string) => CREW_TYPES.find(t => t.value === val)?.label || val;

  return (
    <div className="space-y-1" ref={dropdownRef}>
      {showLabel && (
        <Label className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
          <Wrench className="h-3 w-3" />
          نوع العمل
        </Label>
      )}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between h-9 text-right font-normal"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-crew-type-selector"
        >
          <span className="truncate text-xs">
            {value.length === 0 ? (
              <span className="text-muted-foreground">اختر نوع العمل...</span>
            ) : (
              <span className="flex items-center gap-1 flex-wrap">
                {value.map(v => (
                  <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    {getLabel(v)}
                    <X
                      className="h-2.5 w-2.5 cursor-pointer hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); toggleType(v); }}
                    />
                  </Badge>
                ))}
              </span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg">
            <label
              className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b"
              data-testid="checkbox-crew-all"
            >
              <Checkbox
                checked={value.length === CREW_TYPES.length}
                onCheckedChange={(checked) => {
                  if (checked) selectAll();
                  else onChange([]);
                }}
              />
              <span className="font-medium">تحديد الكل</span>
            </label>
            {CREW_TYPES.map(type => (
              <label
                key={type.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                data-testid={`checkbox-crew-${type.value}`}
              >
                <Checkbox
                  checked={value.includes(type.value)}
                  onCheckedChange={() => toggleType(type.value)}
                />
                <span>{type.label}</span>
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
                  data-testid="button-clear-crew-types"
                >
                  مسح الكل
                </Button>
              </div>
            )}
            {value.length >= 2 && (
              <div className="border-t px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center">
                  سيتم تقسيم الأجور وأيام العمل على {value.length} أنواع عمل
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
