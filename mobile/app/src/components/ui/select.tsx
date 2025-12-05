import * as React from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value?: string;
  selectedLabel?: string;
  onValueChange?: (value: string) => void;
  setSelectedLabel?: (label: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  open: false,
  setOpen: () => {},
});

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<string | undefined>();
  
  return (
    <SelectContext.Provider value={{ value, selectedLabel, onValueChange, setSelectedLabel, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  const { open, setOpen } = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
  label?: string;
}

export function SelectValue({ placeholder, label }: SelectValueProps) {
  const { selectedLabel } = React.useContext(SelectContext);
  return <span>{label || selectedLabel || placeholder}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
}

export function SelectContent({ children }: SelectContentProps) {
  const { open, setOpen } = React.useContext(SelectContext);
  
  if (!open) return null;
  
  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setOpen(false)} 
      />
      <div className="absolute z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
        <div className="p-1 max-h-60 overflow-auto">
          {children}
        </div>
      </div>
    </>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SelectItem({ value, children, disabled }: SelectItemProps) {
  const { value: selectedValue, onValueChange, setSelectedLabel, setOpen } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;
  const labelRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (isSelected && labelRef.current) {
      setSelectedLabel?.(labelRef.current.textContent || value);
    }
  }, [isSelected, value, setSelectedLabel]);
  
  return (
    <div
      ref={labelRef}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none",
        isSelected && "bg-accent text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        !disabled && "hover:bg-accent hover:text-accent-foreground"
      )}
      onClick={() => {
        if (!disabled) {
          onValueChange?.(value);
          setSelectedLabel?.(labelRef.current?.textContent || value);
          setOpen(false);
        }
      }}
    >
      {children}
    </div>
  );
}
