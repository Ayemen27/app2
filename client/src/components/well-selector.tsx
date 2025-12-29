import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

interface WellSelectorProps {
  projectId?: string;
  value?: number | string;
  onChange: (wellId: number | undefined) => void;
  showLabel?: boolean;
  disabled?: boolean;
  optional?: boolean;
}

/**
 * مكون اختيار البئر - يظهر فقط عندما يكون المشروع من نوع "آبار"
 * Well Selector Component - shows only when project type is "آبار" (Wells)
 */
export function WellSelector({
  projectId,
  value,
  onChange,
  showLabel = true,
  disabled = false,
  optional = true
}: WellSelectorProps) {
  // جلب الآبار
  const { data: wells = [], isLoading } = useQuery({
    queryKey: ['wells', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const response = await apiRequest(`/api/wells?projectId=${projectId}`);
        // Handle both possible response structures
        if (response && response.success && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : (response.data || []);
      } catch (error) {
        console.error('Error fetching wells:', error);
        return [];
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  if (!projectId || wells.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="text-sm font-medium">
          البئر {!optional && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select
        value={value ? String(value) : "none"}
        onValueChange={(val) => onChange(val === "none" ? undefined : parseInt(val))}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="اختر البئر" />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value="none">بدون بئر</SelectItem>}
          {wells.map((well: any) => (
            <SelectItem key={well.id} value={String(well.id)}>
              بئر #{well.wellNumber} - {well.ownerName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default WellSelector;
