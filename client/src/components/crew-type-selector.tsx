import { useState, useRef, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, X, Search } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const filteredTypes = useMemo(() => {
    if (!searchTerm.trim()) return CREW_TYPES;
    const term = searchTerm.toLowerCase().trim();
    return CREW_TYPES.filter(t => t.label.toLowerCase().includes(term) || t.value.toLowerCase().includes(term));
  }, [searchTerm]);

  const toggleType = (type: string) => {
    if (value.includes(type)) {
      onChange(value.filter(v => v !== type));
    } else {
      onChange([...value, type]);
    }
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
        <div
          className="flex items-center border rounded-md h-9 px-2 cursor-pointer bg-background hover:border-primary/50"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-crew-type-selector"
        >
          <span className="truncate text-xs flex-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">اختر...</span>
            ) : (
              <span className="flex items-center gap-0.5 flex-wrap">
                {value.slice(0, 1).map(v => (
                  <Badge key={v} variant="secondary" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                    {getLabel(v)}
                    <X
                      className="h-2 w-2 cursor-pointer hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); toggleType(v); }}
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
          <div className="absolute z-50 mt-1 bg-popover border rounded-md shadow-lg min-w-[180px] right-0">
            <div className="p-1.5 border-b">
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث..."
                className="h-7 text-xs"
                data-testid="input-crew-type-search"
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredTypes.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">لا توجد نتائج</div>
              ) : (
                filteredTypes.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent cursor-pointer text-xs whitespace-nowrap"
                    data-testid={`checkbox-crew-${type.value}`}
                  >
                    <Checkbox
                      checked={value.includes(type.value)}
                      onCheckedChange={() => toggleType(type.value)}
                    />
                    <span>{type.label}</span>
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
                  data-testid="button-clear-crew-types"
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
