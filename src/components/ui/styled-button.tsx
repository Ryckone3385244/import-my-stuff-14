import * as React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "link" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  children: React.ReactNode;
}

const StyledButton = React.forwardRef<HTMLButtonElement, StyledButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn("font-semibold", className)}
        {...props}
      />
    );
  }
);
StyledButton.displayName = "StyledButton";

export { StyledButton };
