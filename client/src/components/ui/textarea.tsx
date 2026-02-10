import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & { autoHeight?: boolean }
>(({ className, autoHeight = true, onChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoHeight && innerRef.current) {
      innerRef.current.style.height = 'auto';
      innerRef.current.style.height = innerRef.current.scrollHeight + 'px';
    }
    onChange?.(e);
  };

  React.useEffect(() => {
    if (autoHeight && innerRef.current) {
      innerRef.current.style.height = 'auto';
      innerRef.current.style.height = innerRef.current.scrollHeight + 'px';
    }
  }, [autoHeight, props.value]);

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        className
      )}
      ref={(el) => {
        // Handle combined refs
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
