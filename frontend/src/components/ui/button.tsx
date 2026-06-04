import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
  isLoading?: boolean
  throttleMs?: number
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, throttleMs = 800, onClick, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const lastClickedRef = React.useRef<number>(0)

    const handleThrottledClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (throttleMs > 0) {
        const now = Date.now();
        if (now - lastClickedRef.current < throttleMs) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        lastClickedRef.current = now;
      }

      if (onClick) {
        onClick(e);
      }
    }

    let finalChildren = children;
    if (isLoading) {
      if (size === "icon") {
        finalChildren = <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />;
      } else if (asChild && React.isValidElement(children)) {
        const childProps = children.props as { children?: React.ReactNode };
        const innerChildren = childProps.children;
        const childrenArray = React.Children.toArray(innerChildren);
        if (
          childrenArray.length > 0 &&
          React.isValidElement(childrenArray[0]) &&
          typeof childrenArray[0].type !== 'string'
        ) {
          childrenArray[0] = <Loader2 key="button-loader" className="h-4 w-4 animate-spin text-current shrink-0" />;
          finalChildren = React.cloneElement(children, {}, <>{childrenArray}</>);
        } else {
          finalChildren = React.cloneElement(
            children,
            {},
            <>
              <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
              {innerChildren}
            </>
          );
        }
      } else {
        const childrenArray = React.Children.toArray(children);
        if (
          childrenArray.length > 0 &&
          React.isValidElement(childrenArray[0]) &&
          typeof childrenArray[0].type !== 'string'
        ) {
          childrenArray[0] = <Loader2 key="button-loader" className="h-4 w-4 animate-spin text-current shrink-0" />;
          finalChildren = <>{childrenArray}</>;
        } else {
          finalChildren = (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" />
              {children}
            </>
          );
        }
      }
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        onClick={handleThrottledClick}
        {...props}
      >
        {finalChildren}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

