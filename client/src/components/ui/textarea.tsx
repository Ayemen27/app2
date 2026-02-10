import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & { 
    autoHeight?: boolean;
    maxRows?: number;
    minRows?: number;
  }
>(({ className, autoHeight = true, maxRows = 10, minRows = 3, onChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = innerRef.current;
    if (autoHeight && textarea) {
      // Reset height to calculate scrollHeight correctly
      textarea.style.height = 'auto';
      
      const lineHeight = 24; // Approximate line height in pixels
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;
      
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
      
      textarea.style.height = `${newHeight}px`;
      
      // Control overflow based on max height
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [autoHeight, maxRows, minRows]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight();
    onChange?.(e);
  };

  React.useEffect(() => {
    // Initial adjustment and adjustment on value change
    adjustHeight();
    
    // Resize observer to handle container width changes
    const textarea = innerRef.current;
    if (!textarea) return;

    const observer = new ResizeObserver(() => adjustHeight());
    observer.observe(textarea);
    
    return () => observer.disconnect();
  }, [adjustHeight, props.value]);

  return (
    <textarea
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none transition-[height] duration-100 ease-out",
        className
      )}
      ref={(el) => {
        (innerRef as any).current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) (ref as any).current = el;
      }}
      onChange={handleInput}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
