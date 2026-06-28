import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const [isDark, setIsDark] = React.useState(true)

  React.useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("color-mode", next ? "dark" : "light")
    setIsDark(next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="テーマを切り替え"
      onClick={toggle}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
