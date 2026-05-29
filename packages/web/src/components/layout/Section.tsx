import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Container } from "./Container";

export const Section = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  function Section({ className, children, ...props }, ref) {
    return (
      <section ref={ref} className={cn("py-12 md:py-16", className)} {...props}>
        <Container>{children}</Container>
      </section>
    );
  }
);
