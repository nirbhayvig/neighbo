import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer data-[state=checked]:bg-secondary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-7 data-[size=default]:w-12 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-secondary-foreground pointer-events-none block rounded-full ring-0 transition-transform",
          "group-data-[size=default]/switch:size-5 group-data-[size=default]/switch:data-[state=unchecked]:translate-x-0 group-data-[size=default]/switch:data-[state=checked]:translate-x-5",
          "group-data-[size=sm]/switch:size-3 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0 group-data-[size=sm]/switch:data-[state=checked]:translate-x-[calc(100%-2px)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
