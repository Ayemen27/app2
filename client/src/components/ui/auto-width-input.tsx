import * as React from "react"
import { cn } from "@/lib/utils"

export interface AutoWidthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  maxWidth?: number;
  minWidth?: number;
  extraWidth?: number;
}

const AutoWidthInput = React.forwardRef<HTMLInputElement, AutoWidthInputProps>(
  ({ className, value, placeholder, maxWidth = 420, minWidth = 60, extraWidth = 10, ...props }, ref) => {
    const spanRef = React.useRef<HTMLSpanElement>(null);
    const [width, setWidth] = React.useState<number | string>("auto");

    React.useEffect(() => {
      if (spanRef.current) {
        spanRef.current.textContent = String(value || placeholder || "");
        const newWidth = spanRef.current.offsetWidth + extraWidth;
        setWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
      }
    }, [value, placeholder, maxWidth, minWidth, extraWidth]);

    return (
      <div className="relative inline-block w-full">
        <span
          ref={spanRef}
          className={cn(
            "absolute invisible whitespace-pre font-inherit px-4 py-2.5 text-sm",
            className
          )}
          aria-hidden="true"
        />
        <input
          {...props}
          ref={ref}
          value={value}
          style={{ width: typeof width === "number" ? `${width}px` : width }}
          className={cn(
            "flex h-11 rounded-xl border-2 bg-transparent px-4 py-2.5 text-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-0",
            className
          )}
        />
      </div>
    );
  }
);

AutoWidthInput.displayName = "AutoWidthInput";

export { AutoWidthInput };
