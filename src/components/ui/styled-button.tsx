import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface StyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** "button1" uses --button-* CSS vars, "button2" uses --button-2-* CSS vars */
  styleType?: "button1" | "button2" | string;
  /** Override background color */
  buttonColor?: string;
  /** Override text/foreground color */
  buttonForeground?: string;
  /** Override padding */
  padding?: string;
  /** Override border-radius */
  borderRadius?: string;
  /** Override border */
  border?: string;
  /** Override font-size */
  fontSize?: string;
  /** Override font-weight */
  fontWeight?: string;
  /** Override font-style */
  fontStyle?: string;
  /** Override text-transform */
  textTransform?: string;
  /** Render as child element (Slot pattern) */
  asChild?: boolean;
  children: React.ReactNode;
}

const StyledButton = React.forwardRef<HTMLButtonElement, StyledButtonProps>(
  (
    {
      className,
      styleType = "button1",
      buttonColor,
      buttonForeground,
      padding,
      borderRadius,
      border,
      fontSize,
      fontWeight,
      fontStyle,
      textTransform,
      asChild = false,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // Determine CSS variable prefix based on styleType
    const isButton2 = styleType === "button2";
    const prefix = isButton2 ? "--button-2" : "--button";

    const computedStyle: React.CSSProperties = {
      backgroundColor: buttonColor || `var(${prefix}-color, hsl(var(--primary)))`,
      color: buttonForeground || `var(${prefix}-foreground, hsl(var(--primary-foreground)))`,
      padding: padding || `var(${prefix}-padding, 0.5rem 1rem)`,
      borderRadius: borderRadius || `var(${prefix}-border-radius, var(--radius))`,
      border: border || `var(${prefix}-border, none)`,
      fontSize: fontSize || `var(${prefix}-font-size, inherit)`,
      fontWeight: fontWeight || `var(${prefix}-font-weight, 600)`,
      fontStyle: fontStyle || `var(${prefix}-font-style, normal)`,
      textTransform: (textTransform || `var(${prefix}-text-transform, none)`) as React.CSSProperties["textTransform"],
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.2s ease",
      ...style,
    };

    return (
      <Comp
        ref={ref}
        className={cn("font-semibold whitespace-nowrap", className)}
        style={computedStyle}
        {...props}
      />
    );
  }
);
StyledButton.displayName = "StyledButton";

export { StyledButton };
