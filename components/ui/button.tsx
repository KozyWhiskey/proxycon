import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground  hover:bg-primary/90  border border-primary/20",
        destructive:
          "bg-destructive/90 text-destructive-foreground hover:bg-destructive ",
        outline:
          "border border-border bg-card hover:bg-muted hover:text-primary hover:border-primary/30 backdrop-blur-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost: "hover:bg-primary/10 hover:text-primary hover:border-primary/20 border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        neon: "bg-transparent border border-primary text-primary  hover:bg-primary hover:text-primary-foreground  transition-all duration-300",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 rounded-md px-3",
        lg: "h-11 rounded-md px-8 text-base",
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
