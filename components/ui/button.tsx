import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "pc-button inline-flex items-center justify-center rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none gap-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border border-primary",
        destructive:
          "bg-destructive text-destructive-foreground border border-transparent",
        outline:
          "border border-border bg-card text-foreground hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost: "hover:bg-muted text-foreground border border-transparent",
        link: "text-link underline-offset-4 hover:underline",
        neon: "border border-border bg-card text-foreground hover:bg-muted",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "min-h-11 rounded-md px-3 py-2",
        lg: "min-h-12 rounded-md px-6 py-3 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        data-slot="button"
        data-variant={variant || 'default'}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
