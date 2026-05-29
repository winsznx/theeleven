import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Container = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Container({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("mx-auto w-full max-w-[1280px] px-4 md:px-8", className)}
        {...props}
      />
    );
  }
);
