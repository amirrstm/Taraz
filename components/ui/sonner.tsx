"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// The app is dark-only, so the theme is a literal rather than the stock
// `useTheme()` from next-themes: with no ThemeProvider mounted that hook
// defaults to "system" and renders a light toaster on a dark app.
//
// `offset` alone is not enough — below 600px Sonner uses `mobileOffset`, which
// is exactly the phone this app runs on, and the toast would sit behind the
// fixed TabBar.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      offset={{ bottom: "var(--tabbar-clearance)" }}
      mobileOffset={{
        bottom: "var(--tabbar-clearance)",
        left: "1rem",
        right: "1rem",
      }}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
